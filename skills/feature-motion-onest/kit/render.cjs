#!/usr/bin/env node
/* Frame-accurate renderer: seeks the page's GSAP timeline per (sub)frame, screenshots, pipes to ffmpeg.
   Motion blur = N sub-frames averaged per output frame (like RSMB/AE shutter 180–360°).
   Usage:
     node render.cjs scene.html out.mp4 [--fps 30] [--scale 2] [--mblur 4] [--shutter 0.5]
                     [--from 0] [--to <sec>] [--music track.wav] [--sfx sfxDir] [--music-gain 0.8] [--crf 16]
   Preview: --scale 0.5 --mblur 1 (fast)    Delivery: --scale 1 for requested 1920x1080; --scale 2 only with adequate source density
   If the bundled Chromium does not match the playwright version: CHROMIUM_PATH=/path/to/chrome node render.cjs …                                 */
const {chromium} = require('playwright');
const {spawn, execFileSync} = require('child_process');
const fs = require('fs'), path = require('path');

const args = process.argv.slice(2), BOOL=new Set(['keep']), kv={}, pos=[];
for(let i=0;i<args.length;i++){ const a=args[i]; if(a.startsWith('--')){ const k=a.slice(2); if(BOOL.has(k)) kv[k]=true; else kv[k]=args[++i]; } else pos.push(a); }
const opt = (k,d)=> kv[k]!==undefined ? kv[k] : d;
const [input, output] = pos; if(!input||!output){console.error('usage: node render.cjs scene.html out.mp4 [opts]');process.exit(1);}
const fps=+opt('fps',30), scale=+opt('scale',1), mblur=Math.max(1,+opt('mblur',1)), shutter=+opt('shutter',0.5);
const crf=opt('crf','16'), music=opt('music',null), sfxDir=opt('sfx',null), musicGain=+opt('music-gain',0.8);

(async()=>{
  const browser = await chromium.launch({args:['--force-color-profile=srgb','--disable-lcd-text'], executablePath: process.env.CHROMIUM_PATH || undefined});
  const page = await browser.newPage({viewport:{width:1920,height:1080}, deviceScaleFactor:scale});
  page.on('console', m=>{ if(m.type()==='error') console.error('[page]', m.text()); });
  page.on('pageerror', e=>{console.error('[pageerror]', e.message); process.exit(2);});
  await page.goto(/^https?:\/\//.test(input) ? input : 'file://'+path.resolve(input));
  const {w,h} = await page.evaluate(()=>{const s=document.querySelector('#stage');return {w:s.offsetWidth,h:s.offsetHeight};});
  await page.setViewportSize({width:w,height:h});
  await page.waitForFunction('window.__ready===true',null,{timeout:30000});
  await page.evaluate(async()=>{if(window.ProjectBrand) await window.ProjectBrand.ready(); await document.fonts.ready; await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  const dur = await page.evaluate('window.__duration');
  const from=+opt('from',0), to=Math.min(+opt('to',dur), dur);
  const frames=Math.round((to-from)*fps);
  console.log(`stage ${w}x${h} @${scale}x → ${w*scale}x${h*scale}, ${frames} frames, mblur ${mblur}`);

  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
  const tmp = output.replace(/\.mp4$/,'') + '.video.mp4';
  const vf = mblur>1 ? `tmix=frames=${mblur}:weights='${Array(mblur).fill(1).join(' ')}',select='not(mod(n+1\\,${mblur}))',setpts=N/${fps}/TB` : 'null';
  const ff = spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate',String(fps*mblur),'-i','-',
     '-vf',vf+',format=yuv420p','-r',String(fps),'-c:v','libx264','-preset','medium','-crf',crf,'-movflags','+faststart',tmp],{stdio:['pipe','inherit','inherit']});
  const t0=Date.now();
  for(let f=0; f<frames; f++){
    for(let s=0; s<mblur; s++){
      const t = from + (f + (mblur>1 ? (s/(mblur-1)-0.5)*shutter : 0))/fps;
      await page.evaluate(t=>window.__seek(Math.max(0,t)), t);
      const buf = await page.screenshot({type:'png', animations:'disabled', caret:'hide'});
      if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
    }
    if(f%30===0) process.stdout.write(`\r${f}/${frames} (${((Date.now()-t0)/1000).toFixed(0)}s)`);
  }
  ff.stdin.end(); await new Promise(r=>ff.on('close',r));
  const cues = (await page.evaluate('window.__cues||[]')).filter(c=>c.at>=from && c.at<to);
  await browser.close(); console.log(`\nvideo done in ${((Date.now()-t0)/1000).toFixed(0)}s`);
  fs.writeFileSync(output.replace(/\.mp4$/,'')+'.cues.json', JSON.stringify(cues,null,1));

  // ── Audio: music bed + SFX cues ─────────────────────────────────────────
  const inputs=['-i',tmp]; const parts=[]; let n=1;
  if(music){ inputs.push('-i',music); parts.push(`[${n}:a]atrim=start=${from},asetpts=PTS-STARTPTS,volume=${musicGain}[m]`); n++; }
  const sfxLabels=[];
  if(sfxDir){ for(const c of cues){ const f=['wav','mp3','aif'].map(e=>path.join(sfxDir,`${c.name}.${e}`)).find(fs.existsSync); if(!f) continue;
      inputs.push('-i',f); const ms=Math.round((c.at-from)*1000); parts.push(`[${n}:a]adelay=${ms}|${ms},volume=${c.gain}[s${n}]`); sfxLabels.push(`[s${n}]`); n++; } }
  if(parts.length){
    const mixIn=(music?['[m]']:[]).concat(sfxLabels);
    const fc=parts.join(';')+`;${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=longest,alimiter=limit=0.95,apad,atrim=0:${(to-from).toFixed(3)}[a]`;
    execFileSync('ffmpeg',['-v','error','-y',...inputs,'-filter_complex',fc,'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','256k','-t',(to-from).toFixed(3),output]);
    if(!kv.keep) fs.unlinkSync(tmp);
  } else fs.renameSync(tmp, output);
  console.log('→', output);
})().catch(e=>{console.error(e);process.exit(1);});
