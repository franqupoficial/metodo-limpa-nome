"use client";

import { useState } from "react";
import type { NewsPost } from "@prisma/client";
import { ActionForm, Submit } from "./ActionForm";
import { NEWS_CATEGORIES } from "@/content/news-categories";
import type { ActionState } from "@/lib/action";

export function NewsForm({ action, post, defaultAuthor }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; post?: NewsPost | null; defaultAuthor: string }) {
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDesc, setSeoDesc] = useState(post?.seoDescription ?? "");
  const localDate = post?.publishedAt ? new Date(new Date(post.publishedAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  return (
    <ActionForm action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="card space-y-4 p-5">
        <label className="block"><span className="label">Título</span><input name="title" defaultValue={post?.title} required maxLength={160} className="input text-lg font-semibold" /></label>
        <label className="block"><span className="label">Subtítulo</span><textarea name="subtitle" defaultValue={post?.subtitle} required maxLength={300} rows={2} className="input" /></label>
        <label className="block">
          <span className="label">Conteúdo</span>
          <textarea name="content" defaultValue={post?.content} required rows={22} className="input font-mono text-sm" />
          <span className="hint block">Formatação: ## Título, ### Subtítulo, **negrito**, *itálico*, - lista, 1. lista numerada, &gt; destaque, [texto](/link). Produza apenas conteúdo original.</span>
        </label>
      </div>
      <div className="space-y-4">
        <div className="card space-y-3 p-5">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="published" defaultChecked={post?.published} className="accent-brand-700" /> Publicado</label>
          <label className="block"><span className="label text-xs">Data de publicação</span><input type="datetime-local" name="publishedAt" defaultValue={localDate} className="input" /><span className="hint block">Datas futuras agendam a publicação.</span></label>
          <label className="block"><span className="label text-xs">Categoria</span><select name="category" defaultValue={post?.category ?? ""} required className="input"><option value="">Selecione</option>{NEWS_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select></label>
          <label className="block"><span className="label text-xs">Autor / editor</span><input name="author" defaultValue={post?.author ?? defaultAuthor} required className="input" /></label>
          <label className="block"><span className="label text-xs">Slug (URL)</span><input name="slug" defaultValue={post?.slug} className="input" placeholder="gerado a partir do título" /></label>
          <Submit className="btn-primary w-full">Salvar</Submit>
        </div>
        <div className="card space-y-3 p-5">
          <p className="text-sm font-semibold">Imagem</p>
          {post?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.imageUrl} alt="" className="rounded-lg" />
          )}
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="input text-xs" aria-label="Enviar imagem" />
          <input name="imageUrl" defaultValue={post?.imageUrl ?? ""} className="input" placeholder="ou URL https://" aria-label="URL da imagem" />
          <input name="imageAlt" defaultValue={post?.imageAlt ?? ""} className="input" placeholder="Texto alternativo (acessibilidade)" aria-label="Texto alternativo" />
          <p className="text-[11px] text-muted">Use apenas imagens próprias ou licenciadas.</p>
        </div>
        <div className="card space-y-3 p-5">
          <p className="text-sm font-semibold">SEO e relacionados</p>
          <label className="block"><span className="label text-xs">Título SEO ({seoTitle.length}/70)</span><input name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} className="input" /></label>
          <label className="block"><span className="label text-xs">Descrição SEO ({seoDesc.length}/170)</span><textarea name="seoDescription" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} maxLength={170} rows={3} className="input" /></label>
          <label className="block"><span className="label text-xs">Notícias relacionadas (slugs, separados por vírgula)</span><input name="related" defaultValue={post?.related.join(", ")} className="input" /></label>
        </div>
      </div>
    </ActionForm>
  );
}
