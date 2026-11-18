#!/usr/bin/env python3
"""Beat grid for a music track → prints tempo and beat times, so chapter starts / big hits land on beats.
usage: python3 beats.py track.wav [--json beats.json]      (pip install librosa --break-system-packages)"""
import sys, json, librosa, numpy as np
y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
tempo, frames = librosa.beat.beat_track(y=y, sr=sr)
beats = librosa.frames_to_time(frames, sr=sr).round(3).tolist()
onsets = librosa.onset.onset_detect(y=y, sr=sr, units='time').round(3).tolist()
tempo = float(np.atleast_1d(tempo)[0])
print(f'tempo {tempo:.1f} bpm, beat {60/tempo:.3f}s, {len(beats)} beats, duration {len(y)/sr:.2f}s')
print('beats:', ' '.join(f'{b:.2f}' for b in beats[:64]), '…' if len(beats) > 64 else '')
if '--json' in sys.argv:
    json.dump({'tempo': tempo, 'beats': beats, 'onsets': onsets}, open(sys.argv[sys.argv.index('--json') + 1], 'w'))
