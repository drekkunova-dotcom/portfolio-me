/* Personal brand / font checks. Load after motion.js. */
(function(){
 const config={family:'Onest',weights:[400,500,600,700,900],sample:'Интерфейс Действие Результат ЙЁЬ'};
 async function ready(){
  if(!document.fonts) throw new Error('Font Loading API is required for exact typography.');
  for(const weight of config.weights){
   const loaded=await document.fonts.load(`${weight} 24px "${config.family}"`,config.sample);
   if(!loaded.length) throw new Error(`Onest ${weight} did not load. Export stopped instead of substituting another font.`);
  }
  await document.fonts.ready;
  const faces=[...document.fonts].filter(f=>f.family.replace(/["']/g,'')===config.family&&f.status==='loaded');
  if(!faces.length) throw new Error('The local Onest font face is unavailable.');
  document.documentElement.dataset.fontsReady='true';
  return {family:config.family,weights:config.weights};
 }
 function phoneArtwork({src,width,height,x=0,y=0,scale=1}){
  if(!src||!width||!height) throw new Error('Native phone artwork requires src and real width/height.');
  const image=document.createElement('img');image.className='phone-artwork';image.src=src;image.alt='';
  image.width=width;image.height=height;
  Object.assign(image.style,{width:width+'px',height:height+'px',left:x+'px',top:y+'px',transform:`scale(${scale})`});
  return image;
 }
 window.ProjectBrand={...config,ready,phoneArtwork};
})();
