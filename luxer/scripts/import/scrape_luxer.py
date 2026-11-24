#!/usr/bin/env python3
"""
Importador do catálogo original da Luxer Joias (plataforma LojaMestre).

Lê o sitemap público, visita cada produto único e extrai apenas o que está
publicado no site: nome, referência, categorias, descrição, especificações,
preço, preço Pix/boleto, parcelamento, variações (tamanhos) com disponibilidade
e a galeria de fotografias. Nada é inventado: campo ausente fica nulo e entra
no relatório de migração.

Uso:
  python3 -I scripts/import/scrape_luxer.py --out data/catalog [--images storage/catalog-originals] [--limit N]

Saídas:
  <out>/catalog.json            produtos, categorias e páginas institucionais
  <out>/migration-report.json   duplicidades, fotos ausentes, dados incompletos
  <images>/<ref>/<n>.jpg        fotografias originais (quando --images informado)
"""
import argparse
import concurrent.futures as cf
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

BASE = "https://www.luxerjoias.com.br/"
UA = "Mozilla/5.0 (compatible; LuxerCatalogMigration/1.0)"


def fetch(url, binary=False, tries=4):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                if binary:
                    return data, r.headers.get("Content-Type", "")
                charset = (r.headers.get_content_charset() or "iso-8859-1").lower()
                # o site declara ISO-8859-1 mas usa Windows-1252 (travessões, aspas curvas)
                if charset in ("iso-8859-1", "latin-1", "latin1"):
                    charset = "cp1252"
                return data.decode(charset, errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise
            last = e
        except Exception as e:  # rede instável: tenta de novo com espera
            last = e
        time.sleep(1.5 * (attempt + 1))
    raise last


def clean(s):
    if s is None:
        return None
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    s = s.replace("\xa0", " ")
    s = re.sub(r"[ \t\r\f\v]+", " ", s)
    s = re.sub(r"\s*\n\s*", "\n", s)
    return s.strip()


def money(s):
    if not s:
        return None
    m = re.search(r"(\d{1,3}(?:\.\d{3})*,\d{2})", s)
    if not m:
        return None
    return round(float(m.group(1).replace(".", "").replace(",", ".")), 2)


def parse_product_url(url):
    path = urllib.parse.unquote(url[len(BASE):])
    parts = path.split("~")
    if len(parts) < 6:
        return None
    head, pid, sub_id, cat_id, cat_code, sub_slug = parts[:6]
    ref_m = re.search(r"---(\d+)$", head)
    return {
        "id": int(pid),
        "slug": head.strip("-"),
        "ref": ref_m.group(1) if ref_m else None,
        "subcategory_id": int(sub_id),
        "category_id": int(cat_id),
        "category_code": cat_code,
        "subcategory_slug": sub_slug,
    }


SPEC_KEYS = {
    "cor": "color",
    "dimensões médias": "dimensions",
    "dimensões": "dimensions",
    "pedras": "stones",
    "pedra": "stones",
    "peso médio": "weight",
    "peso": "weight",
    "material": "material",
    "comprimento": "length",
    "largura": "width",
    "espessura": "thickness",
    "altura": "height",
    "fecho": "clasp",
    "acabamento": "finish",
    "tamanho": "size",
}


def parse_specs(block):
    specs = {}
    raw = []
    if not block:
        return specs, raw
    items = re.findall(r"<(?:p|dt|dd|li)[^>]*>(.*?)</(?:p|dt|dd|li)>", block, flags=re.S | re.I)
    if not items:
        items = re.split(r"<br\s*/?>|\n", block)
    for p in items:
        line = clean(p)
        if not line or line.lower().startswith("especifica"):
            continue
        raw.append(line)
        m = re.match(r"^([^:]{2,40}):\s*(.+)$", line)
        if m:
            key = m.group(1).strip().lower()
            val = m.group(2).strip().rstrip(".").strip()
            specs[SPEC_KEYS.get(key, key)] = val
    return specs, raw


def parse_dims(text):
    out = {}
    if not text:
        return out
    for label, key in (("altura", "heightMm"), ("largura", "widthMm"), ("espessura", "thicknessMm"),
                       ("comprimento", "lengthMm"), ("diâmetro", "diameterMm")):
        m = re.search(label + r"(?:\s+interno)?\s*:?\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(mm|cm)", text, flags=re.I)
        if m:
            v = float(m.group(1).replace(",", "."))
            out[key] = v * 10 if m.group(2).lower() == "cm" else v
    return out


def parse_weight(text):
    if not text:
        return None
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*g", text, flags=re.I)
    return float(m.group(1).replace(",", ".")) if m else None


def parse_product(url, page):
    info = parse_product_url(url)
    og = re.search(r'<meta property="og:title" content="([^"]*)"', page)
    name = clean(og.group(1)) if og else None
    if name:
        name = re.sub(r"^Luxer Joias\s*-\s*", "", name)
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", page, flags=re.S)
    if not name and h1:
        name = clean(h1.group(1))
    if name:
        name = re.sub(r"\s+", " ", name.replace("–", " ").replace("—", " ")).strip()

    # descrição (bloco "Comentário" da LojaMestre)
    desc = None
    m = re.search(r"<!-- Coment\S*rio -->\s*<div[^>]*>(.*?)</div>", page, flags=re.S)
    if m:
        desc = clean(re.sub(r"<br\s*/?>", "\n", m.group(1)))
        desc = desc or None

    # especificações técnicas (aba Descrição do Produto)
    spec_block = None
    m = re.search(r'<div id="desc"[^>]*>(.*?)</div>', page, flags=re.S)
    if m:
        spec_block = re.sub(r"<h4.*?</h4>", "", m.group(1), flags=re.S)
    specs, spec_lines = parse_specs(spec_block)

    # preços
    price = None
    m = re.search(r'id="change_price"[^>]*>(.*?)</div>', page, flags=re.S)
    price_block = m.group(1) if m else ""
    prices_in_block = re.findall(r"\d{1,3}(?:\.\d{3})*,\d{2}", clean(price_block) or "")
    compare_at = None
    if len(prices_in_block) >= 2:
        vals = [money(p) for p in prices_in_block]
        compare_at, price = max(vals), min(vals)
    elif prices_in_block:
        price = money(prices_in_block[0])
    if price is None:
        m = re.search(r'class="?pppor"?[^>]*>(.*?)</span>', page, flags=re.S)
        if m:
            price = money(m.group(1))
        m = re.search(r'class="?ppde"?[^>]*>(.*?)</span>', page, flags=re.S)
        if m and money(m.group(1)) and price and money(m.group(1)) > price:
            compare_at = money(m.group(1))
    if price is None:
        m = re.search(r'itemprop="price" content="([\d.]+)"', page)
        price = float(m.group(1)) if m else None
    # preço "de" exibido em elementos riscados próximos ao preço
    if compare_at is None:
        start = page.find('id="change_price"')
        near = page[max(0, start - 2500):start] if start > 0 else ""
        m = re.search(r'class="?[^">]*(?:ppde|preco_de|precode|preco-de|pp_de)[^">]*"?[^>]*>(.*?)</', near, flags=re.S | re.I) \
            or re.search(r"<(?:s|del|strike)>(.*?)</(?:s|del|strike)>", near, flags=re.S | re.I)
        if m and money(m.group(1)) and price and money(m.group(1)) > price:
            compare_at = money(m.group(1))

    pix = None
    m = re.search(r'id="valor_vista"[^>]*>(.*?)</span>', page, flags=re.S)
    if m:
        pix = money(m.group(1))
    else:
        m = re.search(r'class="?ppavista"?[^>]*>(.*?)</span>', page, flags=re.S)
        if m:
            pix = money(m.group(1))
    inst_n = inst_v = None
    m = re.search(r'id="ajax_parcelado_parcelas"[^>]*>(\d+)</span>', page)
    if m:
        inst_n = int(m.group(1))
    m = re.search(r'id="ajax_parcelado_valor"[^>]*>(.*?)</span>', page, flags=re.S)
    if m:
        inst_v = money(m.group(1))
    if inst_n is None:
        m = re.search(r'class="?ppparcelado"?[^>]*>\s*(\d+)\s*x\s*de\s*(R\$[^<]*)</span>', page, flags=re.S)
        if m:
            inst_n, inst_v = int(m.group(1)), money(m.group(2))

    # variações: blocos schema.org/Product por SKU (ex.: 25438_13 = tamanho 13)
    variants = []
    for blk in re.findall(r'itemtype="https://schema.org/Product" itemscope>(.*?)</div>\s*</div>\s*</div>', page, flags=re.S):
        sku = re.search(r'itemprop="sku" content="([^"]*)"', blk) or re.search(r'itemprop="mpn" content="([^"]*)"', blk)
        av = re.search(r'itemprop="availability" content="[^"]*/(\w+)"', blk)
        pr = re.search(r'itemprop="price" content="([\d.]+)"', blk)
        if not sku:
            continue
        sku = html.unescape(sku.group(1))
        label = sku.split("_", 1)[1] if "_" in sku else None
        variants.append({
            "sku": sku,
            "option": label,
            "price": float(pr.group(1)) if pr else None,
            "available": (av.group(1) == "InStock") if av else None,
        })
    # remove duplicados mantendo a ordem
    seen = set()
    variants = [v for v in variants if not (v["sku"] in seen or seen.add(v["sku"]))]
    option_name = None
    m = re.search(r"Escolha\s+(?:o|a)\s+([^:<]+):", page, flags=re.I)
    if m:
        option_name = clean(m.group(1)).capitalize()

    # galeria
    images = []
    for href in re.findall(r'<a href="(produtos/[^"]+)" rel="zoom-id:Zoomer"', page):
        u = urllib.parse.urljoin(BASE, href.replace(" ", "%20"))
        if u not in images:
            images.append(u)
    if not images:
        m = re.search(r'<meta property="og:image" content="([^"]*)"', page)
        if m and "/produtos/" in m.group(1):
            images.append(m.group(1).replace(" ", "%20"))

    videos = sorted(set(re.findall(r'(?:youtube\.com/embed/|youtu\.be/|youtube\.com/watch\?v=)([\w-]{6,})', page)))

    available = any(v["available"] for v in variants) if variants else None
    if available is None:
        m = re.search(r'itemprop="availability" content="[^"]*/(\w+)"', page)
        available = (m.group(1) == "InStock") if m else None

    dims = parse_dims(" / ".join(spec_lines))
    return {
        "sourceId": info["id"],
        "sourceUrl": url,
        "ref": info["ref"],
        "slugSource": info["slug"],
        "name": name,
        "description": desc,
        "specLines": spec_lines,
        "specs": specs,
        "color": specs.get("color"),
        "material": specs.get("material"),
        "stones": specs.get("stones"),
        "weightG": parse_weight(specs.get("weight")),
        "dimensions": dims,
        "price": price,
        "compareAtPrice": compare_at,
        "pixPrice": pix,
        "installments": inst_n,
        "installmentValue": inst_v,
        "optionName": option_name if variants else None,
        "variants": variants,
        "available": available,
        "images": images,
        "videos": videos,
    }


def html_to_md(fragment):
    """Converte o miolo HTML de uma página institucional em Markdown simples (sem HTML bruto)."""
    BR = " \u00a7\u00a7 "  # marcador de quebra de bloco que sobrevive ao clean()
    f = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", "", fragment, flags=re.S)
    f = re.sub(r"<h1[^>]*>.*?</h1>", "", f, flags=re.S | re.I)
    f = re.sub(r"<h[23][^>]*>(.*?)</h[23]>", lambda m: BR + "## " + clean(m.group(1)) + BR, f, flags=re.S | re.I)
    f = re.sub(r"<h[4-6][^>]*>(.*?)</h[4-6]>", lambda m: BR + "### " + clean(m.group(1)) + BR, f, flags=re.S | re.I)
    f = re.sub(r"<li[^>]*>(.*?)</li>", lambda m: BR + "- " + clean(m.group(1)).replace("\n", " "), f, flags=re.S | re.I)
    f = re.sub(r"<(?:b|strong)[^>]*>(.*?)</(?:b|strong)>", lambda m: (" **" + clean(m.group(1)) + "** ") if clean(m.group(1)) else "", f, flags=re.S | re.I)
    f = re.sub(r"<span[^>]*font-weight:\s*bold[^>]*>(.*?)</span>", lambda m: " **" + clean(m.group(1)) + "** ", f, flags=re.S | re.I)
    f = re.sub(r"<br\s*/?>\s*<br\s*/?>", BR, f, flags=re.I)
    f = re.sub(r"<br\s*/?>", " ", f, flags=re.I)
    f = re.sub(r"</p>|</div>|<p[^>]*>|<div[^>]*>|</ul>|<ul[^>]*>", BR, f, flags=re.I)
    txt = (clean(f) or "").replace("\n", " ")
    blocks = [re.sub(r"\s+", " ", b).strip() for b in txt.split("\u00a7\u00a7")]
    out = []
    for b in blocks:
        b = re.sub(r"\*\*\s*\*\*", "", b).replace("** ", "**", 0)
        b = re.sub(r"\*\*\s+([^*]+?)\s+\*\*", r"**\1**", b)
        if not b or b in ("**", "##", "###") or re.fullmatch(r"#+\s*", b):
            continue
        # itens de lista consecutivos ficam no mesmo bloco
        if b.startswith("- ") and out and out[-1].split("\n")[-1].startswith("- "):
            out[-1] += "\n" + b
        else:
            out.append(b)
    return "\n\n".join(out)


def parse_institutional(page):
    m = re.search(r'<div[^>]*class="[^"]*(?:conteudo|institucional|texto_pagina)[^"]*"[^>]*>(.*)', page, flags=re.S | re.I)
    body = page[page.find("<body"):]
    # remove menu/rodapé: pega o trecho entre o breadcrumb e o newsletter
    txt = clean(re.sub(r"<script.*?</script>|<style.*?</style>", "", body, flags=re.S))
    return txt


def crawl_listing(start_url, max_pages=60):
    """Percorre uma listagem de categoria e todas as páginas (?offset=N). Retorna URLs de produtos na ordem exibida."""
    seen_pages, queue, found = set(), [start_url], []
    while queue and len(seen_pages) < max_pages:
        url = queue.pop(0)
        if url in seen_pages:
            continue
        seen_pages.add(url)
        try:
            pg = fetch(url)
        except Exception:
            continue
        for href in re.findall(r'href="([^"]+~\d+~\d+~\d+~[^"]+)"', pg):
            u = urllib.parse.urljoin(BASE, html.unescape(href))
            if u not in found:
                found.append(u)
        for href in re.findall(r'href="([^"]*offset=\d+[^"]*)"', pg):
            u = urllib.parse.urljoin(BASE, html.unescape(href))
            if u not in seen_pages and u not in queue:
                queue.append(u)
    return found, len(seen_pages)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--images")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--merge", action="store_true", help="reaproveita o catalog.json existente e busca só os produtos ausentes")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    print("Lendo sitemap…", flush=True)
    sm = fetch(BASE + "sitemap.xml")
    urls = re.findall(r"<loc><!\[CDATA\[([^\]]*)\]\]></loc>", sm)
    home = fetch(BASE)

    # categorias (nomes com acentos vêm do menu da homepage)
    labels = {}
    for href, text in re.findall(r'<a[^>]*href="(\d+_[^"]+)"[^>]*>([^<]{1,80})</a>', home):
        labels[href.split("/")[-1]] = clean(text)
    categories = {}
    subcategories = {}
    for u in urls:
        p = u[len(BASE):]
        m = re.match(r"^(\d+)_([A-Z0-9]+)$", p)
        if m:
            categories[int(m.group(1))] = {"sourceId": int(m.group(1)), "code": m.group(2),
                                           "name": labels.get(p) or m.group(2).capitalize()}
        m = re.match(r"^(\d+)_([^_]+)_([A-Z0-9]+)_(\d+)$", p)
        if m:
            subcategories[int(m.group(1))] = {"sourceId": int(m.group(1)), "slug": m.group(2),
                                              "name": labels.get(p) or m.group(2).replace("-", " "),
                                              "categoryCode": m.group(3), "categorySourceId": int(m.group(4))}

    pages = [u for u in urls if re.match(r"^" + re.escape(BASE) + r"\d+~", u)]

    by_id = {}
    for u in urls:
        info = parse_product_url(u) if u.startswith(BASE) and "~" in u else None
        if not info or re.match(r"^\d+$", u[len(BASE):].split("~")[0]):
            continue
        rec = by_id.setdefault(info["id"], {"urls": [], "cats": set()})
        if u not in rec["urls"]:
            rec["urls"].append(u)
        rec["cats"].add((info["category_id"], info["subcategory_id"]))
    # listagens de categorias/subcategorias (com paginação): pertencimento real e produtos fora do sitemap
    listing_urls = [(BASE + f"{c['sourceId']}_{c['code']}", c["sourceId"], None) for c in categories.values()]
    listing_urls += [(BASE + f"{sc['sourceId']}_{sc['slug']}_{sc['categoryCode']}_{sc['categorySourceId']}", sc["categorySourceId"], sc["sourceId"]) for sc in subcategories.values()]
    listing_pages = 0
    only_listing = 0

    def crawl(entry):
        url, cat_id, sub_id = entry
        found, n = crawl_listing(url)
        return cat_id, sub_id, found, n

    with cf.ThreadPoolExecutor(max_workers=a.workers) as ex:
        for cat_id, sub_id, found, n in ex.map(crawl, listing_urls):
            listing_pages += n
            for u in found:
                info = parse_product_url(u)
                if not info:
                    continue
                rec = by_id.get(info["id"])
                if rec is None:
                    only_listing += 1
                    rec = by_id.setdefault(info["id"], {"urls": [u], "cats": set()})
                if sub_id is not None:
                    rec["cats"].add((cat_id, sub_id))
                else:
                    rec.setdefault("parents", set()).add(cat_id)
    print(f"Listagens: {len(listing_urls)} categorias, {listing_pages} páginas · {only_listing} produtos fora do sitemap", flush=True)

    ids = sorted(by_id)
    if a.limit:
        ids = ids[: a.limit]
    print(f"{len(urls)} URLs no sitemap · {len(by_id)} produtos únicos · processando {len(ids)}", flush=True)

    products, errors = [], []
    if a.merge and os.path.exists(os.path.join(a.out, "catalog.json")):
        prev = json.load(open(os.path.join(a.out, "catalog.json"), encoding="utf-8"))
        products = [p for p in prev["products"] if p["sourceId"] in by_id]
        for p in products:  # atualiza o pertencimento com as listagens
            p["categories"] = [{"categorySourceId": c, "subcategorySourceId": sc} for c, sc in sorted(by_id[p["sourceId"]]["cats"])]
            p["parentCategories"] = sorted(by_id[p["sourceId"]].get("parents", set()))
        have = {p["sourceId"] for p in products}
        ids = [i for i in ids if i not in have]
        print(f"Modo incremental: {len(products)} já importados, {len(ids)} a buscar", flush=True)

    def work(pid):
        rec = by_id[pid]
        page = fetch(rec["urls"][0])
        p = parse_product(rec["urls"][0], page)
        p["categories"] = [{"categorySourceId": c, "subcategorySourceId": s} for c, s in sorted(rec["cats"])]
        p["parentCategories"] = sorted(rec.get("parents", set()))
        p["sourceUrls"] = rec["urls"]
        return p

    with cf.ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(work, pid): pid for pid in ids}
        for i, f in enumerate(cf.as_completed(futs), 1):
            pid = futs[f]
            try:
                products.append(f.result())
            except Exception as e:
                errors.append({"sourceId": pid, "url": by_id[pid]["urls"][0], "error": str(e)})
            if i % 50 == 0:
                print(f"  {i}/{len(ids)}", flush=True)
    products.sort(key=lambda p: p["sourceId"])

    # páginas institucionais
    institutional = []
    for u in pages:
        try:
            pg = fetch(u)
            title = u[len(BASE):].split("~", 1)[1].replace("-", " ")
            m = re.search(r'<div[^>]*id="?conteudo_institucional"?[^>]*>(.*?)<!--', pg, flags=re.S)
            institutional.append({"sourceUrl": u, "title": title, "html": None, "text": None})
            # guarda o HTML bruto do miolo para revisão manual no CMS
            body = pg[pg.find("<body"):]
            body = re.sub(r"<script.*?</script>|<style.*?</style>", "", body, flags=re.S)
            m = re.search(r"<!-- INICIO CENTRO -->(.*?)<!--\s*FIM CENTRO", pg, flags=re.S)
            institutional[-1]["text"] = clean(body)
            institutional[-1]["markdown"] = html_to_md(m.group(1)) if m else None
            t = re.search(r"<h1[^>]*>(.*?)</h1>", m.group(1) if m else "", flags=re.S)
            if t:
                institutional[-1]["title"] = clean(t.group(1))
        except Exception as e:
            errors.append({"url": u, "error": str(e)})

    # imagens
    img_missing = []
    if a.images:
        os.makedirs(a.images, exist_ok=True)
        jobs = []
        for p in products:
            folder = os.path.join(a.images, str(p["ref"] or p["sourceId"]))
            p["localImages"] = []
            for n, u in enumerate(p["images"], 1):
                ext = os.path.splitext(urllib.parse.urlparse(u).path)[1].lower() or ".jpg"
                dest = os.path.join(folder, f"{n}{ext}")
                p["localImages"].append(os.path.relpath(dest, a.images))
                jobs.append((p, u, dest, folder))

        def dl(job):
            p, u, dest, folder = job
            if os.path.exists(dest) and os.path.getsize(dest) > 0:
                return None
            os.makedirs(folder, exist_ok=True)
            data, ctype = fetch(u, binary=True)
            if not ctype.startswith("image/") or len(data) < 200:
                raise ValueError(f"conteúdo inválido ({ctype}, {len(data)} bytes)")
            with open(dest + ".part", "wb") as fh:
                fh.write(data)
            os.replace(dest + ".part", dest)
            return None

        print(f"Baixando {len(jobs)} fotografias…", flush=True)
        with cf.ThreadPoolExecutor(max_workers=a.workers) as ex:
            futs = {ex.submit(dl, j): j for j in jobs}
            for i, f in enumerate(cf.as_completed(futs), 1):
                p, u, dest, _ = futs[f]
                try:
                    f.result()
                except Exception as e:
                    img_missing.append({"sourceId": p["sourceId"], "ref": p["ref"], "url": u, "error": str(e)})
                    if dest in [os.path.join(a.images, x) for x in p["localImages"]]:
                        p["localImages"].remove(os.path.relpath(dest, a.images))
                if i % 200 == 0:
                    print(f"  {i}/{len(jobs)}", flush=True)

    # relatório de migração
    by_ref, by_name = {}, {}
    for p in products:
        by_ref.setdefault(p["ref"], []).append(p["sourceId"])
        by_name.setdefault((p["name"] or "").lower(), []).append(p["sourceId"])
    incomplete = []
    for p in products:
        missing = [k for k in ("name", "ref", "description", "price", "pixPrice", "material", "weightG")
                   if p.get(k) in (None, "", [])]
        if not p["images"]:
            missing.append("images")
        if not p["specLines"]:
            missing.append("specs")
        if missing:
            incomplete.append({"sourceId": p["sourceId"], "ref": p["ref"], "name": p["name"], "missing": missing})
    report = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "source": BASE,
        "totals": {
            "sitemapUrls": len(urls),
            "listingPagesCrawled": listing_pages,
            "productsOnlyInListings": only_listing,
            "uniqueProducts": len(by_id),
            "imported": len(products),
            "categories": len(categories),
            "subcategories": len(subcategories),
            "institutionalPages": len(institutional),
            "images": sum(len(p["images"]) for p in products),
            "withPromotion": sum(1 for p in products if p["compareAtPrice"]),
            "unavailable": sum(1 for p in products if p["available"] is False),
            "withVariants": sum(1 for p in products if p["variants"]),
        },
        "duplicateRefs": {k: v for k, v in by_ref.items() if len(v) > 1},
        "duplicateNames": {k: v for k, v in by_name.items() if len(v) > 1 and k},
        "productsWithoutImages": [p["sourceId"] for p in products if not p["images"]],
        "imageDownloadFailures": img_missing,
        "incomplete": incomplete,
        "errors": errors,
        "notes": [
            "Os produtos aparecem em várias URLs do sitemap (uma por subcategoria); foram consolidados por ID de origem.",
            "Variações vêm dos blocos schema.org por SKU publicados em cada página.",
            "Estoque numérico não é publicado pelo site de origem: apenas disponibilidade (InStock/OutOfStock).",
            "Código de barras, quilatagem e número de pedras não estão publicados de forma estruturada.",
        ],
    }
    catalog = {
        "source": BASE,
        "importedAt": report["generatedAt"],
        "categories": sorted(categories.values(), key=lambda c: c["sourceId"]),
        "subcategories": sorted(subcategories.values(), key=lambda c: c["sourceId"]),
        "products": products,
        "institutional": institutional,
    }
    with open(os.path.join(a.out, "catalog.json"), "w", encoding="utf-8") as fh:
        json.dump(catalog, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(a.out, "migration-report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print(json.dumps(report["totals"], ensure_ascii=False, indent=1))
    print(f"Erros: {len(errors)} · falhas de imagem: {len(img_missing)} · incompletos: {len(incomplete)}")


if __name__ == "__main__":
    sys.exit(main())
