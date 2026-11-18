#!/usr/bin/env node
/* Проверка резкости до финального рендера: для каждой картинки (<img> и CSS background) находит
   максимальный экранный размер за весь ролик и сравнивает с размером файла.
   k = экранные px в 4K / px файла. k ≤ 1.1 — резко; 1.1–1.3 — терпимо; > 1.3 — мыло, переэкспортировать.
   usage: node kit/density.cjs work/scene.html [--scale 2] [--step 0.2] */
const {chromium}=require('playwright');const path=require('path');
const a=process.argv.slice(2);const opt=(k,d)=>{const i=a.indexOf('--'+k);return i>=0?+a[i+1]:d};
const scale=opt('scale',2),step=opt('step',0.2);
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.goto(/^https?:\/\//.test(a[0]) ? a[0] : 'file://'+path.resolve(a[0]));await p.waitForFunction('window.__ready===true',null,{timeout:120000});
const D=await p.evaluate('window.__duration');const res={};
for(let t=0;t<D;t+=step){await p.evaluate(t=>window.__seek(t),t);
 const r=await p.evaluate(async()=>{const vis=e=>{for(;e&&e!==document.body;e=e.parentElement){const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0)return false}return true};
  const on=R=>R.width>0&&R.right>0&&R.left<1920&&R.bottom>0&&R.top<1080;const o=[];
  document.querySelectorAll('img').forEach(i=>{const R=i.getBoundingClientRect();if(i.naturalWidth&&on(R)&&vis(i))o.push([i.getAttribute('src'),R.width/i.naturalWidth,Math.round(R.width)])});
  for(const e of document.querySelectorAll('*')){const s=getComputedStyle(e),bg=s.backgroundImage;if(!bg||!bg.startsWith('url('))continue;const R=e.getBoundingClientRect();if(!on(R)||!vis(e))continue;
   const url=bg.slice(5,-2);const im=new Image();im.src=url;await im.decode().catch(()=>{});if(!im.naturalWidth)continue;
   const sz=s.backgroundSize.split(' ')[0];const css=sz.endsWith('px')?parseFloat(sz):e.offsetWidth;const k=R.width/e.offsetWidth;
   o.push(['BG '+url.split('/').pop(),css*k/im.naturalWidth,Math.round(css*k)])}
  return o});
 for(const [s,k,w] of r){if(!res[s]||res[s][0]<k)res[s]=[k,w,+t.toFixed(1)]}}
const rows=Object.entries(res).map(([s,[k,w,t]])=>[k*scale,w,t,s]).sort((x,y)=>y[0]-x[0]);
for(const [k,w,t,s] of rows)console.log((k>1.3?'✗ ':k>1.1?'~ ':'  ')+k.toFixed(2).padStart(5),String(w).padStart(5)+'px','t='+t,s);
console.log(`\n${rows.filter(r=>r[0]>1.3).length} файлов мылят (k>1.3) при --scale ${scale}`);await b.close()})();
