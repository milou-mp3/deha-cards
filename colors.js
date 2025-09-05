export function getDominantColor(img) {
  const w = 40, h = 40;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  let data;
  try { data = ctx.getImageData(0, 0, w, h).data; }
  catch(e) { console.warn("CORS pb"); return null; }

  const freq = new Map();

  for(let i=0;i<data.length;i+=4){
    const r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
    if(a<128) continue;
    if(r>200 && g>200 && b>200) continue;

    const key = `${Math.floor(r/24)*24},${Math.floor(g/24)*24},${Math.floor(b/24)*24}`;
    if(!freq.has(key)) freq.set(key,{count:0,r,g,b});
    freq.get(key).count++;
  }

  if(freq.size===0) return "#f0f0f0";

  let best = null;
  for(const v of freq.values()){
    if(!best || v.count>best.count) best=v;
  }

  const {s} = rgbToHsv(best.r,best.g,best.b);
  if(s<0.3){
    let maxSat = -1;
    for(const v of freq.values()){
      const hsv = rgbToHsv(v.r,v.g,v.b);
      if(hsv.s>maxSat){
        maxSat=hsv.s;
        best=v;
      }
    }
  }

  return `rgb(${best.r},${best.g},${best.b})`;
}

function rgbToHsv(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  const d=max-min;
  let h=0,s=0,v=max;
  if(d!==0){
    s=d/max;
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      case b: h=(r-g)/d+4; break;
    }
    h/=6;
  }
  return {h,s,v};
}

function getTextColor(rgbString) {
  const [r, g, b] = rgbString.split(",").map(Number);
  const brightness = (r*299 + g*587 + b*114) / 1000;
  return brightness > 150 ? "#000000" : "#ffffff";
}
