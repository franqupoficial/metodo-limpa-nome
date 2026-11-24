export type FaqItem = { q: string; a: string };

export const FAQ_GERAL: FaqItem[] = [
  { q: "O Portal Consumidor é um site do governo?", a: "Não. O Portal Consumidor é uma plataforma privada de informação e intermediação de serviços. Não temos vínculo com órgãos públicos. Vários serviços que apresentamos também podem ser feitos gratuitamente pelos canais oficiais, e indicamos esses canais em nossas páginas." },
  { q: "Como acompanho minha solicitação?", a: "Ao concluir uma solicitação, você recebe um número de protocolo e um código de acesso. Acesse a página Acompanhar solicitação e informe os dois. Por segurança, o código de acesso é exibido apenas uma vez — guarde-o em local seguro." },
  { q: "Perdi meu código de acesso. E agora?", a: "Entre em contato pelos canais da página Contato informando o protocolo. Após confirmar sua identidade, nossa equipe pode gerar um novo código." },
  { q: "Vocês pedem pagamento por WhatsApp ou depósito em conta de pessoa física?", a: "Não. Nunca solicitamos pagamentos por canais não oficiais, nem antecipação de valores para liberar crédito. Se receber esse tipo de pedido em nosso nome, não pague e nos comunique." },
  { q: "Como meus dados são protegidos?", a: "Os dados pessoais são tratados conforme a Lei Geral de Proteção de Dados (LGPD). Informações sensíveis, como CPF, endereço e dados da CNH, são armazenadas de forma criptografada e o acesso é restrito à equipe autorizada, com registro de auditoria." },
  { q: "Posso solicitar a exclusão dos meus dados?", a: "Sim. Você pode exercer seus direitos de titular (acesso, correção, exclusão, portabilidade, entre outros) pelos canais da página Contato. Alguns dados podem ser mantidos pelo prazo exigido em lei ou para defesa em processos." },
];

export const FAQ_CONSUMIDOR: FaqItem[] = [
  { q: "O serviço garante a retirada do meu nome dos cadastros de crédito?", a: "Não. Nenhum serviço sério pode garantir isso. Fazemos uma análise administrativa dos registros informados e, quando há indício de irregularidade (por exemplo, falta de notificação prévia, dívida já paga, valor divergente ou prazo superior a 5 anos), elaboramos e acompanhamos a contestação nos canais adequados. Dívidas legítimas continuam devidas." },
  { q: "O meu score vai aumentar?", a: "Não prometemos aumento de score. A pontuação é calculada por cada birô de crédito com critérios próprios. A correção de informações incorretas pode refletir na pontuação, mas isso não depende de nós." },
  { q: "Posso contestar um registro sozinho, sem pagar nada?", a: "Sim. Você pode consultar seu CPF gratuitamente nos birôs de crédito e no Registrato do Banco Central, contestar diretamente com o credor ou o birô, e registrar reclamação no Procon ou na plataforma pública consumidor.gov.br. Nosso serviço é opcional e oferece organização, análise e acompanhamento." },
  { q: "Quanto tempo um registro pode ficar ativo?", a: "Pelo Código de Defesa do Consumidor (art. 43, §1º), informações negativas não podem permanecer nos cadastros por mais de 5 anos. Após a quitação, o credor deve solicitar a exclusão do registro no prazo de 5 dias úteis, conforme entendimento do Superior Tribunal de Justiça (Súmula 548)." },
  { q: "Quais as formas de pagamento?", a: "R$ 299,90 à vista via Pix ou R$ 390,00 parcelado em até 12 vezes, conforme as condições informadas na contratação. O pagamento só é solicitado após a confirmação da solicitação, pelos canais oficiais do portal." },
];

