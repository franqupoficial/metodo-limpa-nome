"""Gera as falas do episódio com vozes neurais (edge-tts) — PRÉVIA de dublagem.
Para publicação comercial, substitua por vozes com licença comercial ou dublagem profissional.
Uso: python3 FERRAMENTAS/gerar_vozes.py EPISODIO_01/episodio01.html AUDIO/falas [proxy]"""
import asyncio, re, sys, os, json
import edge_tts
html, outdir = sys.argv[1], sys.argv[2]
proxy = sys.argv[3] if len(sys.argv) > 3 else None
src = open(html, encoding='utf-8').read()
bloco = src[src.index('const LINES=['):src.index('];', src.index('const LINES=['))]
linhas = re.findall(r"\[([\d.]+),([\d.]+),'(\w+)','([^']+)'\]", bloco)
# elenco: voz, tom, velocidade
ELENCO = {
  'LIZ':  ('pt-BR-ThalitaMultilingualNeural', '+38Hz', '+4%'),
  'LUMI': ('pt-BR-FranciscaNeural', '+22Hz', '-6%'),
  'ROBI': ('pt-BR-AntonioNeural', '+18Hz', '+2%'),
}
async def main():
  os.makedirs(outdir, exist_ok=True); meta = []
  for i, (t0, t1, who, txt) in enumerate(linhas, 1):
    if who not in ELENCO: continue          # Pipo e "Bip!" usam os efeitos da trilha
    if who == 'ROBI' and txt.strip() == 'Bip!': continue
    voz, tom, vel = ELENCO[who]
    nome = f"EP01_L{i:02d}_{who}.mp3"
    c = edge_tts.Communicate(txt.replace('…', '...'), voz, pitch=tom, rate=vel, proxy=proxy)
    await c.save(os.path.join(outdir, nome))
    meta.append({'arquivo': nome, 'inicio': float(t0), 'fim': float(t1), 'personagem': who, 'fala': txt})
    print(nome, txt)
  json.dump(meta, open(os.path.join(outdir, 'falas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
asyncio.run(main())
