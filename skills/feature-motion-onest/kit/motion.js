/* Motion kit — Personal feature-video theme: one-take continuity, containers, micro-life.
   Everything sits on ONE paused GSAP timeline (M.tl); the renderer seeks it frame by frame.
   Never use setTimeout / requestAnimationFrame / Math.random / CSS transitions — only timeline tweens. */
(function(){
gsap.registerPlugin(CustomEase);
gsap.ticker.lagSmoothing(0);

/* ── Curves (measured on the references) ─────────────────────────────── */
CustomEase.create('m.move',  '0.55,0,0.35,1');  // A→B moves, camera, counters (fit on the 0→566 counter)
CustomEase.create('m.arrive','0.16,1,0.3,1');   // landing / settling: fast start, long soft tail
CustomEase.create('m.leave', '0.7,0,0.84,0');   // accelerating exits
CustomEase.create('m.soft',  '0.37,0,0.63,1');  // drifts, floats
CustomEase.create('m.snap',  '0.8,0,0.1,1');    // 2–5-frame snaps: iris, collapse to pill, snap-zoom
const E = {move:'m.move', arrive:'m.arrive', leave:'m.leave', soft:'m.soft', snap:'m.snap',
           pop:'back.out(1.7)', popBig:'back.out(2.6)', linear:'none'};
/* ── Durations @30 fps ─────────────────────────────────────────────────── */
const F = 1/30;
const D = {f:F, snap:4*F, fast:0.2, s:0.33, m:0.5, l:0.7, xl:1.0, counter:0.93, whip:0.4, hold:0.6, read:1.0};

const tl = gsap.timeline({paused:true, defaults:{ease:E.move, duration:D.m}});
const cues = [];
const $  = (s, r=document) => typeof s==='string' ? r.querySelector(s) : s;
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const T  = x => typeof x==='string' ? $$(x) : (x instanceof NodeList || Array.isArray(x)) ? [...x].map(e=>typeof e==='string'?$(e):e) : x;
const A  = x => { const r=T(x); return Array.isArray(r)?r:[r]; };
function rng(seed){ let a=seed>>>0||1; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }
const stage = () => $('#stage');
function sfx(name, at, gain=1){ cues.push({name, at:+(+at).toFixed(3), gain}); }

/* ── Measuring at a moment of the timeline (for grow / collapse / handoff) ──
   Seeks the timeline built so far to `t`, reads the rect in STAGE px, seeks back.
   → call these helpers AFTER the camera / phone moves that affect that moment are already on the timeline. */
function rectAt(n, t){
  const back=tl.time(); tl.seek(t,false);
  const r=$(n).getBoundingClientRect(), s=stage().getBoundingClientRect(), k=s.width/stage().offsetWidth;
  tl.seek(back,false);
  return {x:(r.left-s.left)/k, y:(r.top-s.top)/k, w:r.width/k, h:r.height/k};
}
const center = r => ({x:r.x+r.w/2, y:r.y+r.h/2});

/* ── Scenes ───────────────────────────────────────────────────────────── */
function scene(sel, from, to){ const s=$(sel);
  tl.set(s,{visibility:'hidden'},0).set(s,{visibility:'visible'},from); if(to!=null) tl.set(s,{visibility:'hidden'},to); return s; }
function show(t, at){ tl.set(T(t),{autoAlpha:1},at); }
function hide(t, at){ tl.set(T(t),{autoAlpha:0},at); }

/* ── Background stack: colour / gradient changes happen UNDER motion ───── */
function bg(layer, fill, at, {dur=0.33, ease='none'}={}){
  layer=$(layer); let st=layer.querySelector(':scope > .bgstack');
  if(!st){ st=el('<div class="bgstack"></div>'); layer.prepend(st); }
  const b=el(`<div class="bgfill" style="background:${fill}"></div>`); st.appendChild(b);
  if(at<=0 && dur===0) gsap.set(b,{autoAlpha:1}); else { tl.set(b,{autoAlpha:0},0); tl.to(b,{autoAlpha:1,duration:dur,ease},at); }
  return b;
}

/* ── iPhone mockup (393×852 pt screen, black frame, Dynamic Island, 9:41) ─ */
function phone({content='', src=null, dark=false, scale=1, x='50%', y='50%', bg=null, id=null}={}){
  const p = el(`<div class="phone${dark?' dark':''}"${id?` id="${id}"`:''}>
    <div class="screen"${bg?` style="background:${bg}"`:''}>
      <div class="content">${src?`<img src="${src}" style="width:100%;display:block">`:content}</div>
      <div class="status"><span>9:41</span><span>${statusIcons(dark)}</span></div>
      <div class="island"></div><div class="homebar"></div>
    </div><div class="bezel"></div></div>`);
  gsap.set(p,{left:x, top:y, xPercent:-50, yPercent:-50, scale});
  return p;
}
function statusIcons(dark){ const c=dark?'#fff':'#111';
  return `<svg width="78" height="14" viewBox="0 0 78 14" style="vertical-align:middle"><g fill="${c}">
  <rect x="0" y="9" width="3.4" height="4.5" rx="1"/><rect x="5" y="6.5" width="3.4" height="7" rx="1"/>
  <rect x="10" y="4" width="3.4" height="9.5" rx="1"/><rect x="15" y="1" width="3.4" height="12.5" rx="1"/>
  <path d="M30 4.2a10 10 0 0 1 14 0l-1.5 1.6a7.8 7.8 0 0 0-11 0zM33 7.4a5.6 5.6 0 0 1 8 0L37 11.6z"/>
  <rect x="51" y="1" width="24" height="12" rx="3.5" fill="none" stroke="${c}" stroke-opacity=".45"/>
  <rect x="53" y="3" width="20" height="8" rx="2"/><rect x="76" y="5" width="1.6" height="4" rx=".8" opacity=".45"/></g></svg>`; }
/* Phone frame materialises AROUND content that is already on screen (refs: «Маршрут» pill, avatar card, +192 pill) */
function frameIn(p, at, {dur=0.35}={}){
  p=$(p); const parts=[p.querySelector('.bezel'), p.querySelector('.island'), p.querySelector('.status'), p.querySelector('.homebar')];
  tl.set(p,{'--frame':0},0).fromTo(p,{'--frame':0},{'--frame':1,duration:dur,ease:E.arrive},at)
    .fromTo(parts,{autoAlpha:0},{autoAlpha:1,duration:dur,ease:'none'},at);
}

/* ── Camera: a .cam wrapper is panned/zoomed so `target` sits in frame centre at `scale` ── */
function cam(c, target, {at=0, scale=1, dur=D.l, ease=E.move, ox=0, oy=0}={}){
  c=$(c); const W=stage().offsetWidth, H=stage().offsetHeight; let cx=W/2, cy=H/2;
  if(target && target.x!=null){ cx=target.x; cy=target.y; }
  else if(target){ // measure the target as it is AT `at` (phones may still be off-screen at build time), camera neutral
    const back=tl.time(); tl.seek(at,false); const prev=c.style.transform; c.style.transform='none';
    const r=$(target).getBoundingClientRect(), s=stage().getBoundingClientRect(), k=s.width/W;
    cx=(r.left+r.width/2-s.left)/k; cy=(r.top+r.height/2-s.top)/k; c.style.transform=prev; tl.seek(back,false); }
  const v={x:W/2-(cx+ox)*scale, y:H/2-(cy+oy)*scale, scale};
  if(dur===0) tl.set(c,v,at); else tl.to(c,{...v,duration:dur,ease},at);
}

/* ═════ APPEAR ═════════════════════════════════════════════════════════ */
function pop(t, at, {dur=D.s, from=0, ease=E.pop, rot=0, sound='pop'}={}){
  tl.fromTo(T(t),{scale:from,autoAlpha:0,rotation:rot},{scale:1,autoAlpha:1,rotation:0,duration:dur,ease},at); if(sound) sfx(sound,at,0.8); }
function blurIn(t, at, {dur=0.45, blur=14, scale=1.06, y=0, stagger=0}={}){
  tl.fromTo(T(t),{autoAlpha:0,filter:`blur(${blur}px)`,scale,y},{autoAlpha:1,filter:'blur(0px)',scale:1,y:0,duration:dur,ease:E.arrive,stagger},at); }
function blurOut(t, at, {dur=0.3, blur=12, scale=1}={}){ tl.to(T(t),{autoAlpha:0,filter:`blur(${blur}px)`,scale,duration:dur,ease:'power1.in'},at); }
function rise(t, at, {dur=0.55, from=120, blur=true}={}){
  tl.fromTo(T(t),{yPercent:-50+from},{yPercent:-50,duration:dur,ease:E.arrive},at);
  if(blur && A(t).length===1) blurX(t, at, {dur:dur*0.6, peak:40, mode:'in', vertical:true}); }
function fadeUp(t, at, {dur=D.m, y=24, stagger=0.04}={}){
  tl.fromTo(T(t),{y,autoAlpha:0},{y:0,autoAlpha:1,duration:dur,ease:E.arrive,stagger},at); }
function out(t, at, {dur=0.25, scale=0.92}={}){ tl.to(T(t),{autoAlpha:0,scale,duration:dur,ease:E.leave},at); }
/* Chips / list items slide in one after another out of blur (refs: payment chips, 0.13–0.27 s apart) */
function chips(t, at, {each=0.13, dx=60, dy=0, blur=10, dur=0.45}={}){
  tl.fromTo(T(t),{x:dx,y:dy,autoAlpha:0,filter:`blur(${blur}px)`},{x:0,y:0,autoAlpha:1,filter:'blur(0px)',duration:dur,ease:E.arrive,stagger:each},at); }
/* Stroke-draw an SVG icon (refs: route icon drawn from an green accent, 0.6 s) */
function draw(t, at, {dur=0.6, ease=E.move, stagger=0.08}={}){
  A(t).forEach((p,i)=>{ const L=p.getTotalLength(); gsap.set(p,{strokeDasharray:L+1,strokeDashoffset:L+1});
    tl.to(p,{strokeDashoffset:0,duration:dur,ease},at+i*stagger); }); }
function words(t, text, at, {per=0.07, dur=0.25}={}){
  const node=$(t); node.innerHTML=''; const ws=text.split(' ').map((w,i,a)=>{const s=document.createElement('span'); s.className='ch'; s.textContent=w+(i<a.length-1?' ':''); node.appendChild(s); return s;});
  ws.forEach((w,i)=>tl.fromTo(w,{autoAlpha:0,filter:'blur(6px)',y:6},{autoAlpha:1,filter:'blur(0px)',y:0,duration:dur,ease:E.arrive},at+i*per));
  return at+ws.length*per+dur; }
/* Typing. cps: address 60–70, button label ~21, search ~22, long phrase in pill ~16. Gradient cursor = brand colour. */
function type(t, text, at, {cps=22, cursor=true, from='#C9C9CF', sound='type', follow=null, keep=0.72}={}){
  const node=$(t); node.innerHTML=''; const to=getComputedStyle(node).color;
  const chars=[...text].map(c=>{const s=document.createElement('span'); s.className='ch'; s.textContent=c; node.appendChild(s); return s;});
  let cur=null; if(cursor){ cur=document.createElement('span'); cur.className='cursor'; node.appendChild(cur); tl.set(cur,{autoAlpha:0},0).set(cur,{autoAlpha:1},at); }
  const step=1/cps;
  chars.forEach((c,i)=>{ tl.set(c,{display:'none'},0).set(c,{display:'inline-block'},at+i*step)
    .fromTo(c,{autoAlpha:0,color:from},{autoAlpha:1,color:to,duration:4*F,ease:'none'},at+i*step); });
  const end=at+chars.length*step;
  if(cur) for(let k=0;k<4;k++) tl.set(cur,{autoAlpha:k%2?1:0},end+0.3+k*0.27);
  if(sound) for(let i=0;i<chars.length;i+=2) sfx(sound,at+i*step,0.45);
  if(follow){ const vp=$(follow), W=vp.clientWidth*keep; let x=0; gsap.set(chars,{display:'inline-block'});
    chars.forEach((c,i)=>{ const r=c.offsetLeft+c.offsetWidth; if(r>W && r-W>x){ x=r-W; tl.to(node,{x:-x,duration:0.16,ease:E.move},at+i*step); } });
    gsap.set(chars,{display:'none'}); }
  return end; }
/* Seed: a dot of colour pops, then the hero grows out of it (refs: route-line → green dot → icon; phone → green dot → mascot) */
function seed(t, at, {color='var(--accent)', size=26, dur=0.4, sound='pop'}={}){
  const n=$(t), d=el(`<div class="seed" style="width:${size}px;height:${size}px;background:${color}"></div>`);
  n.parentElement.appendChild(d);
  const r=rectAt(n,at+dur), c=center(r), pr=rectAt(n.parentElement,at), k=pr.w/n.parentElement.offsetWidth||1;
  gsap.set(d,{left:(c.x-pr.x)/k-size/2, top:(c.y-pr.y)/k-size/2, autoAlpha:0});
  tl.fromTo(d,{scale:0,autoAlpha:1},{scale:1,duration:0.15,ease:E.pop},at)
    .fromTo(n,{scale:0.15,autoAlpha:0},{scale:1,autoAlpha:1,duration:dur,ease:E.popBig},at+0.12)
    .to(d,{scale:3,autoAlpha:0,duration:0.2,ease:'power1.in'},at+0.14);
  if(sound) sfx(sound,at,0.7); return at+0.12+dur; }

/* ═════ MICRO-LIFE (nothing in frame is ever frozen) ═══════════════════ */
function float(t, from, to, {amp=8, rot=1.5, period=2.6, phase=0}={}){
  const n=$(t), o={p:0}; tl.to(o,{p:1,duration:to-from,ease:'none',onUpdate:()=>{const ph=o.p*(to-from)/period*Math.PI*2+phase;
    gsap.set(n,{y:Math.sin(ph)*amp, rotation:Math.sin(ph*0.7)*rot});}},from); }
/* Character beat: a short wobble / nod (fork-and-knife wiggle, duck «кря-кря», box lid) */
function wiggle(t, at, {rot=10, n=3, dur=0.5, scale=1.06, origin='50% 90%'}={}){
  const node=$(t); gsap.set(node,{transformOrigin:origin}); const step=dur/(n*2);
  tl.to(node,{scale,duration:step,ease:'power1.out'},at);
  for(let i=0;i<n*2;i++) tl.to(node,{rotation:(i%2?-1:1)*rot*(1-i/(n*2)),duration:step,ease:'sine.inOut'},at+i*step);
  tl.to(node,{rotation:0,scale:1,duration:step*1.5,ease:E.arrive},at+dur); }
/* Pose swap: 2–4 drawings shown in turn (courier icon walk cycle) */
function poses(list, at, {fps=8, loops=2}={}){ const ps=A(list), step=1/fps; gsap.set(ps.slice(1),{autoAlpha:0});
  for(let k=0;k<loops*ps.length;k++){ const i=k%ps.length; tl.set(ps,{autoAlpha:0},at+k*step).set(ps[i],{autoAlpha:1},at+k*step); }
  tl.set(ps,{autoAlpha:0},at+loops*ps.length*step).set(ps[0],{autoAlpha:1},at+loops*ps.length*step); }
function spinY(t, at, {turns=1, dur=0.6, ease=E.move}={}){ tl.fromTo(T(t),{rotationY:0},{rotationY:360*turns,duration:dur,ease},at); }
function press(t, at, {depth=0.94}={}){ tl.to($(t),{scale:depth,duration:0.09,ease:'power2.out'},at).to($(t),{scale:1,duration:0.3,ease:E.pop},at+0.09); sfx('tap',at); }
/* Hand cursor that travels in, presses, leaves (refs: hand cursor on chips). x,y in parent px */
function tap(x, y, at, {parent='#stage', from=[140,160], hold=0.18, ripple=true, size=64}={}){
  const h=el(`<div class="hand" style="width:${size}px;height:${size}px">${HAND}</div>`); $(parent).appendChild(h);
  gsap.set(h,{left:x-size*0.32, top:y-size*0.08, autoAlpha:0});
  tl.fromTo(h,{x:from[0],y:from[1],autoAlpha:0},{x:0,y:0,autoAlpha:1,duration:0.35,ease:E.arrive},at-0.35)
    .to(h,{scale:0.86,duration:0.08,ease:'power2.out'},at).to(h,{scale:1,duration:0.2,ease:E.pop},at+0.08)
    .to(h,{x:from[0]*0.6,y:from[1]*0.6,autoAlpha:0,duration:0.35,ease:E.leave},at+hold+0.2);
  if(ripple){ const r=el(`<div class="ripple"></div>`); $(parent).appendChild(r); gsap.set(r,{left:x-40,top:y-40});
    gsap.set(r,{autoAlpha:0}); tl.fromTo(r,{scale:0.2,autoAlpha:0.5},{scale:1.5,autoAlpha:0,duration:0.45,ease:E.arrive,immediateRender:false},at); }
  sfx('tap',at); }
/* ONE persistent cursor for the whole video: travels between taps instead of spawning a new hand each time.
   c=M.cursor({parent:'#over'}); c.tap(x,y,at); c.tap(x2,y2,at2); c.leave(at3)   (x,y in parent px) */
function cursor({parent='#stage', size=84, travel=0.42, ripple=true}={}){
  const h=el(`<div class="hand" style="width:${size}px;height:${size}px">${HAND}</div>`); $(parent).appendChild(h);
  gsap.set(h,{autoAlpha:0,left:0,top:0}); let vis=false;
  const api={
    tap(x,y,at,{move=travel}={}){
      const L={left:x-size*0.32, top:y-size*0.08};
      if(!vis){ tl.set(h,{...L,x:110,y:130,autoAlpha:0},at-0.4).to(h,{x:0,y:0,autoAlpha:1,duration:0.4,ease:E.arrive},at-0.4); vis=true; }
      else tl.to(h,{...L,duration:move,ease:E.move},at-move);
      tl.to(h,{scale:0.86,duration:0.08,ease:'power2.out'},at).to(h,{scale:1,duration:0.22,ease:E.pop},at+0.08);
      if(ripple){ const r=el(`<div class="ripple"></div>`); $(parent).appendChild(r); gsap.set(r,{left:x-40,top:y-40,autoAlpha:0});
        tl.fromTo(r,{scale:0.2,autoAlpha:0.5},{scale:1.5,autoAlpha:0,duration:0.45,ease:E.arrive,immediateRender:false},at); }
      sfx('tap',at); return api; },
    leave(at){ if(!vis) return api; tl.to(h,{x:90,y:110,autoAlpha:0,duration:0.35,ease:E.leave},at).set(h,{x:0,y:0},at+0.36); vis=false; return api; },
    el:h };
  return api; }
const HAND = `<svg viewBox="0 0 64 64"><path d="M24 30V12a5 5 0 0 1 10 0v14l2-.4a5 5 0 0 1 5.6 3.2l.4-.1a5 5 0 0 1 6 3.6l.3-.1a5 5 0 0 1 6 4.7V45c0 9-6 15-15 15h-3c-6 0-10-3-13-8l-8-12a4.6 4.6 0 0 1 7-6z" fill="#fff" stroke="#111" stroke-width="3" stroke-linejoin="round"/></svg>`;
/* Toggle: knob 6 frames, track fills, the WORLD reacts (tint the scene bg) */
function toggle(t, at, {on='var(--accent)', tint=null, tintFill=null, sound='tap'}={}){
  const tg=$(t), k=tg.querySelector('.knob'); const travel=tg.offsetWidth-k.offsetWidth-tg.offsetHeight*0.16;
  tl.to(k,{x:travel,duration:0.2,ease:E.move},at).to(tg,{backgroundColor:on,duration:0.12,ease:'none'},at+0.04)
    .to(k,{scaleX:1.12,duration:0.1,ease:'power1.out'},at).to(k,{scaleX:1,duration:0.2,ease:E.arrive},at+0.1);
  if(tint) bg(tint, tintFill, at+0.03, {dur:0.12});
  if(sound) sfx(sound,at); }
/* Selection: tile tints, its content pops up and settles (refs: ingredient grid) */
function select(tile, at, {fill='var(--accent-soft)', content=null, ring=null}={}){
  tile=$(tile); tl.to(tile,{backgroundColor:fill,duration:0.15,ease:'none'},at).to(tile,{scale:0.95,duration:0.08},at).to(tile,{scale:1,duration:0.3,ease:E.pop},at+0.08);
  if(content) tl.to($(content),{scale:1.18,y:-6,duration:0.15,ease:'power2.out'},at).to($(content),{scale:1,y:0,duration:0.4,ease:E.pop},at+0.15);
  if(ring) tl.fromTo($(ring),{autoAlpha:0,scale:0.9},{autoAlpha:1,scale:1,duration:0.2,ease:E.arrive},at);
  sfx('tap',at); }
/* Slot-machine digit roll: each digit column spins with vertical smear, columns stop left→right (refs: +192) */
function roll(t, from, to, at, {dur=0.7, stagger=0.06, spins=1, sep=' ', sound='riser'}={}){
  const node=$(t), fmt=v=>String(v).replace(/\B(?=(\d{3})+(?!\d))/g,sep);
  let a=fmt(from), b=fmt(to); const L=Math.max(a.length,b.length); a=a.padStart(L,' '); b=b.padStart(L,' ');
  node.innerHTML=''; node.classList.add('roll'); const cols=[];
  for(let i=0;i<L;i++){ const ca=a[i], cb=b[i];
    if(/\d/.test(cb)){ const da=/\d/.test(ca)?+ca:0, db=+cb, seq=[]; let d=da; seq.push(d);
      const steps=((db-da+10)%10)+10*spins; for(let s=0;s<steps;s++){ d=(d+1)%10; seq.push(d); }
      const col=el(`<span class="rcol"><span class="rstrip">${seq.map(x=>`<span>${x}</span>`).join('')}</span></span>`); node.appendChild(col);
      if(ca===' ') tl.fromTo(col,{autoAlpha:0},{autoAlpha:1,duration:0.3,ease:'power1.in'},at+0.12);
      cols.push({strip:col.firstChild, n:seq.length}); }
    else { const s=el(`<span class="rch">${cb===' '?' ':cb}</span>`); node.appendChild(s); } }
  cols.forEach((c,i)=>{ const d=dur+i*stagger; tl.fromTo(c.strip,{yPercent:0},{yPercent:-100*(c.n-1)/c.n,duration:d,ease:'power3.inOut'},at);
    blurX(c.strip,at,{dur:d,peak:7,mode:'inout',vertical:true}); });
  if(sound) sfx(sound,at,0.5); sfx('pop',at+dur+stagger*cols.length,0.5);
  return at+dur+stagger*cols.length; }
function count(t, from, to, at, {dur=D.counter, prefix='', suffix='', sep=' '}={}){
  const node=$(t), o={v:from}; const fmt=v=>prefix+Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,sep)+suffix;
  tl.set(node,{textContent:fmt(from)},0).to(o,{v:to,duration:dur,ease:E.move,onUpdate:()=>node.textContent=fmt(o.v)},at); sfx('riser',at,0.4); }
/* Segmented status ring: ticks light up one by one, then the check draws (refs: «Приняли» ring) */
function ring(host, at, {size=160, ticks=28, color='var(--accent)', base='#3A3A3F', dur=0.9, check=true, stroke=10}={}){
  host=$(host); const R=size/2-stroke, c=size/2; let s=`<svg class="ringsvg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${base}" stroke-width="${stroke*0.5}" class="rbase"/>`;
  for(let i=0;i<ticks;i++){ const a=(i/ticks)*Math.PI*2-Math.PI/2, r1=R-stroke*0.5, r2=R+stroke*0.5;
    s+=`<line class="tick" x1="${c+Math.cos(a)*r1}" y1="${c+Math.sin(a)*r1}" x2="${c+Math.cos(a)*r2}" y2="${c+Math.sin(a)*r2}" stroke="${color}" stroke-width="${stroke*0.42}" stroke-linecap="round"/>`; }
  if(check) s+=`<path class="check" d="M${c-R*0.38} ${c+R*0.02} L${c-R*0.08} ${c+R*0.3} L${c+R*0.42} ${c-R*0.3}" fill="none" stroke="${color}" stroke-width="${stroke*1.1}" stroke-linecap="round" stroke-linejoin="round"/>`;
  host.innerHTML=s+'</svg>'; const tk=$$('.tick',host);
  tl.set(tk,{autoAlpha:0},0); tk.forEach((x,i)=>tl.fromTo(x,{autoAlpha:0,scale:0.4,transformOrigin:'50% 50%'},{autoAlpha:1,scale:1,duration:0.12,ease:E.pop},at+i*dur/ticks));
  if(check){ const ck=$('.check',host); draw(ck, at+dur*0.35, {dur:0.3, ease:E.arrive}); sfx('success',at+dur*0.4); }
  return at+dur; }

/* ═════ REWARD ═════════════════════════════════════════════════════════ */
function burst(parent, at, {x=960, y=540, count=40, make=null, seed=7, speed=[900,2200], angle=[-180,0],
                            gravity=2600, dur=1.6, size=[40,120], spin=720, depth=true, toward=0, sound='coins'}={}){
  const R=rng(seed), host=$(parent);
  for(let i=0;i<count;i++){ const s=size[0]+R()*(size[1]-size[0]);
    const p=make?make(i,s,R):el(`<div class="particle-mark" style="width:${s}px;height:${s}px;border-radius:50%;background:var(--accent)"></div>`);
    p.classList.add('particle'); gsap.set(p,{x:x-s/2,y:y-s/2,autoAlpha:0}); host.appendChild(p);
    const a=(angle[0]+R()*(angle[1]-angle[0]))*Math.PI/180, v=speed[0]+R()*(speed[1]-speed[0]);
    const vx=Math.cos(a)*v, vy=Math.sin(a)*v, rot=(R()-.5)*spin, fl=R()*360, delay=R()*0.08, z=depth?0.6+R()*0.8:1, o={t:0};
    tl.to(o,{t:dur,duration:dur,ease:'none',onUpdate:()=>{const q=o.t; const k=toward?1+toward*q*q*(0.4+z):1, sc=Math.min(1,q*8)*z*k;
      gsap.set(p,{x:x-s/2+vx*q*z*k, y:y-s/2+(vy*q+gravity*q*q/2)*z*k, rotation:rot*q, rotationY:fl+rot*q*0.7, scale:sc,
        filter:toward&&sc>1.6?`blur(${Math.min(14,(sc-1.6)*6).toFixed(1)}px)`:'none', autoAlpha:q<=0?0:Math.min(1,(dur-q)*4)});}},at+delay); }
  if(sound) sfx(sound,at); }
const confetti = (colors) => (i,s,R)=>{ const cs=colors||['var(--accent)','#E5F5EB','#FFFFFF','#262626'];
  return el(`<div class="confetti" style="width:${s*0.28}px;height:${s*0.5}px;background:${cs[i%cs.length]};border-radius:${i%3?3:s}px"></div>`); };
function rays(parent, at, {x=960, y=540, size=900, hole=0.18, dur=0.9, spin=25, color='0,158,54'}={}){
  const m=`radial-gradient(circle,transparent 0,transparent ${hole*100}%,#000 ${hole*100+8}%,#000 32%,transparent 72%)`;
  const r=el(`<div class="rays" style="width:${size}px;height:${size}px;left:${x-size/2}px;top:${y-size/2}px;-webkit-mask:${m};mask:${m};
    background:repeating-conic-gradient(from 0deg,rgba(${color},0) 0deg 5deg,rgba(${color},.7) 7deg 9deg,rgba(${color},0) 11deg 15deg)"></div>`);
  const g=el(`<div class="glow" style="width:${size*0.8}px;height:${size*0.8}px;left:${x-size*0.4}px;top:${y-size*0.4}px;
    background:radial-gradient(circle,rgba(${color},.55) 0,rgba(${color},.2) 35%,rgba(${color},0) 70%)"></div>`);
  $(parent).append(g,r);
  tl.set([r,g],{autoAlpha:0},0)
    .fromTo(r,{scale:0.2,autoAlpha:0,rotation:0},{scale:1,autoAlpha:1,rotation:spin,duration:0.3,ease:E.arrive},at)
    .to(r,{autoAlpha:0,rotation:spin*2,duration:dur-0.3,ease:'power1.in'},at+0.3)
    .fromTo(g,{scale:0.3,autoAlpha:0},{scale:1,autoAlpha:1,duration:0.25,ease:E.arrive},at)
    .to(g,{autoAlpha:0,scale:1.2,duration:dur,ease:'power1.in'},at+0.25); }
function flash(at, {parent='#stage', x='50%', y='50%', inDur=0.12, hold=0.04, outDur=0.4, color='0,158,54', sound='hit'}={}){
  const f=el(`<div class="flash" style="background:radial-gradient(circle at ${x} ${y},#fff 0,#E5F5EB 22%,rgba(${color},.5) 45%,rgba(${color},0) 70%)"></div>`); $(parent).appendChild(f);
  tl.set(f,{autoAlpha:0,scale:0.2},0).to(f,{autoAlpha:1,scale:3,duration:inDur,ease:'power2.in'},at).to(f,{autoAlpha:0,scale:4,duration:outDur,ease:E.arrive},at+inDur+hold);
  if(sound) sfx(sound,at,0.7); return at+inDur; }

/* ═════ TRANSITIONS ════════════════════════════════════════════════════ */
/* Directional blur (SVG) — streaks on whips / scrolls / rolls */
let _fid=0;
function blurX(t, at, {dur=D.whip, peak=60, mode='out', vertical=false}={}){
  const n=$(t), id='mbf'+(++_fid), svg=document.getElementById('mb-defs') || (()=>{const d=document.createElementNS('http://www.w3.org/2000/svg','svg');
    d.id='mb-defs'; d.setAttribute('width',0); d.setAttribute('height',0); d.style.position='absolute'; document.body.appendChild(d); return d;})();
  svg.insertAdjacentHTML('beforeend',`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0 0"/></filter>`);
  const g=svg.querySelector('#'+id+' feGaussianBlur'), v=x=>vertical?`0 ${x}`:`${x} 0`;
  tl.set(n,{filter:`url(#${id})`},at).set(g,{attr:{stdDeviation:v(0)}},at);
  if(mode==='out') tl.to(g,{attr:{stdDeviation:v(peak)},duration:dur,ease:'power2.in'},at);
  else if(mode==='in') tl.fromTo(g,{attr:{stdDeviation:v(peak)}},{attr:{stdDeviation:v(0)},duration:dur,ease:'power2.out'},at);
  else tl.to(g,{attr:{stdDeviation:v(peak)},duration:dur/2,ease:'power2.in'},at).to(g,{attr:{stdDeviation:v(0)},duration:dur/2,ease:'power2.out'},at+dur/2);
  tl.set(n,{filter:'none'},at+dur+0.02); }

/* T1 Shape match / morph: A collapses into a point while B is born from the same point (2–4 frame overlap).
   Good for icon→icon, gift→«0», blob→drawn icon. Put both in the same place. */
function morph(a, b, at, {dur=0.35, overlap=3*F, blur=8, rot=0}={}){
  const h=dur/2; tl.to($(a),{scale:0.2,autoAlpha:0,rotation:rot,filter:`blur(${blur}px)`,duration:h,ease:'power2.in'},at)
    .fromTo($(b),{scale:0.2,autoAlpha:0,rotation:-rot,filter:`blur(${blur}px)`},{scale:1,autoAlpha:1,rotation:0,filter:'blur(0px)',duration:h*1.4,ease:E.popBig},at+h-overlap);
  sfx('pop',at+h,0.7); return at+h-overlap+h*1.4; }
/* T7 Glyph flip: A turns edge-on around Y, B comes out of the edge (fork&knife → courier, 0.13–0.2 s through the edge) */
function flip(a, b, at, {dur=0.3, axis='Y', persp=900}={}){
  const A=$(a), B=$(b), k='rotation'+axis; [A,B].forEach(n=>{ gsap.set(n.parentElement,{perspective:persp}); n.style.backfaceVisibility='hidden'; });
  tl.set(B,{autoAlpha:0,[k]:-90},0).to(A,{[k]:90,duration:dur*0.45,ease:'power2.in'},at).set(A,{autoAlpha:0},at+dur*0.45)
    .set(B,{autoAlpha:1},at+dur*0.45).to(B,{[k]:0,duration:dur*0.55,ease:E.arrive},at+dur*0.45);
  sfx('whoosh',at,0.35); }
/* T2 Container grows OUT OF its content: clip opens from the rect of `from` (icon / toggle / avatar) to the full box.
   Content of the container that is not `from` can be revealed with `reveal` (stagger fade). */
function grow(box, at, {from, dur=0.45, ease=E.arrive, radius=null, endRadius=null, reveal=null, revealAt=0.15}={}){
  box=$(box); const B=rectAt(box,at), A=rectAt(from,at), k=B.w/box.offsetWidth;
  const ins=(r)=>`${(r.y-B.y)/k}px ${(B.x+B.w-r.x-r.w)/k}px ${(B.y+B.h-r.y-r.h)/k}px ${(r.x-B.x)/k}px`;
  const r0=radius!=null?radius:Math.min(A.w,A.h)/2/k, r1=endRadius!=null?endRadius:parseFloat(getComputedStyle(box).borderTopLeftRadius)||0;
  tl.set(box,{autoAlpha:0},0).set(box,{autoAlpha:1},at)
    .fromTo(box,{clipPath:`inset(${ins(A)} round ${r0}px)`},{clipPath:`inset(0px 0px 0px 0px round ${r1}px)`,duration:dur,ease},at)
    .set(box,{clipPath:'none'},at+dur);
  if(reveal) fadeUp(reveal, at+revealAt, {y:10, dur:0.35});
  sfx('swoosh',at,0.4); return at+dur; }
/* T3 Container collapses INTO its content (full-frame purple → «+192» pill; card → tile; video → circle). */
function collapse(box, at, {to, dur=0.3, ease=E.snap, radius=null, startRadius=0, hideAfter=true}={}){
  box=$(box); const B=rectAt(box,at), A=to.x!=null?to:rectAt(to,at), k=B.w/box.offsetWidth;
  const ins=`${(A.y-B.y)/k}px ${(B.x+B.w-A.x-A.w)/k}px ${(B.y+B.h-A.y-A.h)/k}px ${(A.x-B.x)/k}px`;
  const r=radius!=null?radius:Math.min(A.w,A.h)/2/k;
  tl.fromTo(box,{clipPath:`inset(0px 0px 0px 0px round ${startRadius}px)`},{clipPath:`inset(${ins} round ${r}px)`,duration:dur,ease},at);
  if(hideAfter) tl.set(box,{autoAlpha:0},at+dur+F);
  return at+dur; }
/* Iris: full-frame photo/video → circle (benchmark: 4 frames) */
function iris(t, at, {r='18%', cx='50%', cy='40%', dur=0.2}={}){
  tl.fromTo($(t),{clipPath:`circle(150% at ${cx} ${cy})`},{clipPath:`circle(${r} at ${cx} ${cy})`,duration:dur,ease:E.snap},at); sfx('whoosh',at,0.4); }
/* T4/T5 Handoff (shared element): `a` flies into the slot of `b` (card lands in the phone, pill shrinks into the badge).
   A clone flies on a top layer; give `a` self-contained classes (no descendant selectors from its old parent). */
function handoff(a, b, at, {dur=0.6, ease=E.move, layer='#fly', arc=0, hideB=true}={}){
  a=$(a); b=$(b); const A=rectAt(a,at), B=rectAt(b,at+dur), lay=$(layer)||(()=>{const l=el('<div id="fly"></div>'); stage().appendChild(l); return l;})();
  const back=tl.time(); tl.seek(at,false); const c=a.cloneNode(true); tl.seek(back,false);   // clone = the carrier exactly as it looks at `at`
  c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id')); c.classList.add('flying'); lay.appendChild(c);
  const w=a.offsetWidth, h=a.offsetHeight; gsap.set(c,{width:w,height:h,transformOrigin:'0 0',x:A.x,y:A.y,scaleX:A.w/w,scaleY:A.h/h,autoAlpha:0});
  if(hideB) tl.set(b,{autoAlpha:0},0);
  tl.set(c,{autoAlpha:1},at).set(a,{autoAlpha:0},at)
    .to(c,{x:B.x,y:B.y,scaleX:B.w/w,scaleY:B.h/h,duration:dur,ease},at);
  if(arc) tl.to(c,{y:`-=${arc}`,duration:dur/2,ease:'sine.out',yoyo:true,repeat:1},at);
  tl.set(b,{autoAlpha:1},at+dur).set(c,{autoAlpha:0},at+dur);
  return at+dur; }
/* Lift-out focus: an element pops forward out of the screen, everything behind blurs & dims (status card, chip row) */
function liftOut(t, at, {scale=1.25, y=0, behind=[], blur=14, dim=0.75, dur=0.4, shadow='0 40px 90px rgba(0,0,0,.25)'}={}){
  tl.to($(t),{scale,y,boxShadow:shadow,duration:dur,ease:E.arrive},at);
  if(behind.length) tl.fromTo(T(behind),{filter:'blur(0px) brightness(1)'},{filter:`blur(${blur}px) brightness(${dim})`,scale:0.96,duration:dur,ease:E.move},at);
  sfx('whoosh',at,0.3); }
/* Phone swap: old phone drops out, new one rises (overlap ~0.15 s) — bg can change underneath */
function swap(oldP, newP, at, {dur=0.5}={}){
  tl.to($(oldP),{yPercent:'+=120',duration:dur,ease:E.leave},at);
  rise(newP, at+dur*0.45, {dur:dur*1.1}); sfx('whoosh',at,0.6); }
/* Scroll-whip: content scrolls fast with vertical smear, phone usually drops away after (match-cut to next icon) */
function scrollWhip(content, at, {dist=-1600, dur=0.6, peak=30}={}){
  tl.to($(content),{y:dist,duration:dur,ease:'power2.in'},at); blurX(content,at,{dur,peak,mode:'out',vertical:true}); sfx('whoosh',at,0.6); }
function whip(outSel, inSel, at, {dir=-1, dur=D.whip, dist=1.15, blur=70, sound='whoosh'}={}){
  const W=stage().offsetWidth;
  if(outSel){ tl.to($(outSel),{x:dir*W*dist,duration:dur,ease:'power2.in'},at); if(blur) blurX(outSel,at,{dur,peak:blur,mode:'out'}); }
  if(inSel){ tl.fromTo($(inSel),{x:-dir*W*dist},{x:0,duration:dur*1.25,ease:E.arrive},at+dur*0.55); if(blur) blurX(inSel,at+dur*0.55,{dur:dur*0.8,peak:blur,mode:'in'}); }
  if(sound) sfx(sound,at); }
/* Smear wipe: a soft streak of brand colour crosses the frame, state swaps under it (tab change, 0.8–1 s) */
function smear(parent, at, {y=540, h=260, color='var(--accent)', dur=0.8, dir=1, swapAt=0.45}={}){
  const W=stage().offsetWidth, s=el(`<div class="smear" style="top:${y-h/2}px;height:${h}px;--c:${color}"></div>`); $(parent).appendChild(s);
  tl.set(s,{autoAlpha:0},0).fromTo(s,{x:dir>0?-W*0.9:W*0.9,scaleX:0.4,autoAlpha:1},{x:dir>0?W*0.9:-W*0.9,scaleX:1.4,duration:dur,ease:'power2.inOut'},at)
    .to(s,{autoAlpha:0,duration:0.15},at+dur-0.15);
  sfx('whoosh',at,0.5); return at+dur*swapAt; }

window.M = {tl, E, D, F, cues, $, $$, T, A, el, rng, rectAt, center, scene, show, hide, bg, sfx, phone, frameIn, cam,
  pop, blurIn, blurOut, rise, fadeUp, out, chips, draw, words, type, seed,
  float, wiggle, poses, spinY, press, tap, toggle, select, roll, count, ring,
  burst, confetti, rays, flash, cursor,
  blurX, morph, flip, grow, collapse, iris, handoff, liftOut, swap, scrollWhip, whip, smear};
window.__seek = t => { tl.seek(t, false); };
window.__ready = false;
M.done = (extra=0) => { window.__duration = tl.duration()+extra; window.__cues = cues; tl.seek(0); window.__ready = true; };
})();
