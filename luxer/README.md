# Luxer Joias V2

Plataforma própria da Luxer Joias: loja premium, portal administrativo (ERP comercial), remarketing automático, atendimento com IA + equipe e provador virtual.

> Projeto independente dentro deste repositório (`luxer/`). O **Portal Consumidor** na raiz do repositório não foi alterado.

## Stack
Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · PostgreSQL (Supabase, Neon ou próprio) · Prisma 6 · GSAP · sharp · SDK oficial da Anthropic (Claude) · Pagar.me v5 · Melhor Envio · armazenamento local ou S3 (Supabase Storage / Cloudflare R2 / AWS).

## Instalação local
```bash
cd luxer
cp .env.example .env              # preencha DATABASE_URL e as chaves (ver abaixo)
npm install
npm run db:migrate                # cria as tabelas
npm run db:seed                   # páginas, FAQ, seções da home, fluxos de remarketing (desativados)
npm run catalog:import            # importa data/catalog.json + fotos de storage/catalog-originals
npm run admin:create-owner -- --email voce@luxerjoias.com.br --name "Seu Nome"
npm run dev                       # http://localhost:3100  ·  painel: /admin
```
As fotos originais não ficam no Git (≈130 MB). Para baixá-las de novo do site atual, enquanto ele estiver no ar: `npm run catalog:scrape` (com `--merge` reaproveita o que já foi baixado).

### Dados da plataforma anterior (clientes e estoque)
```bash
npm run legacy:import -- --clientes /caminho/geral_cli.csv --estoque /caminho/estoque.xls --dry-run   # simulação
npm run legacy:import -- --clientes /caminho/geral_cli.csv --estoque /caminho/estoque.xls
```
Os arquivos contêm dados pessoais: **nunca** os coloque no repositório. Relatório completo da migração: [`data/MIGRACAO.md`](data/MIGRACAO.md).

## Variáveis de ambiente
| Variável | Para quê |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | PostgreSQL |
| `APP_URL` | URL pública (links de e-mail, feed, webhooks) |
| `DATA_ENCRYPTION_KEY`, `HASH_KEY` | Criptografia de CPF/endereços e hashes. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. **Guarde com segurança** — sem elas os dados criptografados não podem ser lidos. |
| `CRON_SECRET` | Protege `/api/jobs/run` (rotinas a cada 15 min, já configuradas em `vercel.json`) |
| `OWNER_EMAIL`, `OWNER_NAME`, `OWNER_INITIAL_PASSWORD` | Proprietário inicial (senha só no 1º deploy; depois remova) |
| `STORAGE_DRIVER=s3`, `S3_*`, `NEXT_PUBLIC_MEDIA_URL` | Imagens em produção (obrigatório na Vercel) |
| `PAGARME_SECRET_KEY`, `NEXT_PUBLIC_PAGARME_PUBLIC_KEY`, `PAGARME_WEBHOOK_USER`, `PAGARME_WEBHOOK_PASSWORD` | Pagamentos Pix e cartão |
| `MELHORENVIO_TOKEN`, `MELHORENVIO_ENV`, `MELHORENVIO_CONTACT_EMAIL` | Frete, etiquetas e rastreio (Correios e transportadoras) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | E-mails transacionais e de marketing |
| `ANTHROPIC_API_KEY` | Concierge Luxer (atendimento com IA). Sem ela o chat funciona só com a equipe |
| `GEMINI_API_KEY` | LUXER AI TRY-ON (provador virtual). Sem ela o provador não aparece na loja |

O painel mostra o estado de cada integração em **Configurações → Integrações** (nunca exibe os valores).

## Publicação (Vercel + Supabase/Neon)
1. Crie o banco PostgreSQL e um bucket S3 (Supabase Storage com acesso S3, ou Cloudflare R2) público para leitura.
2. Na Vercel, importe o repositório com **Root Directory = `luxer`**. O `vercel.json` já define build (`migrate deploy` + seed) e o cron.
3. Cadastre as variáveis acima. Defina `STORAGE_DRIVER=s3`.
4. Rode uma vez, a partir de uma máquina com as fotos: `npm run catalog:import` apontando para o banco/bucket de produção, e `npm run legacy:import` com as planilhas.
5. Pagar.me: cadastre o domínio (tokenização) e o webhook `https://SEU_DOMINIO/api/webhooks/pagarme` com Basic Auth.
6. Faça uma compra Pix e uma com cartão em **sk_test_** antes de trocar para as chaves de produção.

