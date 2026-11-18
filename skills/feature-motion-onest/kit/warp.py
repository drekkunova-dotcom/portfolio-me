#!/usr/bin/env python3
"""Подгонка готовой анимации под музыку без переписывания таймингов: кусочно-линейная деформация времени.
Ключевые события сцены (тапы, удары, смены мира) притягиваются к ближайшей доле/полудоле,
скорость каждого участка остаётся в пределах 0.82–1.22 (на глаз незаметно).
usage: python3 kit/warp.py beats.json warp.json 0.6 2.3 3.25 ...   (моменты сцены в секундах, по возрастанию)
       --half  — разрешить полудоли;  --dur 59.5 — длина сцены (последняя точка)
Потом в конце сцены (после M.done) вставь снипет из SKILL.md §7.3 с WP = содержимое warp.json."""
import json, sys
a = sys.argv[1:]; half = '--half' in a
dur = float(a[a.index('--dur')+1]) if '--dur' in a else None
nums = [float(x) for i, x in enumerate(a[2:]) if not x.startswith('--') and (i == 0 or a[2+i-1] != '--dur')]
B = json.load(open(a[0]))['beats']
if half: B = sorted(B + [(x+y)/2 for x, y in zip(B, B[1:])])
pts = [(0.0, 0.0)]
for s in nums:
    ps, po = pts[-1]
    cands = [b for b in B if b > po + 0.05 and 0.82 <= (b-po)/max(s-ps, 1e-3) <= 1.22]
    if not cands: continue                       # нельзя притянуть без заметного ускорения — пропускаем
    pts.append((s, min(cands, key=lambda b: abs(b - (po + (s-ps))))))
if dur: ps, po = pts[-1]; pts.append((dur, po + (dur-ps)))
json.dump([[round(s, 3), round(o, 3)] for s, o in pts], open(a[1], 'w'))
for s, o in pts: print(f'{s:7.3f} → {o:7.3f}')
