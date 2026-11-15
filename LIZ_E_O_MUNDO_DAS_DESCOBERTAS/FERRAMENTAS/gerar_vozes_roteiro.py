"""Gera as falas (Liz, Lumi) a partir de um roteiro JSON, com vozes neurais (edge-tts) — PRÉVIA de dublagem.
Uso: python3 FERRAMENTAS/gerar_vozes_roteiro.py <roteiro.json> <pasta_saida> <prefixo> [proxy]"""
import asyncio, json, os, sys, edge_tts
rot, out, pref = sys.argv[1:4]; proxy = sys.argv[4] if len(sys.argv) > 4 else None
ELENCO = {'LIZ': ('pt-BR-ThalitaMultilingualNeural', '+38Hz', '+4%'), 'LUMI': ('pt-BR-FranciscaNeural', '+22Hz', '-6%')}
async def main():
  os.makedirs(out, exist_ok=True); n = 0
  for c in json.load(open(rot, encoding='utf-8'))['cenas']:
    for it in c['itens']:
      if it[0] != 'L': continue
      n += 1
      if it[1] not in ELENCO: continue
      voz, tom, vel = ELENCO[it[1]]; nome = f"{pref}_L{n:02d}_{it[1]}.mp3"
      if not os.path.exists(os.path.join(out, nome)):
        await edge_tts.Communicate(it[2], voz, pitch=tom, rate=vel, proxy=proxy).save(os.path.join(out, nome))
      print(nome, it[2])
asyncio.run(main())
