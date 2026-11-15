"""Monta a linha do tempo do episódio a partir do roteiro JSON e da duração real das falas gravadas.
Gera <saida>.js com D, SCENES, LINES, PAUSES, A (âncoras) e LS (início das falas por cena), e <saida>.json para a mixagem.
Uso: python3 FERRAMENTAS/montar_linha_do_tempo.py <roteiro.json> <pasta_falas> <prefixo> <saida_sem_extensao>"""
import json, subprocess, sys, os
rot, pasta, pref, out = sys.argv[1:5]
R = json.load(open(rot, encoding='utf-8'))
dur = lambda f: float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))
t = 0.0; n = 0; SC = []; LN = []; PZ = []; A = {}; LS = {}; MIX = []
for c in R['cenas']:
    a = t; A[c['id']] = {}; LS[c['id']] = []
    if 'fixo' in c: t += c['fixo']
    for it in c['itens']:
        k = it[0]
        if k == 'gap': t += it[1]
        elif k == 'P': PZ.append([round(t, 2), round(t + it[1], 2)]); t += it[1]
        elif k == 'A': A[c['id']][it[1]] = round(t, 2)
        elif k == 'L':
            n += 1; who, txt = it[1], it[2]
            fs = [f"{pref}_L{n:02d}_{who}.mp3"] if who != 'TODOS' else sorted(x for x in os.listdir(pasta) if x.startswith(f"{pref}_L{n:02d}_TODOS_"))
            fs = [x for x in fs if os.path.exists(os.path.join(pasta, x))]
            if fs:
                d = max(dur(os.path.join(pasta, x)) for x in fs) - 0.12
                for x in fs: MIX.append({'arquivo': x, 'inicio': round(t, 2), 'fim': round(t + d, 2), 'personagem': who if who != 'TODOS' else x.split('_TODOS_')[1][:-4], 'fala': txt, 'tempo': 1.0})
            else: d = it[3]
            LN.append([round(t, 2), round(t + d, 2), who, txt]); LS[c['id']].append(round(t, 2)); t += d
    SC.append([c['id'], round(a, 2), round(t, 2)])
D = round(t, 2)
js = f"const D={D};\nconst SCENES={json.dumps(SC)};\nconst LINES={json.dumps(LN, ensure_ascii=False)};\nconst PAUSES={json.dumps(PZ)};\nconst A={json.dumps(A)};\nconst LS={json.dumps(LS)};\n"
open(out + '.js', 'w', encoding='utf-8').write(js)
json.dump(MIX, open(os.path.join(pasta, 'falas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(js)
