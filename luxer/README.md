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

## LUXER AI TRY-ON (provador virtual)
Botão **Provar com IA** em cada peça compatível (anéis, brincos, colares/correntes/pingentes e pulseiras) e vitrine em `/provador`. O cliente fotografa pela câmera (com contorno de enquadramento por categoria) ou envia da galeria; o navegador confere resolução, luz e nitidez antes do envio.

Pipeline no servidor (`src/lib/ai/tryon-pipeline.ts`), assíncrono (a requisição responde na hora e o processamento continua com `after()`; o navegador acompanha as etapas):
1. **Detecção** — modelo de visão (Gemini, saída JSON com caixas) localiza a região do corpo e o ponto de aplicação (base do dedo, lóbulo, base do pescoço/colo, pulso) e avalia a foto. Foto inadequada é recusada aqui, com orientação, sem custo de geração.
2. **Perfil da joia** — extraído das fotografias cadastradas (metal, pedras, desenho), em cache no produto.
3. **Geração** — edição generativa (Gemini Image) **apenas do recorte** da região, com as fotos originais da peça como referência obrigatória e instruções físicas por categoria (escala, gravidade, perspectiva).
4. **Composição** — o recorte volta à foto original por máscara elíptica suavizada; fora da região a foto do cliente fica idêntica, o que também permite a comparação antes/depois alinhada.
5. **Verificação de fidelidade** — inspeção independente compara a peça aplicada com as fotos da peça (nota 0–100). Abaixo do mínimo (padrão 70), gera de novo informando as divergências; se persistir, **não entrega** o resultado.

Segurança e custos: chave só no servidor; upload com verificação de tipo e remoção de EXIF/GPS; token de acesso por simulação; foto e resultado criptografados (AES-256-GCM) no banco, foto apagada ao fim do processamento, resultado apagado no prazo de retenção (padrão 60 min) ou na hora pelo cliente; limites por minuto, por dia, um processamento por vez, limite diário da loja e orçamento mensal; custo estimado por chamada registrado; alertas de falhas recorrentes. Painel: **Luxer AI** (configuração, diagnóstico da integração, fidelidade média, custo, motivos de não entrega, erros).

**Para ativar:** crie a chave em Google AI Studio num projeto com faturamento (no plano pago o Google não usa os dados para treinar modelos), cadastre `GEMINI_API_KEY` na Vercel (Settings → Environment Variables), faça um novo deploy, clique em **Testar integração** em /admin/luxer-ai e ligue “Provador ativo na loja”. Ajuste no painel os custos por geração/análise conforme a tabela vigente do Google. Antes de abrir ao público, faça provas com fotos reais de cada categoria e calibre a fidelidade mínima.

## Testes
```bash
npm test                 # regras de negócio (preço, Pix, parcelas, cupons, permissões, status, busca)
npm run build && npm run test:e2e   # 20 cenários no navegador, com banco de TESTE
```
A bateria E2E usa servidores **simulados** da Pagar.me, Gemini e Anthropic (variáveis `PAGARME_API_URL`, `GEMINI_API_URL`, `ANTHROPIC_BASE_URL`, usadas somente nos testes) para exercitar o código real de integração sem credenciais. Isso **não substitui** o teste em sandbox real de cada provedor, que depende das chaves da loja.

## Segurança e LGPD
Sessões com cookie `__Host-`, `httpOnly`, `SameSite=Strict`, expiração por inatividade; bloqueio após 5 tentativas; permissões verificadas no servidor em toda ação; auditoria com diff; rate limiting persistente; CSP e cabeçalhos de segurança; CPF e endereços criptografados (AES-256-GCM); exportação e anonimização de dados; consentimento para marketing (e-mail, WhatsApp/SMS) com descadastro em um clique; cookies de terceiros só com aceite; provador não armazena fotos; dados do cartão vão direto para a Pagar.me.
