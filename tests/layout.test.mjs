import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planLayerLayout } from '../layout.mjs';

// Geometry extracted from the user's actual PSD. No artwork is bundled here.
const layers = JSON.parse(await readFile(new URL('./fashion-layer-bounds.json', import.meta.url)));
const source = { x: 0, y: 0, width: 2480, height: 3508 };
const plan = (width, height, rules = new Map()) => planLayerLayout({ layers, source, target: { width, height }, rules });
const box = (p, b) => ({ x: p.cx - b.width*p.scale/2, y: p.cy-b.height*p.scale/2, width:b.width*p.scale, height:b.height*p.scale });
const overlap = (a,b) => Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x) > .1 && Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y) > .1;
const close = (a,b) => assert.ok(Math.abs(a-b)<.001, `${a} != ${b}`);

test('original size round trip preserves every foreground layer', () => {
  const p = plan(2480,3508);
  assert.equal(p.mode,'source');
  for (const placement of p.placements) {
    const b = layers.find(l=>l.id===placement.id).bounds;
    close(placement.scale,1); close(placement.cx,b.x+b.width/2); close(placement.cy,b.y+b.height/2);
  }
});
for (const [width,height] of [[1080,1080],[1080,1920],[1200,628],[1600,400],[400,1600],[64,64]]) {
  test(`${width}x${height}: contained elements, uniform aspect, no new rectangle overlaps`, () => {
    const p=plan(width,height);
    assert.equal(p.placements.length,23); assert.equal(p.backgrounds.length,2);
    const placed=p.placements.map(n=>({ original:layers.find(l=>l.id===n.id).bounds, rect:box(n,layers.find(l=>l.id===n.id).bounds) }));
    for (const {rect} of placed) {
      assert.ok(rect.width>0 && rect.height>0);
      assert.ok(rect.x>=-.001 && rect.y>=-.001 && rect.x+rect.width<=width+.001 && rect.y+rect.height<=height+.001);
    }
    for (let i=0;i<placed.length;i++) for(let j=i+1;j<placed.length;j++) {
      if (!overlap(placed[i].original,placed[j].original)) assert.ok(!overlap(placed[i].rect,placed[j].rect), `new collision ${i}/${j}`);
    }
  });
}
test('landscape changes composition rather than containing a single portrait image', () => {
  const p=plan(1200,628);
  assert.equal(p.mode,'columns');
  const photo=p.placements.find(l=>l.id==='10'), title=p.placements.find(l=>l.id==='23');
  assert.ok(photo.cx<600 && title.cx>600);
  assert.notEqual(photo.scale,title.scale);
});
test('one layer override remains independent and follows canvas width', () => {
  for (const width of [800,1000,1200]) {
    const base=plan(width,1600);
    const rules=new Map([['10',{x:.5,y:.5,width:.25,maxHeight:.9}]]);
    const edited=plan(width,1600,rules), photo=edited.placements.find(l=>l.id==='10');
    close(photo.scale*layers.find(l=>l.id==='10').bounds.width,width*.25); close(photo.cx,width/2); close(photo.cy,800);
    assert.deepEqual(edited.placements.filter(l=>l.id!=='10'),base.placements.filter(l=>l.id!=='10'));
  }
});
test('rotation and edge position are contained after manual editing', () => {
  const p=plan(1200,628,new Map([['10',{x:1,y:0,width:.8,maxHeight:1,rotation:45}]]));
  const n=p.placements.find(l=>l.id==='10'), b=layers.find(l=>l.id==='10').bounds;
  const rw=(b.width+b.height)*Math.SQRT1_2*n.scale, rh=rw;
  assert.ok(n.cx-rw/2>=0 && n.cx+rw/2<=1200);
  assert.ok(n.cy-rh/2>=0 && n.cy+rh/2<=628);
});
