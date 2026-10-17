// PSD masks store greyscale coverage in the red channel, not RGBA alpha.
export function applyRasterMask(pixels, width, height, left, top, mask) {
  if (!mask || mask.disabled || !mask.pixels) return;
  const fallback = mask.defaultColor ?? 255;
  for (let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const mx=left+x-mask.left, my=top+y-mask.top;
    const coverage=mx>=0 && my>=0 && mx<mask.width && my<mask.height ? mask.pixels[(my*mask.width+mx)*4] : fallback;
    const index=(y*width+x)*4+3;
    pixels[index]=Math.round(pixels[index]*coverage/255);
  }
}

// Separable square morphology for the MVP's solid colour strokes.
export function solidStroke(pixels, width, height, radius, color, opacity=1, outside=false) {
  radius=Math.ceil(radius);
  if (!(radius>0 && radius<=64)) return;
  const horizontal=new Uint8ClampedArray(width*height), alpha=new Uint8ClampedArray(width*height);
  const initial=outside?0:255, choose=outside?Math.max:Math.min;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    let value=initial;
    for(let dx=-radius;dx<=radius;dx++) value=choose(value,x+dx<0||x+dx>=width?0:pixels[(y*width+x+dx)*4+3]);
    horizontal[y*width+x]=value;
  }
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    let value=initial;
    for(let dy=-radius;dy<=radius;dy++) value=choose(value,y+dy<0||y+dy>=height?0:horizontal[(y+dy)*width+x]);
    alpha[y*width+x]=value;
  }
  const rgb=[color.r,color.g,color.b];
  for(let i=0;i<alpha.length;i++) {
    const index=i*4, original=pixels[index+3]/255;
    const edge=(outside?alpha[i]/255-original:original-alpha[i]/255)*opacity;
    const resultAlpha=outside?original+edge*(1-original):original;
    if (!resultAlpha) continue;
    for(let c=0;c<3;c++) pixels[index+c]=outside
      ? (pixels[index+c]*original+rgb[c]*edge*(1-original))/resultAlpha
      : pixels[index+c]*(1-edge/Math.max(original,1/255))+rgb[c]*edge/Math.max(original,1/255);
    pixels[index+3]=Math.round(resultAlpha*255);
  }
}
