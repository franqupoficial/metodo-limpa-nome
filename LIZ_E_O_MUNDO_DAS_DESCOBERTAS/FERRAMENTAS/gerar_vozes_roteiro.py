"""Gera as falas (Liz, Lumi) a partir de um roteiro JSON, com vozes neurais (edge-tts) — PRÉVIA de dublagem.
Uso: python3 FERRAMENTAS/gerar_vozes_roteiro.py <roteiro.json> <pasta_saida> <prefixo> [proxy]"""
import asyncio, json, os, sys, edge_tts
rot, out, pref = sys.argv[1:4]; proxy = sys.argv[4] if len(sys.argv) > 4 else None
ELENCO = {'LIZ': ('pt-BR-ThalitaMultilingualNeural', '+38Hz', '+4%'), 'LUMI': ('pt-BR-FranciscaNeural', '+22Hz', '-6%'),
          'MAE': ('pt-BR-FranciscaNeural', '+0Hz', '+0%'), 'PAI': ('pt-BR-AntonioNeural', '-2Hz', '+0%'),
          'VOVO': ('pt-BR-ThalitaMultilingualNeural', '-10Hz', '-12%')}
CORO = ['LIZ', 'MAE', 'PAI', 'VOVO']   # 'TODOS': a família fala junta
async def main():
  os.makedirs(out, exist_ok=True); n = 0
  for c in json.load(open(rot, encoding='utf-8'))['cenas']:
    for it in c['itens']:
      if it[0] != 'L': continue
      n += 1
      quem = CORO if it[1] == 'TODOS' else [it[1]]
      for q in quem:
        if q not in ELENCO: continue
        voz, tom, vel = ELENCO[q]
        nome = f"{pref}_L{n:02d}_{it[1]}.mp3" if it[1] != 'TODOS' else f"{pref}_L{n:02d}_TODOS_{q}.mp3"
        alvo = os.path.join(out, nome)
        for tentativa in range(5):
          if os.path.exists(alvo) and os.path.getsize(alvo) > 0: break
          try: await edge_tts.Communicate(it[2], voz, pitch=tom, rate=vel, proxy=proxy).save(alvo)
          except Exception as e:
            print('  nova tentativa', nome, type(e).__name__); await asyncio.sleep(2 + tentativa * 2)
            if os.path.exists(alvo) and os.path.getsize(alvo) == 0: os.remove(alvo)
        print(nome, it[2])
asyncio.run(main())
