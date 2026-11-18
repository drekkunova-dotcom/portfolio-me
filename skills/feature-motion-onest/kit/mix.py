#!/usr/bin/env python3
"""Склейка кусков 4K + звук (музыка + SFX по меткам) + 1080p-версия из 4K.
usage: python3 kit/mix.py out/ cues.json music.wav sfx/ NAME [--music-gain 0.6]
cues.json — пишет render.cjs рядом с любым рендером (<out>.cues.json); возьми его с полного прохода (превью или 1080p)."""
import json, subprocess, glob, sys
d, cues_f, music, sfx, name = sys.argv[1:6]
mg = float(sys.argv[sys.argv.index('--music-gain')+1]) if '--music-gain' in sys.argv else 0.6
segs = sorted(glob.glob(f'{d}/s4k_*.mp4'))
open(f'{d}/concat.txt', 'w').write(''.join(f"file '{s.split('/')[-1]}'\n" for s in segs))
run = lambda *a: subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
run('-f', 'concat', '-safe', '0', '-i', f'{d}/concat.txt', '-c', 'copy', f'{d}/v4k_video.mp4')
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{d}/v4k_video.mp4']))
cues = json.load(open(cues_f))
inp = ['-i', f'{d}/v4k_video.mp4', '-i', music]; parts = [f'[1:a]volume={mg}[m]']; labs = ['[m]']
for k, c in enumerate(cues):
    n = k+2; ms = round(c['at']*1000); inp += ['-i', f"{sfx}/{c['name']}.wav"]
    parts.append(f"[{n}:a]adelay={ms}|{ms},volume={c['gain']}[s{n}]"); labs.append(f'[s{n}]')
fc = ';'.join(parts)+f";{''.join(labs)}amix=inputs={len(labs)}:normalize=0:duration=longest,alimiter=limit=0.95,apad,atrim=0:{dur:.3f}[a]"
run(*inp, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-t', f'{dur:.3f}', '-movflags', '+faststart', f'{d}/{name}_4K.mp4')
run('-i', f'{d}/{name}_4K.mp4', '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', f'{d}/{name}_1080p.mp4')
print('→', f'{d}/{name}_4K.mp4', f'{d}/{name}_1080p.mp4', f'{dur:.2f}s')
