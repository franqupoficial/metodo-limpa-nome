# Relatório de migração — catálogo Luxer Joias

Origem: https://www.luxerjoias.com.br/ (plataforma LojaMestre) · gerado em 2026-11-24T16:56:30+0000

## Totais
| Item | Quantidade |
|---|---|
| URLs no sitemap | 5541 |
| Páginas de listagem percorridas (categorias + paginação) | 180 |
| Produtos únicos encontrados | 825 |
| Produtos importados | 825 |
| Produtos presentes só nas listagens (fora do sitemap) | 0 |
| Categorias / subcategorias | 9 / 40 |
| Fotografias originais baixadas | 1932 (falhas: 0) |
| Produtos sem fotografia | 0 |
| Produtos com variações (tamanho) | 825 |
| Produtos indisponíveis na origem | 31 |
| Produtos em promoção na origem | 0 |
| Páginas institucionais | 7 |

## Duplicidades
- Referências duplicadas: null (IDs [415, 472]) — o caso "null" são 2 produtos sem referência no nome.
- Nomes duplicados: 0.
- Cada produto aparece em várias URLs do sitemap (uma por subcategoria); foram consolidados por ID de origem, preservando todas as categorias.

## Informações incompletas na origem (122 produtos)
| Campo ausente | Produtos |
|---|---|
| material | 65 |
| weightG | 48 |
| description | 34 |
| pixPrice | 22 |
| specs | 8 |
| ref | 2 |

A lista completa (ID, referência e campos) está em `data/migration-report.json` → `incomplete`. Nada foi inventado: campos ausentes ficaram vazios para preenchimento no painel.

## Planilhas da plataforma anterior (importadas com `npm run legacy:import`)
- **Clientes (geral_cli)**: 404 cadastros — 386 com consentimento de e-mail, 385 com consentimento de SMS, 404 com data de nascimento, 383 CPFs válidos (criptografados). Não importados por minimização (LGPD): RG/IE, sexo, pontos de fidelidade. **O arquivo não traz histórico de compras.**
- **Estoque**: 5.483 SKUs com quantidade real em 825 produtos (controle de estoque ativado). 82 SKUs da planilha não existem no catálogo público (ex.: refs 20875, 25025) — provavelmente peças despublicadas. A coluna "Preco" da planilha (valores como 4,6) não corresponde aos preços de venda e foi ignorada; custo, EAN e preço riscado vieram vazios.

## Observações
- Estoque numérico: veio da planilha; o site público só informava disponibilidade.
- Páginas "Como Comprar" e "Formas de Pagamento" entraram como rascunho (citavam boleto e o fluxo da plataforma antiga).
