#!/bin/bash
# Optional high-resolution helper. Requested project delivery remains 1920x1080.
# Финальный 4K-рендер кусками по 3 с в 2 потока; готовые куски пропускаются, так что после обрыва
# просто запусти снова. Больше 2 потоков в 4K не ставить: при 8 ГБ памяти Chromium падает (Target crashed).
# usage: bash kit/render4k.sh work/scene.html out [mblur=3]
S=$1; O=${2:-out}; MB=${3:-3}; mkdir -p $O
DUR=$(node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+require('path').resolve('$S'));await p.waitForFunction('window.__ready===true',null,{timeout:120000});console.log(await p.evaluate('window.__duration'));await b.close()})()")
N=$(python3 -c "import math;print(math.ceil($DUR/3))")
worker(){ for i in $(seq $1 2 $((N-1))); do
  f=$((i*3)); t=$(( (i+1)*3 )); o=$O/s4k_$(printf %02d $i).mp4; [ -f $o ] && continue
  node kit/render.cjs $S $O/tmp4k_$i.mp4 --scale 2 --mblur $MB --crf 14 --from $f --to $t > $O/s4k_$i.log 2>&1 && mv $O/tmp4k_$i.mp4 $o
done; }
worker 0 & worker 1 & wait
echo "готово кусков: $(ls $O/s4k_*.mp4 | wc -l) из $N"
