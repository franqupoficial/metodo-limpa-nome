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
  { q: "O que a regularização de apontamentos faz, na prática?", a: "Levantamos todos os apontamentos do seu CPF no Serasa, SPC e Boa Vista, verificamos cada registro e executamos os procedimentos: contestação formal e pedido de exclusão dos registros irregulares, acordo com o credor para as dívidas reconhecidas e reclamações em Procon e consumidor.gov.br quando necessário. Tudo fica registrado no acompanhamento do seu protocolo." },
  { q: "Quais registros podem ser excluídos?", a: "Registros incluídos sem a comunicação prévia exigida pelo art. 43, §2º, do CDC, com mais de 5 anos, de dívidas já pagas, com valor divergente, duplicados ou originados de cobrança indevida. Para esses, pedimos a exclusão com a fundamentação legal de cada caso." },
  { q: "E as dívidas que eu reconheço?", a: "Dívidas legítimas continuam devidas. Para elas, intermediamos um acordo com o credor. Após o pagamento, o credor é obrigado a pedir a baixa do registro em até 5 dias úteis (Súmula 548 do STJ). O valor do acordo é pago diretamente ao credor e não está incluído no preço do serviço." },
  { q: "Meu score vai aumentar?", a: "O score é calculado por cada birô com critérios próprios. A retirada de registros irregulares e a quitação de dívidas costumam refletir na pontuação, mas o cálculo não é controlado por nós." },
  { q: "Quanto custa e como pago?", a: "R$ 299,90 à vista via Pix. O QR Code e o Pix copia e cola aparecem ao final do formulário e também na página de acompanhamento." },
  { q: "Posso fazer isso sozinho, sem pagar?", a: "Sim. A consulta e a contestação podem ser feitas gratuitamente nos birôs, com o credor, no Procon ou em consumidor.gov.br. Nosso serviço executa todo o processo por você, nos três birôs, com acompanhamento." },
];

export const FAQ_CNPJ: FaqItem[] = [
  { q: "O que está incluído no serviço de R$ 199,00?", a: "Definição do enquadramento (MEI, ME ou EPP), escolha das atividades (CNAE), conferência de endereço e forma de atuação, condução do registro com você até a emissão do CNPJ e orientações sobre as obrigações mensais e anuais." },
  { q: "Abrir MEI é gratuito?", a: "Sim. A formalização como MEI pelos canais oficiais do governo é gratuita. O valor de R$ 199,00 remunera exclusivamente o serviço privado de assistência e condução da abertura — não é taxa governamental." },
  { q: "Toda atividade pode ser MEI?", a: "Não. Existem atividades permitidas, limite de faturamento e outras condições previstas em lei. Se sua atividade não puder ser MEI, indicamos o enquadramento correto." },
  { q: "Quanto tempo leva?", a: "Com as informações completas e o pagamento confirmado, iniciamos a abertura imediatamente. O prazo final depende dos órgãos de registro do seu município e estado; você acompanha cada etapa pelo protocolo." },
];

export const FAQ_EMPRESTIMO: FaqItem[] = [
  { q: "Negativado pode contratar?", a: "Sim. O produto é voltado a quem tem restrições no CPF. A proposta passa pela aprovação de crédito da instituição concedente, que define o valor aprovado e as condições." },
  { q: "Qual o valor máximo?", a: "Até R$ 3.000,00. Você escolhe o valor desejado no cadastro; o valor aprovado consta das condições enviadas a você." },
  { q: "Como pago as parcelas?", a: "Antes de cada vencimento, você recebe por e-mail o Pix ou o boleto da parcela, conforme escolheu no cadastro, sempre em nome de Portal Consumidor." },
  { q: "Quando recebo o contrato?", a: "Aceitas as condições, o contrato é enviado ao seu e-mail em até 24 horas, conforme o fluxo operacional." },
  { q: "Quando o dinheiro é liberado?", a: "Após a assinatura do contrato. Solicitação, aprovação e liberação são etapas diferentes." },
  { q: "Preciso pagar algo para liberar o empréstimo?", a: "Não. Nunca cobramos valores antecipados para liberar crédito. Se alguém pedir depósito antecipado em nosso nome, não pague." },
  { q: "O que acontece se eu atrasar?", a: "Podem incidir juros de mora, multa (limitada a 2% da parcela, conforme o CDC), cobrança dos valores devidos e, após notificação prévia, inclusão em cadastros de crédito. As condições exatas constam do contrato." },
];

export const FAQ_LVB: FaqItem[] = [
  { q: "A LVB é um programa do governo?", a: "Não. A LVB é uma operação privada de locação de veículos, sem relação com programas governamentais, subsídios públicos ou veículos arrendados pelo governo." },
  { q: "Quais planos estão disponíveis?", a: "Planos de 12, 24 ou 36 meses, com valor mensal fixo no contrato. A primeira parcela é paga via Pix ao concluir o formulário e as demais chegam ao seu e-mail (Pix ou boleto) antes do dia que você escolher." },
  { q: "O que preciso para alugar?", a: "CNH válida (com a observação EAR quando exigida pela plataforma ou pelo plano), comprovante de endereço, dados pessoais e aprovação cadastral. O formulário de locação reúne tudo isso." },
  { q: "O carro da foto é o que vou receber?", a: "As fotos ilustram cada categoria. O veículo do seu contrato — o modelo indicado ou similar da mesma categoria — é confirmado na contratação." },
  { q: "Manutenção, seguro e IPVA estão incluídos?", a: "Depende do plano. O que está incluído aparece no simulador e consta do contrato." },
  { q: "Posso usar o carro na Uber e na 99?", a: "Sim, a locação é voltada a motoristas de aplicativo. Confira as exigências de ano e modelo da plataforma na sua cidade ao escolher a categoria." },
  { q: "Existe limite de quilometragem?", a: "Cada plano tem uma franquia mensal de quilometragem, informada no catálogo e no contrato. Quilômetros excedentes são cobrados conforme o contrato." },
  { q: "Como é a retirada?", a: "Com o contrato assinado e a primeira parcela paga, agendamos a retirada. Leve documento de identificação e a CNH original." },
];
