# Bíblia dos personagens

**Fonte única da aparência:** `personagens.js`. Todas as cenas, fichas e artes do canal são desenhadas por essas funções. Mudou lá, muda em tudo; não mudou lá, ninguém muda. É isso que garante que a Liz seja **idêntica em todas as cenas e em todos os episódios**.

| Arquivo | Conteúdo |
|---|---|
| `ficha_liz.png` / `.html` | Liz: frente, lateral, costas, 7 expressões, 6 poses e paleta |
| `ficha_amigos.png` / `.html` | Pipo, Lumi e Robi: pose padrão, variações e paleta |
| `../IDENTIDADE_VISUAL/arte_referencia_3D_key_art.png` | Arte-chave 3D enviada pelo cliente: referência de look para a futura versão 3D |

---

## LIZ
- **Idade aparente:** 5 anos. **Personalidade:** curiosa, inteligente, alegre, carinhosa, brincalhona e comunicativa.
- **Cabelo:** acobreado (#C8602A, brilho #E8894A), volumoso e cacheado, franja ondulada, **rabo alto à direita** preso por **laço rosa** (#FF4FA0).
- **Rosto:** olhos grandes **castanhos** (#7A4724) com 2 brilhos, cílios de 2 traços, bochechas rosadas com **3 sardinhas** de cada lado, nariz pequeno, brinquinho dourado.
- **Roupa oficial (não muda entre episódios):** camiseta rosa-clarinho (#FFF0F6) com mangas bufantes · **jardineira rosa** (#FF5AA5) com **florzinha branca de miolo amarelo** no peito e **2 botões dourados** · **mochila rosa** (#E8418A) · tênis brancos com faixa rosa · **pulseira rosa no pulso direito**.
- **Gestos-assinatura:**
  - aceno com a mão direita (saudação);
  - **mão na orelha + cabeça inclinada** (pausa de participação: "estou ouvindo você");
  - pulinho com os dois braços para cima (comemoração);
  - apontar para o objeto da pergunta.
- **Fala:** frases curtas, vocabulário simples, sempre olhando para a câmera quando fala com a criança. Chama a criança de "amiguinho(a)".

## PIPO
Cachorrinho filhote marrom-caramelo (#C9773A) com focinho, peito e faixa na testa creme (#FFF1DE), orelhas caídas marrom-escuras, olhos grandes e brilhantes, linguinha de fora, **coleira rosa com medalha dourada de patinha**. **Não fala**: late, funga e choraminga. Expressa emoção com o rabo (abanando = feliz), as orelhas (baixas = medo) e a cabeça inclinada (curiosidade).

## LUMI — a borboleta mágica
Asas em gradiente **rosa → lilás** (#FF7BC8 → #B667F2) com borda roxa e pontos amarelos e brancos, corpo pêssego listrado, rostinho redondo com olhos grandes, antenas com bolinhas rosa. Sempre deixa um **rastro de estrelinhas** (amarelo, rosa e lilás). Função na história: **guia**. Ela chega, revela o problema e aponta as pistas.

## ROBI — o robozinho
Corpo e cabeça arredondados **brancos** com detalhes **azuis** (#2D8CFF), **tela preta no rosto** com olhos de luz ciano (#5FE1FF), duas antenas com bolinhas azuis, **coração azul brilhante** no peito, mãos cinza-escuras. Expressões na tela: feliz (arcos), uau (círculos), piscadinha, pensando. Função na história: **apresenta e acompanha o desafio educativo** (painel de progresso, "encontrada!").

---

## Prompts para a versão 3D (Pixar-like), mantendo a consistência

Use **sempre** a arte-chave 3D (`arte_referencia_3D_key_art.png`) e as fichas como imagem de referência de personagem (*character reference* / *image prompt*) na ferramenta escolhida (Midjourney `--cref`, Kling/Runway/Veo com imagem de referência, Leonardo Character Reference etc.). Gere as cenas a partir de **imagens-chave aprovadas** (image-to-video) e nunca só de texto, para o rosto não variar.

**Liz (base):**
`Original 3D animated character, a cheerful 5-year-old girl with voluminous curly copper-red hair, wavy bangs, high ponytail on the right tied with a big pink satin bow, large expressive brown eyes, light freckles on rosy cheeks, small gold stud earrings, wearing a light pink t-shirt with puffy sleeves, pink denim overalls with a white daisy patch on the chest and gold buttons, a pink backpack, white sneakers with pink stripes, pink bracelet on right wrist. High-end feature animation style, soft cinematic lighting, subsurface scattering skin, expressive face, appealing proportions (large head). Original design, not based on any existing character.`

**Pipo:** `Original 3D cartoon puppy, small and fluffy, caramel brown fur with cream muzzle, chest and white forehead stripe, long floppy dark-brown ears, huge shiny brown eyes, tongue slightly out, pink collar with gold paw-print tag, playful and cute, feature animation quality.`

**Lumi:** `Original 3D magical butterfly character with a cute round peach face and big sparkling eyes, wings with pink to lilac gradient, purple outline and glowing yellow and white spots, curly antennae with pink tips, leaving a trail of tiny golden and pink sparkles, feature animation quality.`

**Robi:** `Original 3D small friendly robot, rounded white glossy body with blue accents, big rounded head with a black glass face screen showing glowing cyan happy arc eyes and smile, two antennae with blue light tips, glowing blue heart on the chest, dark grey hands, short blue feet, cute and approachable, feature animation quality.`

**Estilo geral (adicionar ao fim de todo prompt de cena):** `vibrant harmonious colors, cinematic warm lighting, rich detailed enchanted environment, 16:9, children's animated series, gentle camera movement, no text in image.`
