# Portal Consumidor

Plataforma web privada de informação, orientação e serviços digitais, com quatro serviços:

1. **Regularização e análise de apontamentos** (`/consumidor`)
2. **Abra seu CNPJ** (`/cnpj`)
3. **Solicitação de empréstimo** (`/emprestimo`)
4. **LVB — Locação de veículos** para motoristas de aplicativo (`/lvb`)

Inclui conteúdo educativo, notícias, busca, acompanhamento público de solicitações (`/acompanhar`) e painel administrativo completo (`/admin`). O checkout **não** está implementado — a arquitetura de pagamentos está preparada em `src/lib/payments`.

> O portal se apresenta como plataforma **privada**, sem vínculo com órgãos públicos, e não promete resultados garantidos.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 6 · Zod · bcrypt · Nodemailer

## Instalação

```bash
cp .env.example .env            # preencha DATABASE_URL, APP_URL, chaves e SMTP
# gere as chaves de criptografia:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # DATA_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # HASH_KEY

npm install
npm run db:migrate              # aplica as migrações
npm run db:seed                 # categorias, veículos, notícias, páginas e o administrador inicial
npm run admin:set-password      # define a senha do ADMIN_EMAIL de forma interativa
npm run build && npm start
```

**Administrador inicial:** o e-mail vem de `ADMIN_EMAIL` (padrão: o informado no projeto). Nenhuma senha fica no código. Defina-a com `npm run admin:set-password` **ou** em `/admin/recuperar-senha` (envia link por e-mail; sem SMTP configurado, o link aparece no log do servidor).

> **Guarde `DATA_ENCRYPTION_KEY` com segurança.** Sem ela, os dados criptografados (CPF, endereço, CNH, documentos) não podem ser lidos.

## Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | desenvolvimento |
| `npm run build` / `npm start` | produção |
| `npm test` | testes unitários (preços, simulador, validações) |
| `npm run typecheck` | checagem de tipos |
| `npm run retention` | política de retenção LGPD (agende diariamente) |
| `scripts/backup.sh` | backup `pg_dump` (agende diariamente e guarde cópias fora do servidor) |

## Painel administrativo (`/admin`)

Dashboard com indicadores · Clientes · Solicitações por serviço (Consumidor, CNPJ, Empréstimos, LVB) com status, histórico, observações, documentos, CPF mascarado e revelação auditada · Veículos (CRUD, fotos, disponibilidade, prazos, quilometragem) · Tarifas (categorias, ajustes por prazo, pacotes de km, inclusões, custos adicionais, valores dos serviços) · Notícias (CRUD, SEO, agendamento) · Acompanhamento (protocolos, novo código de acesso) · Configurações (contato, retenção, páginas institucionais) · Segurança (senha, sessões, usuários, trilha de auditoria).

Perfis: **Administrador** (tudo) e **Operador** (sem configurações, valores dos serviços, usuários e anonimização).

### Regras de preço LVB

- **Manual:** o administrador define o preço final.
- **Por referência:** preço sugerido = valor de referência × (1 − desconto); com 20%, fator **0,80**. Exige fonte e data da cotação; referências com mais de 60 dias são sinalizadas.
- Nenhum preço é publicado sem validação: o novo valor fica **pendente** até “Validar e publicar”. O preço publicado anterior continua no site até lá.
- O valor da solicitação é sempre recalculado no servidor.

Os valores iniciais do catálogo (R$ 1.440 a R$ 2.640/mês) são **ilustrativos** e os veículos foram cadastrados como “disponibilidade sob consulta”, com imagens ilustrativas. Itens como manutenção, IPVA, proteção e assistência estão como “confirmado na proposta” até serem configurados conforme a operação real.

## Segurança e LGPD

- Senhas com bcrypt (custo 12), política forte, bloqueio após 5 tentativas, sessões em banco (cookie `httpOnly`, `SameSite=Strict`, `__Host-` em produção), expiração por inatividade (1 h) e duração máxima (8 h).
- Recuperação/redefinição de senha por token de uso único (1 h), armazenado como hash.
- Rate limiting persistido no PostgreSQL (login, recuperação, formulários, acompanhamento).
- Validação com Zod no cliente **e** no servidor; Prisma (consultas parametrizadas) contra SQL injection; React sem HTML bruto e renderizador Markdown seguro contra XSS; cabeçalhos CSP, HSTS, `X-Frame-Options`.
- CSRF: Server Actions (verificação de Origin do Next.js) e verificação de Origin nas APIs públicas.
- CPF, dados do formulário e documentos criptografados com AES-256-GCM; busca por CPF via HMAC.
- Uploads: tipo detectado pelo conteúdo, limite de 5 MB, armazenamento criptografado, download só no painel e auditado.
- Acompanhamento exige **protocolo + código de acesso** (não é possível consultar só pelo CPF) e não exibe dados pessoais.
- E-mails não contêm dados sensíveis. Nunca são armazenados número completo de cartão ou CVV (`scrubPaymentPayload`).
- Trilha de auditoria de acessos e alterações; anonimização por solicitação e retenção automática.

## Checkout futuro

Implemente `PaymentProvider` (`src/lib/payments/types.ts`) para o fornecedor escolhido, registre-o em `src/lib/payments/index.ts` e defina `PAYMENT_PROVIDER`. Modelos `Payment`/`PaymentEvent` e o webhook `/api/pagamentos/webhook` já estão prontos (Pix, cartão, recorrência, autorização, ID de cobrança, histórico).

## Antes de publicar

- Revisão jurídica das páginas de Privacidade, Termos e Políticas LVB (marque “revisado” em Configurações para remover o aviso).
- Preencher razão social, CNPJ e contatos em Configurações.
- Confirmar coberturas, custos e preços reais da operação LVB.
- Confirmar a instituição concedente de crédito e a estrutura contratual do empréstimo.

## Hospedagem

A aplicação requer Node.js e PostgreSQL (ex.: VPS, Vercel + banco gerenciado, Railway, Render). O GitHub Pages (arquivo `CNAME`) serve apenas sites estáticos e **não** executa esta aplicação; aponte o domínio para a nova hospedagem. A landing page anterior foi preservada em `legacy/`.
