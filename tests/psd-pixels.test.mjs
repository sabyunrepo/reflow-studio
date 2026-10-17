import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRasterMask, solidStroke } from '../psd-pixels.mjs';

test('mask uses greyscale coverage, document offset and default outside value',()=>{
  const pixels=new Uint8ClampedArray([20,30,40,255,20,30,40,255,20,30,40,255]);
  applyRasterMask(pixels,3,1,100,200,{left:101,top:200,width:2,height:1,defaultColor:255,pixels:new Uint8ClampedArray([0,0,0,255,128,128,128,255])});
  assert.deepEqual([pixels[3],pixels[7],pixels[11]],[255,0,128]);
  assert.deepEqual([...pixels.slice(0,3)],[20,30,40]);
});
test('disabled masks preserve original pixels',()=>{
  const pixels=new Uint8ClampedArray([1,2,3,255]);
  applyRasterMask(pixels,1,1,0,0,{disabled:true,pixels:new Uint8ClampedArray(4)});
  assert.equal(pixels[3],255);
});
test('inside stroke adds a border without changing the silhouette',()=>{
  const pixels=new Uint8ClampedArray(5*5*4);
  for(let y=1;y<4;y++)for(let x=1;x<4;x++)pixels[(y*5+x)*4+3]=255;
  solidStroke(pixels,5,5,1,{r:255,g:255,b:255},1,false);
  assert.deepEqual([...pixels.slice((1*5+2)*4,(1*5+2)*4+4)],[255,255,255,255]);
  assert.deepEqual([...pixels.slice((2*5+2)*4,(2*5+2)*4+4)],[0,0,0,255]);
  assert.equal(pixels[3],0);
});
test('outside stroke expands alpha while retaining source colour',()=>{
  const pixels=new Uint8ClampedArray(5*5*4);pixels[(2*5+2)*4+3]=255;
  solidStroke(pixels,5,5,1,{r:255,g:0,b:0},.5,true);
  assert.deepEqual([...pixels.slice((2*5+1)*4,(2*5+1)*4+4)],[255,0,0,128]);
  assert.deepEqual([...pixels.slice((2*5+2)*4,(2*5+2)*4+4)],[0,0,0,255]);
});