Backups: o PostgreSQL gerenciado faz backup automático (habilite PITR); para cópias extras, `pg_dump` agendado.

## Módulos
**Loja**: direção de arte editorial de alta joalheria (off-white, catálogo em branco natural, preto e dourado fosco só como detalhe, fotografia original sem recortes); abertura preparada para fotografia lifestyle ou vídeo macro cadastrados no painel (sem eles, usa a fotografia original de peças reais), Atelier Concierge (compra guiada em 3 escolhas com produtos reais), catálogo com busca sem acento e sinônimos, filtros, comparação, favoritos, produto com zoom/vídeos/avaliações reais, frete, sacola, cupons, checkout Pix/cartão, página do pedido com QR Code, conta do cliente (pedidos, endereços, LGPD), Luxer Fé, provador virtual, páginas do CMS, feed Google Merchant, sitemap, GA4/GTM/Meta Pixel com consentimento.

**Concierge Luxer** (botão flutuante): curadoria guiada, respostas rápidas (aro, certificado, prazos, pagamento — editáveis), chat com IA (Claude) que consulta o catálogo e o status de pedidos, e transferência para a equipe, que continua a conversa em **/admin/atendimento**.

**Painel /admin**: visão geral com comparação de períodos; produtos (ficha de joalheria, galeria, vídeos, variações, SEO, agendamento, lote); categorias e coleções; estoque (reservas, movimentações, inventário, CSV); pedidos (status, rastreio, etiqueta Melhor Envio, cancelamento com reembolso, impressão); clientes (CRM, segmentos, LGPD); atendimento; financeiro (faturamento ≠ recebimento ≠ lucro, conciliação Pagar.me); **remarketing automático** (reativação, reconexão da base, aniversário, pós-compra, boas-vindas, VIP, campanha de recuperação, cupons únicos, fila de WhatsApp, atribuição de receita/ROI); banners, pop-ups, cupons, campanhas, leads, carrinhos abandonados; CMS; avaliações; Luxer AI; relatórios; usuários com permissões granulares e auditoria; configurações.

## LUXER AI TRY-ON — provador com IA realista
Botão **Experimentar com IA** na página de cada peça compatível (aparece quando há credencial do provedor). O cliente fotografa pela câmera (com contorno de enquadramento) ou envia da galeria, sem precisar de conta. Existe também o **provador AR ao vivo** (`/provador`, botões "Provar … (AR)"), que roda inteiramente no aparelho e não depende de credencial.

**Provador AR (gratuito, no aparelho)** — nunca cola a foto do catálogo com fundo branco sobre a câmera:
- **Recorte com alfa real** (`src/components/luxe/ar/matte.ts`): fundo do estúdio, sombra de contato e miolo de aros removidos; bordas suavizadas e descontaminadas (sem halo branco). Validação em todas as fotos do catálogo: `npx tsx scripts/validate-matte.ts <pasta-de-saída>`.
- **Pérolas/madrepérola** (branco sobre branco, onde a cor não separa): recorte conservador + refino com o segmentador por ponto do MediaPipe (`magic_touch`, no aparelho); se o modelo não carregar, fica o recorte por cor.
- **Peças separadas**: cada brinco do par e as peças de um conjunto viram miniaturas selecionáveis; "Usar como" só oferece usos coerentes (brinco, colar se houver colar, anel se houver anel).
- **Rastreamento**: FaceLandmarker (lóbulos e colo) e HandLandmarker (anelar e pulso), escala/rotação dinâmicas, sombra e ajuste de brilho à cena; correntes estendidas na foto são desenhadas elo a elo contornando o pescoço.
- **Ajustar**: tamanho, posição X/Y, rotação e brilho; a captura salva só vídeo + joia (sem interface).

