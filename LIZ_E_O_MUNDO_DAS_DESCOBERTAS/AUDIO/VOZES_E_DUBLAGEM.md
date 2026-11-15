# Vozes e dublagem — Episódio 01

> **Situação atual:** o vídeo renderizado já tem **trilha, efeitos sonoros e legendas**, e a boca dos personagens já se mexe nos tempos exatos de cada fala. **Ainda faltam as vozes gravadas**: este ambiente não tem síntese de voz infantil natural, e eu não quis colocar uma voz robótica na Liz. Este guia leva a gravação direto para a mixagem final.

## 1. Elenco de vozes

| Personagem | Voz | Referência de interpretação |
|---|---|---|
| **Liz** | Feminina infantil (5 a 6 anos), doce, alegre e carismática. Pode ser uma dubladora adulta especializada em voz infantil (mais controle e segurança jurídica) ou uma criança, com autorização dos responsáveis. | Fala **com** a criança, não **para** ela. Sorriso na voz. Perguntas com entonação subindo e espera de verdade. Comemora com energia, sem gritar. |
| **Lumi** | Feminina, suave, "aérea", um pouco sussurrada. | Fada gentil. Leve eco/reverb na pós. |
| **Robi** | Masculina ou neutra, divertida, articulada. | Leve efeito eletrônico na pós (vocoder suave, *pitch* +2, bitcrush leve). Os "bip-bop" podem ser falados ou usar os efeitos já presentes na trilha. |
| **Pipo** | Sons de cachorro filhote. | Os latidos já estão sintetizados na trilha. Para mais realismo, gravar um dublador fazendo latidos fofos ou usar banco de sons livre de direitos (CC0). |

### Opções para gerar as vozes
1. **Estúdio de dublagem (recomendado para a marca):** contrato com cessão de direitos de voz para YouTube e produtos derivados.
2. **Síntese de voz com licença comercial** (ElevenLabs, Azure Neural TTS, Google Cloud TTS etc.): escolher uma voz pt-BR infantil/jovem, ajustar velocidade para ~0,9× e conferir se a licença permite uso comercial em conteúdo infantil. **Nunca clonar a voz de uma pessoa real sem autorização por escrito.**
3. Se a voz da Liz for de uma criança real: autorização dos pais, contrato e cuidado com a exposição da criança.

## 2. Especificação técnica da gravação
- WAV 48 kHz / 24 bit, mono, ambiente tratado, microfone condensador a ~20 cm, com *pop filter*.
- Gravar **cada fala em arquivo separado**, nomeado pelo código abaixo (ex.: `EP01_L04_LIZ.wav`).
- Gravar 3 takes por fala. Deixar 0,5 s de silêncio antes e depois.
- Mixagem final: voz em −16 LUFS integrado no episódio (padrão YouTube ≈ −14 LUFS), trilha −6 a −10 dB abaixo da voz (*ducking*).
- A trilha sem voz está em `EPISODIO_01/Liz_Ep01_A_Porta_Magica_das_Cores_trilha.wav`. Basta posicionar cada fala no tempo indicado.

## 3. Falas com tempo exato (para sincronizar com a animação)

O tempo de **entrada** é quando a boca do personagem começa a mexer. A fala deve caber até o tempo de **saída**.

