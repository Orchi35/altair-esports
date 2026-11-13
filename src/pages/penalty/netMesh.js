import {deformNetPoint,NET_SETTLE_MS} from './netMotion.js';

const COLS=36,ROWS=14;
const vertices=Array.from({length:(COLS+1)*(ROWS+1)},(_,i)=>[
 250+Math.floor(i/(ROWS+1))*500/COLS,180+(i%(ROWS+1))*177/ROWS,
]);
const strands=[
 ...Array.from({length:COLS+1},(_,c)=>Array.from({length:ROWS+1},(_,r)=>c*(ROWS+1)+r)),
 ...Array.from({length:ROWS+1},(_,r)=>Array.from({length:COLS+1},(_,c)=>c*(ROWS+1)+r)),
];
const format=(x,y)=>`${x.toFixed(2)} ${y.toFixed(2)}`;
const joinPaths=points=>strands.map(line=>line.map((index,j)=>`${j?'L':'M'}${points[index]}`).join(' '));
const restingPaths=joinPaths(vertices.map(([x,y])=>format(x,y)));

export function sampleNetPaths(result,age){
 if(!result?.goal||age<=0||age>=NET_SETTLE_MS)return restingPaths;
 // Both strand directions share vertices; deform and format each one once.
 return joinPaths(vertices.map(([x,y])=>{
  const point=deformNetPoint(x,y,result,age);
  return format(point.x,point.y);
 }));
}
