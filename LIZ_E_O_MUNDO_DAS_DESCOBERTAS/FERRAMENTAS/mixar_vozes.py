"""Mixa as falas (AUDIO/falas) sobre a trilha do episódio, com 'ducking' da música, e gera o MP4 final.
Uso: python3 FERRAMENTAS/mixar_vozes.py <video_sem_voz.mp4> <trilha.wav> <html> <pasta_falas> <saida.mp4>"""
import json, re, subprocess, sys
video, trilha, html, pasta, saida = sys.argv[1:6]
src = open(html, encoding='utf-8').read()
bloco = src[src.index('const LINES=['):src.index('];', src.index('const LINES=['))]
L = re.findall(r"\[([\d.]+),([\d.]+),'(\w+)','([^']+)'\]", bloco)
meta = json.load(open(f'{pasta}/falas.json', encoding='utf-8'))
FX = {'LIZ': 'highpass=f=90,equalizer=f=3000:t=q:w=1:g=2',
      'LUMI': 'highpass=f=120,aecho=0.8:0.6:70|140:0.22|0.12',
      'ROBI': 'highpass=f=100,flanger=delay=2:depth=2:speed=0.6,aecho=0.8:0.5:14:0.35,acrusher=bits=12:mix=0.15'}
ins, fil, labs = ['-i', video, '-i', trilha], [], []
n = 2
for m in meta:
    i = int(re.search(r'_L(\d+)_', m['arquivo']).group(1))
    a, b, who, _ = L[i - 1]; a, b = float(a), float(b)
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f"{pasta}/{m['arquivo']}"]))
    tp = m.get('tempo') or min(1.18, max(1.0, dur / ((b - a) + 0.25)))
    ins += ['-i', f"{pasta}/{m['arquivo']}"]
    fil.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,atempo={tp:.3f},{FX[who]},loudnorm=I=-16:TP=-2,adelay={int(a*1000)}|{int(a*1000)}[v{n}]")
    labs.append(f"[v{n}]"); n += 1
fil.append(f"{''.join(labs)}amix=inputs={len(labs)}:normalize=0,apad=whole_dur=142[voz]")
fil.append("[voz]asplit=2[voz1][voz2]")
fil.append("[1:a]volume=1.3[mus]")
fil.append("[mus][voz1]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=400[duck]")
fil.append("[duck][voz2]amix=inputs=2:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=11[a]")
cmd = ['ffmpeg', '-y', '-v', 'error'] + ins + ['-filter_complex', ';'.join(fil), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', saida]
subprocess.check_call(cmd); print('ok →', saida)