export const FAQ_CNPJ: FaqItem[] = [
  { q: "Abrir MEI é gratuito?", a: "Sim. A formalização como Microempreendedor Individual pelos canais oficiais do governo é gratuita. O valor de R$ 199,00 cobrado pelo Portal Consumidor refere-se exclusivamente ao serviço privado de assistência, organização das informações e acompanhamento — não é taxa governamental." },
  { q: "O que está incluído na assistência?", a: "Orientação sobre enquadramento (MEI ou outro porte), apoio na escolha das atividades, conferência das informações, acompanhamento do processo de formalização e orientações iniciais sobre obrigações mensais e anuais." },
  { q: "Vocês garantem que minha atividade pode ser MEI?", a: "Não. Nem toda atividade é permitida para MEI e existem limites de faturamento e outras condições previstas em lei. Analisamos as informações e orientamos sobre o enquadramento mais adequado." },
  { q: "Quanto tempo leva?", a: "Depende da análise das informações, do enquadramento e dos órgãos envolvidos. Após o envio, você acompanha cada etapa pelo protocolo." },
];

export const FAQ_EMPRESTIMO: FaqItem[] = [
  { q: "A aprovação é garantida?", a: "Não. Toda solicitação passa por análise de crédito e elegibilidade. Possuir restrições cadastrais não impede a solicitação, mas pode influenciar o resultado da análise e as condições oferecidas." },
  { q: "Preciso pagar algo para liberar o empréstimo?", a: "Não. Nunca cobramos valores antecipados para liberar crédito. Esse tipo de cobrança é uma prática comum de golpes. Se alguém pedir depósito antecipado em nosso nome, não pague." },
  { q: "Quais informações recebo antes de contratar?", a: "Antes da contratação, você recebe o valor liberado, número e valor das parcelas, taxa de juros, Custo Efetivo Total (CET), encargos, datas de vencimento e as consequências do atraso, conforme o Código de Defesa do Consumidor." },
  { q: "O que acontece se eu atrasar uma parcela?", a: "O atraso pode gerar juros de mora, multa (limitada a 2% do valor da prestação, conforme o CDC), cobrança dos valores devidos e, após notificação prévia, a inclusão do CPF em cadastros de proteção ao crédito. As condições exatas constam do contrato." },
  { q: "Posso desistir após contratar?", a: "Contratos firmados fora do estabelecimento comercial, como os digitais, permitem o direito de arrependimento em até 7 dias (art. 49 do CDC), com devolução dos valores recebidos conforme as regras do contrato." },
];

export const FAQ_LVB: FaqItem[] = [
  { q: "A LVB é um programa do governo?", a: "Não. A LVB é uma operação privada de locação de veículos. Não se trata de programa governamental, subsídio público ou veículo arrendado pelo governo." },
  { q: "Os carros do catálogo estão disponíveis agora?", a: "As fotos e modelos são ilustrativos de categorias. A disponibilidade real de cada veículo é confirmada após a análise da sua solicitação. Os modelos indicados podem ser substituídos por similares da mesma categoria." },
  { q: "O que preciso para alugar?", a: "Ter 21 anos ou mais (podendo variar conforme o plano), CNH válida — preferencialmente com a observação EAR (Exerce Atividade Remunerada) —, comprovante de endereço e passar pela análise cadastral. A documentação exata é informada durante a análise." },
  { q: "Manutenção, seguro e IPVA estão incluídos?", a: "Isso depende do plano. As coberturas e serviços incluídos são apresentados de forma clara na proposta, antes da contratação. Não presuma que um item está incluído sem que ele conste da proposta." },
  { q: "Como funciona o pagamento?", a: "A primeira parcela é paga no ato da contratação. As demais são cobradas de forma recorrente na data escolhida, mediante sua autorização e conforme o contrato." },
  { q: "Posso usar o carro na Uber e na 99?", a: "A elegibilidade do veículo para cada plataforma depende das regras da própria plataforma (ano, modelo, categoria e cidade). Confira as exigências da plataforma antes de escolher a categoria." },
  { q: "Existe limite de quilometragem?", a: "Cada plano possui uma franquia mensal de quilometragem, informada no catálogo e na proposta. Quilômetros excedentes podem ser cobrados conforme o contrato." },
];