| Código | Entrada | Saída | Personagem | Fala | Direção |
|---|---|---|---|---|---|
| L01 | 0:16,6 | 0:19,6 | LIZ | Oi, amiguinho! Eu sou a Liz! | Acenando, muito feliz em conhecer. |
| L02 | 0:19,8 | 0:21,2 | LIZ | E esse é o Pipo! | Orgulhosa, apresentando o melhor amigo. |
| L03 | 0:21,3 | 0:22,3 | PIPO | Au, au! | Filhote animado. |
| L04 | 0:22,5 | 0:25,5 | LIZ | Hoje vai ter aventura! Você vem comigo? | Convite. Pergunta subindo no final. |
| — | 0:25,6 | 0:28,1 | — | *(pausa: criança responde)* | Silêncio de voz. |
| L05 | 0:28,2 | 0:29,8 | LIZ | Ebaaa! Então vamos! | Reação genuína, como se tivesse ouvido "sim!". |
| L06 | 0:30,8 | 0:33,4 | LIZ | Olha, Pipo! Uma porta azul! | Descoberta, encantamento. |
| L07 | 0:33,6 | 0:36,2 | LIZ | Vamos contar juntos até três pra abrir? | Convidando a criança. |
| L08 | 0:36,4 | 0:37,2 | LIZ | Um… | Pausado, para a criança acompanhar. |
| L09 | 0:38,0 | 0:38,8 | LIZ | Dois… | |
| L10 | 0:39,6 | 0:40,4 | LIZ | Três! | Ápice, porta abrindo. |
| L11 | 0:44,6 | 0:46,8 | LIZ | Ué… cadê as cores? | Surpresa, um pouco preocupada. |
| L12 | 0:47,4 | 0:51,6 | LUMI | Olá, Liz! Eu sou a Lumi. As cores do nosso mundo sumiram! | Doce, depois triste no fim. |
| L13 | 0:51,8 | 0:55,0 | LIZ | Oh, não! Amiguinhos, vocês conseguem me ajudar? | Pedido sincero, olhando para a câmera. |
| — | 0:55,1 | 0:58,1 | — | *(pausa)* | |
| L14 | 0:58,2 | 0:59,8 | LIZ | Oba! Eu sabia! | Gratidão e alegria. |
| L15 | 1:00,6 | 1:02,4 | ROBI | Bip-bop! Eu sou o Robi! | Entrada divertida. |
| L16 | 1:02,6 | 1:06,8 | ROBI | Para a magia voltar, precisamos encontrar três cores! | Explicando a missão, claro e pausado. |
| L17 | 1:07,0 | 1:09,6 | LIZ | Três cores! Vamos procurar! | Animada, aceitando o desafio. |
| L18 | 1:10,6 | 1:12,6 | LUMI | Olhem ali: uma maçã! | Apontando, sussurro animado. |
| L19 | 1:12,8 | 1:15,6 | LIZ | Que cor será essa maçã? | Pergunta curiosa para a câmera. |
| — | 1:15,7 | 1:18,7 | — | *(pausa)* | |
| L20 | 1:18,8 | 1:21,0 | LIZ | Vermelho! Muito bem! | **Ênfase em "Vermelho"**, comemorando. |
| L21 | 1:21,2 | 1:23,0 | ROBI | Primeira cor: encontrada! | Robótico e alegre. |
| L22 | 1:23,2 | 1:24,2 | PIPO | Au! | |
| L23 | 1:26,6 | 1:29,4 | LIZ | E essa florzinha? Que cor ela é? | Carinhosa com a flor. |
| — | 1:29,5 | 1:32,5 | — | *(pausa)* | |
| L24 | 1:32,6 | 1:34,8 | LIZ | Amarelo! Você é demais! | **Ênfase em "Amarelo"**. |
| L25 | 1:35,0 | 1:37,0 | ROBI | Segunda cor: encontrada! | |
| L26 | 1:37,2 | 1:39,6 | LIZ | Falta só uma! | Suspense gostoso. |
| L27 | 1:40,6 | 1:43,6 | LIZ | E o lago? Qual é a cor da água? | |
| — | 1:43,7 | 1:46,7 | — | *(pausa)* | |
| L28 | 1:46,8 | 1:49,0 | LIZ | Azul! Conseguimos! | **Ênfase em "Azul"**, vitória. |
| L29 | 1:49,2 | 1:52,6 | LUMI | As três cores voltaram! Agora, a magia! | Crescendo mágico. |
| L30 | 1:57,4 | 2:01,4 | LIZ | As cores voltaram! Obrigada, amiguinho! Você me ajudou muito! | Gratidão de verdade, sorrindo. |
| L31 | 2:01,6 | 2:05,6 | LIZ | Agora, um desafio: procure uma coisa azul aí na sua casa! | Close, cúmplice, como um segredo. |
| — | 2:05,7 | 2:09,7 | — | *(pausa, 4 s)* | |
| L32 | 2:09,8 | 2:11,8 | LIZ | Achou? Que demais! | |
| L33 | 2:12,6 | 2:15,8 | LIZ | Até a próxima aventura! Tchau, tchau! | Despedida calorosa, acenando. |
| L34 | 2:16,0 | 2:17,0 | PIPO | Au, au! | |
| L35 | 2:17,0 | 2:17,8 | ROBI | Bip! | |

## 4. Efeitos sonoros já presentes na trilha (sintetizados, originais, sem direitos de terceiros)
Bola quicando · latidos do Pipo · bips do Robi · harpa e brilhos da Lumi · rangido da porta · sinos da contagem · vinheta de acerto (sinos subindo) · *pops* de interface · *whoosh* de transição · tique-taque suave das pausas · cornetinha e confete da festa.
