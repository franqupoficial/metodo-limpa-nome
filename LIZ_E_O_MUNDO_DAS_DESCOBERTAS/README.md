# LIZ E O MUNDO DAS DESCOBERTAS

> *Aprender também é uma aventura!*
> Série infantil interativa para YouTube (2 a 6 anos). Temporada 1, Episódio 01: **A Porta Mágica das Cores**.

## O que foi produzido (e funciona)

| Pasta | Entregas |
|---|---|
| `PERSONAGENS/` | **Biblioteca oficial dos personagens** (`personagens.js`): Liz, Pipo, Lumi e Robi desenhados em vetor, com parâmetros de expressão, pose, piscar, fala e pulo. **Ficha da Liz** (frente, lateral, costas, 7 expressões, 6 poses, paleta) e **ficha dos amigos** em PNG. **Bíblia dos personagens** com regras de consistência e prompts para a versão 3D. |
| `CENARIOS/` | 4 cenários de referência (floresta, porta azul, mundo sem cores, mundo colorido) + regras e prompts 3D. |
| `EPISODIO_01/` | **Episódio animado completo (2:22)**: **`Liz_Ep01_A_Porta_Magica_das_Cores_COM_VOZES.mp4`** (com prévia de dublagem: Liz, Lumi e Robi falando) e `Liz_Ep01_A_Porta_Magica_das_Cores.mp4` (sem vozes, para mixar com a dublagem definitiva) (1920×1080, 30 fps), com animação real cena a cena, câmera, trilha, efeitos sonoros, **6 pausas interativas** e legendas. Também: legendas `.srt`, trilha sem voz `.wav`, o episódio interativo `episodio01.html` (abre no navegador, com linha do tempo) e o **roteiro técnico cena a cena** (`ROTEIRO_EP01.md`). |
| `AUDIO/` | Guia de **vozes e dublagem**: elenco, direção de cada fala e **tabela de sincronia com tempo exato** (35 falas). |
| `MUSICAS/` | Tema original **"Vem com a Liz"** (letra, melodia nota a nota, harmonia) e as versões sintetizadas da abertura, da festa e do encerramento em `.wav`. |
| `IDENTIDADE_VISUAL/` | Logotipo (vetor + PNG transparente), paleta, tipografia, elementos recorrentes, modelo de episódio e de miniatura. Arte-chave 3D do cliente guardada como referência. |
| `YOUTUBE/` | **Banner** 2560×1440, **foto de perfil** 800×800, **miniatura do Ep. 01** 1280×720, título otimizado, descrição com capítulos, palavras-chave e as **regras de conteúdo infantil** (COPPA, LGPD, Conanda). |
| `PROXIMOS_EPISODIOS/` | Temporada 1 estruturada: episódios 02 a 08 com tema, portal, problema, missão, interações, desafio em casa e ganchos. |
| `FERRAMENTAS/` | Renderizador do episódio (MP4 + SRT + WAV), gerador de PNG das peças e capturador de quadros. |

## O que NÃO foi possível fazer neste ambiente (com honestidade)

1. **Animação 3D cinematográfica (padrão Pixar).** Aqui não há motor 3D (Blender, Unreal) nem gerador de vídeo por IA (Veo, Sora, Runway, Kling). O episódio foi animado em **2D vetorial**, no estilo da série, com movimento real (andar, pular, acenar, piscar, boca falando, câmera com zoom e travelling, efeitos de luz). Para a versão 3D, os prompts e as referências estão prontos em `PERSONAGENS/BIBLIA_PERSONAGENS.md` e `CENARIOS/CENARIOS.md`.
2. **Vozes definitivas.** O vídeo `_COM_VOZES` usa vozes neurais sintéticas (edge-tts) como **prévia**: o serviço não oferece licença comercial. Antes de monetizar, troque por dublagem profissional ou por vozes licenciadas e mixe com `FERRAMENTAS/mixar_vozes.py`. `AUDIO/VOZES_E_DUBLAGEM.md` traz o tempo exato e a direção de cada uma das 35 falas para gravar e mixar sobre `EPISODIO_01/..._trilha.wav`.
3. **Publicação no YouTube.** Os textos e as imagens estão prontos, mas o upload e as configurações do canal precisam ser feitos por você no YouTube Studio.

## Próximos passos recomendados
1. **Gravar as vozes** (Liz, Lumi, Robi) com o guia de dublagem e mixar sobre a trilha. É o passo que mais aumenta a qualidade do episódio 01.
2. Publicar o Ep. 01 marcado como **"Conteúdo para crianças"**, com a miniatura, o título, a descrição e o `.srt` desta pasta.
3. Produzir os episódios 02 a 08 reaproveitando o motor do episódio 01 (ver `PROXIMOS_EPISODIOS/TEMPORADA_1.md`).
4. (Opcional) Versão 3D: gerar imagens-chave aprovadas de cada cena com a arte de referência e animá-las numa ferramenta de imagem-para-vídeo, usando este episódio 2D como **animatic** (tempos, enquadramentos e falas já resolvidos).

## Como assistir e regerar
- Assistir com som: abrir `EPISODIO_01/episodio01.html` no navegador e clicar em **Assistir**. A barra de espaço pausa.
- Regerar o vídeo (requer Node + Playwright + ffmpeg):
  ```bash
  cd LIZ_E_O_MUNDO_DAS_DESCOBERTAS
  node FERRAMENTAS/render_episodio.cjs EPISODIO_01/episodio01.html EPISODIO_01/Liz_Ep01_A_Porta_Magica_das_Cores.mp4
  ```
- Regerar as peças do YouTube: `node FERRAMENTAS/snapshot.cjs YOUTUBE/pecas.html 1280 720 YOUTUBE/miniatura_ep01_1280x720.png peca=miniatura`

## Originalidade e direitos
Personagens, cenários, logotipo, música, letra e efeitos sonoros foram criados para este projeto e não copiam personagens ou identidades protegidas. A fonte Fredoka tem licença aberta (OFL). Recomenda-se registrar a marca no INPI e a música em nome do titular do canal.
