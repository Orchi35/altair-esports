export const NET_SETTLE_MS=1100;
export const netContact=result=>({x:250+500*result.targetX,y:180+177*result.targetY});

// A local impulse propagates through the mesh; attachment points stay fixed.
export function deformNetPoint(x,y,result,age){
 if(!result?.goal||age<=0||age>=NET_SETTLE_MS||x<=250||x>=750||y<=180||y>=357)return {x,y};
 const hit=netContact(result),dx=x-hit.x,dy=y-hit.y;
 const distance=Math.hypot(dx,dy*1.35),seconds=age/1000;
 const local=Math.exp(-(dx*dx/9000+dy*dy/3800));
 const waveAge=seconds-distance/700;
 const wave=waveAge>0?Math.sin(waveAge*19)*Math.exp(-waveAge*4):0;
 const edge=Math.pow(Math.max(0,Math.sin(Math.PI*(x-250)/500)*Math.sin(Math.PI*(y-180)/177)),.5);
 const fade=(1-age/NET_SETTLE_MS)**2;
 const pulse=(local*Math.sin(Math.min(1,seconds/.22)*Math.PI)*21+wave*8)*edge*fade;
 return {x:x+pulse*(.45+dx/180),y:y+pulse*(.8+dy/120)};
}

export function sampleGoalBall(result,age){
 const contact=netContact(result),t=Math.max(0,Math.min(1,age/NET_SETTLE_MS));
 const pocket=deformNetPoint(contact.x,contact.y,result,age);
 const fall=Math.min(1,Math.max(0,(t-.13)/.72));
 return {x:pocket.x,y:pocket.y+Math.max(0,345-contact.y)*fall*fall,scale:.46,rotation:result.shotType==='panenka'?-150-t*70:(result.perfect?900:540)+t*100};
}
