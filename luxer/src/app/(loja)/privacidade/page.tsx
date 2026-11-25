import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Markdown } from "@/lib/markdown";
import { Container } from "@/components/site/Section";
import { PageTitle } from "@/components/site/CatalogView";

export const metadata = { title: "Privacidade e cookies" };

/** Descreve o tratamento de dados que este sistema efetivamente realiza. Revisão jurídica recomendada antes da publicação. */
export default async function Privacy() {
  const [s, page] = await Promise.all([getSettings(), prisma.page.findFirst({ where: { slug: "seguranca-e-privacidade", published: true } })]);
  return (
    <>
      <PageTitle eyebrow="LGPD" title="Privacidade e cookies" />
      <Container className="max-w-2xl pb-24 pt-6">
        {page && <><Markdown source={page.content} /><div className="mx-auto my-14 h-px w-12 bg-gold" /></>}
        <Markdown source={`## Quais dados tratamos e por quê
- **Cadastro e pedidos** (nome, e-mail, telefone, CPF e endereço): para processar a compra, emitir nota fiscal, entregar e prestar atendimento. O CPF e os endereços são armazenados criptografados.
- **Pagamento**: os dados do cartão são enviados diretamente à Pagar.me e não são armazenados pela ${s.store.name}. Guardamos apenas bandeira e os 4 últimos dígitos.
- **Entrega**: nome, telefone e endereço são compartilhados com a transportadora escolhida.
- **Comunicação de marketing**: somente com o seu consentimento, que pode ser revogado a qualquer momento pelo link de descadastro ou na sua conta.
- **Carrinho**: se você informar o e-mail no checkout e não concluir a compra, podemos enviar um lembrete do carrinho.
- **Provador virtual (LUXER AI)**: somente com a sua autorização. A foto é enviada com os metadados (inclusive localização) removidos, guardada criptografada apenas enquanto a simulação é processada e apagada ao final. Para gerar a simulação, a foto é transmitida ao Google (Gemini API), que atua como operador. O resultado fica guardado criptografado por até ${s.ai.retentionMinutes} minutos para você visualizar e baixar, e pode ser excluído na hora pelo botão “Excluir minhas imagens agora”. A equipe da ${s.store.name} não tem acesso às fotos; registramos apenas dados técnicos (peça, etapa, tempo, custo e um identificador anônimo diário) para controle de uso.

## Cookies
- **Essenciais**: sessão, sacola e preferências (sempre ativos).
- **Medição e publicidade** (Google Analytics, Google Tag Manager e Meta Pixel): carregados somente após o seu aceite no aviso de cookies.

## Seus direitos
Você pode acessar, corrigir, baixar ou pedir a exclusão dos seus dados em [Minha conta → Meus dados](/conta/dados) ou pelo e-mail ${s.contact.email}. Pedidos e notas fiscais são mantidos pelo prazo exigido pela legislação fiscal.

## Controlador
${s.store.legalName} — CNPJ ${s.store.cnpj} — ${s.contact.address}.`} />
        <p className="mt-8 text-xs text-stone">Para alterar sua escolha de cookies, limpe os dados do site no navegador ou <Link href="/contato" className="underline">fale conosco</Link>.</p>
      </Container>
    </>
  );
}