### Arquitetura (híbrida: visão computacional no aparelho + IA generativa no servidor)
1. **No navegador** — verificação de resolução, exposição e nitidez; para anéis e pulseiras, o **MediaPipe HandLandmarker** mede as 21 articulações da mão na foto: alerta se a mão não aparece, está pequena, cortada ou com o anelar dobrado, e envia os pontos ao servidor.
2. **Detecção** (`src/lib/ai/tryon-pipeline.ts`) — com articulações: âncora anatômica na falange proximal do anelar (ou no pulso), largura do dedo/pulso em px e escala (px/mm, régua anatômica de 18 mm/55 mm) — sem chamada paga. Sem articulações (ou orelha/pescoço): modelo de visão devolve caixas e diagnóstico; foto inadequada é recusada sem custo de geração.
3. **Perfil da peça** — extraído das fotografias cadastradas do SKU (metal, pedras, desenho), em cache no produto.
4. **Edição generativa** — só no recorte da região, com as fotos originais da peça como referência obrigatória, instruções físicas da categoria e a **escala medida** ("o dedo tem N px; esta peça de X mm deve ter M px"). Máscara anatômica em cápsula ao longo do dedo (inpainting no provedor que suporta).
5. **Composição** — o recorte volta à foto original pela mesma máscara suavizada: fora dela a foto fica idêntica pixel a pixel (pele, unhas, fundo).
6. **Verificação de fidelidade** — inspeção independente (nota 0–100: mesma peça, metal, pedras, escala, pessoa inalterada). Abaixo do mínimo, nova geração com as divergências; persistindo, **não entrega** e orienta o cliente.

### Provedores (troca no painel, sem alterar o pipeline — `src/lib/ai/providers/`)
| Provedor | Edição | Visão | Credencial |
|---|---|---|---|
| Google Gemini (padrão) | `gemini-2.5-flash-image` (várias referências) | `gemini-2.5-flash` | `GEMINI_API_KEY` |
| OpenAI | `gpt-image-1` em `/images/edits` com **máscara** e `input_fidelity=high` | `gpt-4.1-mini` (json_schema) | `OPENAI_API_KEY` |

**Custo estimado por simulação** (referência; confira a tabela vigente de cada provedor e ajuste no painel): Gemini ≈ US$ 0,04–0,05 (1 geração + 1 verificação; a detecção é gratuita com articulações; +1 geração quando a verificação reprova); OpenAI ≈ US$ 0,20–0,30 (edição em alta qualidade). O perfil da peça é cobrado uma vez por produto.

### Segurança, privacidade e custos
Chaves só no servidor; upload com verificação de tipo, limite de 12 MB e redução para no máximo 1600 px (sem metadados EXIF/GPS); token de acesso por simulação; foto e resultado criptografados (AES-256-GCM) no banco — foto apagada ao fim do processamento (inclusive em falha), resultado apagado no prazo de retenção (padrão 60 min) ou na hora pelo cliente; limites por minuto, por dia, um processamento por vez, limite diário da loja e orçamento mensal; tempo-limite por chamada (`TRYON_EDIT_TIMEOUT_MS`, `TRYON_ANALYZE_TIMEOUT_MS`); custo de cada chamada registrado; alerta de falhas recorrentes. Painel **Luxer AI**: liga/desliga, provedor e modelos, diagnóstico da integração, simulações por período, taxa de sucesso, fidelidade média, custo, peças mais experimentadas, motivos de não entrega e erros.

### Para ativar
1. Crie a chave do provedor escolhido (Gemini: Google AI Studio com faturamento ativo; OpenAI: organização verificada para modelos de imagem).
2. Cadastre `GEMINI_API_KEY` (ou `OPENAI_API_KEY`) na Vercel → Settings → Environment Variables e faça um novo deploy.
3. Em `/admin/luxer-ai`: selecione o provedor, **Testar integração**, ajuste custos e ligue "Provador ativo na loja".
4. Antes de abrir ao público, faça provas com fotos reais (tons de pele, iluminação, anéis finos/largos/com pedra) e calibre a fidelidade mínima.

## Testes
```bash
npm test                 # regras de negócio (preço, Pix, parcelas, cupons, permissões, status, busca)
npm run build && npm run test:e2e   # 20 cenários no navegador, com banco de TESTE
```
A bateria E2E usa servidores **simulados** da Pagar.me, Gemini e Anthropic (variáveis `PAGARME_API_URL`, `GEMINI_API_URL`, `ANTHROPIC_BASE_URL`, usadas somente nos testes) para exercitar o código real de integração sem credenciais. Isso **não substitui** o teste em sandbox real de cada provedor, que depende das chaves da loja.

## Segurança e LGPD
Sessões com cookie `__Host-`, `httpOnly`, `SameSite=Strict`, expiração por inatividade; bloqueio após 5 tentativas; permissões verificadas no servidor em toda ação; auditoria com diff; rate limiting persistente; CSP e cabeçalhos de segurança; CPF e endereços criptografados (AES-256-GCM); exportação e anonimização de dados; consentimento para marketing (e-mail, WhatsApp/SMS) com descadastro em um clique; cookies de terceiros só com aceite; provador não armazena fotos; dados do cartão vão direto para a Pagar.me.
