import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA, makeBuild, calculate, attributeCost, applySelection, normalizeBuild } from '../src/pages/builder/engine.js';

test('every catalog facility can be purchased at every level within budget', () => {
 for (const facility of DATA.facilities) for (const level of [1,2,3]) {
  const result=calculate({...makeBuild(),facilities:[{id:facility.id,level}]});
  assert.deepEqual(result.errors,[],`${facility.name_eng} level ${level}`);
  assert.equal(result.facilityCost,facility[`level_${level}_cost`]);
 }
});

test('facility budget counts selected levels once and releases removed purchases', () => {
 const build={...makeBuild(),budget:1.2,facilities:[{id:0,level:3}]};
 assert.equal(calculate(build).facilityCost,1200000);
 assert.deepEqual(calculate(build).errors,[]);
 assert.match(calculate({...build,budget:1.1}).errors.join(' '),/Facility budget/);
 assert.equal(calculate({...build,facilities:[{id:0,level:1}]}).facilityCost,200000);
 assert.equal(calculate({...build,facilities:[]}).facilityCost,0);
});

test('all archetype defaults are valid and level points accumulate', () => {
 for (const a of DATA.archetypes) assert.deepEqual(calculate(makeBuild(a.id)).errors, []);
 const b=makeBuild(); b.level=1; assert.equal(calculate(b).totalAP,100);
});
test('attribute and skill curves charge each purchased rating', () => {
 const b=makeBuild(); const from=b.attributes.finishing; b.attributes.finishing+=2; b.skillMoves++;
 const r=calculate(b); assert.equal(r.spentAP,attributeCost(b.archetypeId,'finishing',from,from+2)+attributeCost(b.archetypeId,'skillMoves',3,4));
 assert.equal(attributeCost(12,'skillMoves',3,4),15);
});
test('body, facility and mastery bonuses stack and can be disabled', () => {
 const b=makeBuild(); b.height--; b.facilities=[{id:0,level:3}]; b.mastery=10;
 const r=calculate(b); assert.equal(r.facilityCost,1200000); assert.equal(r.facilityPlaystyles[0].id,5);
 assert.ok(Object.keys(r.bodyModifiers).length); assert.ok(Object.keys(r.masteryModifiers).length);
 const plain=calculate(b,{body:false,facilities:false,mastery:false}); assert.deepEqual(plain.finalAttributes,plain.attributes);
});
test('selection raises requirements and invalid imports are rejected', () => {
 const b=makeBuild(); const selected=applySelection(b,'playstyle',0); assert.ok(selected.playstyles.includes(0)); assert.ok(selected.attributes.vision>=80); assert.equal(b.playstyles.length,0);
 assert.deepEqual(normalizeBuild(selected),selected);
 const invalid=makeBuild(); invalid.level=1; for(const k of Object.keys(invalid.attributes)) invalid.attributes[k]=DATA.archetypes.find(a=>a.id===12).maxAttributes[k];
 assert.throws(()=>normalizeBuild(invalid),/budget/);
});
test('reference body bands and goalkeeper filtering', () => {
 const field=makeBuild(12); field.height--; field.weight-=5;
 assert.deepEqual(calculate(field).bodyModifiers,{acceleration:2,sprintSpeed:0,agility:2,balance:0,jumping:-2,strength:-2});
 const keeper=makeBuild(1); keeper.height--; keeper.weight-=5;
 assert.deepEqual(calculate(keeper).bodyModifiers,{acceleration:2,sprintSpeed:0,strength:-2,gkDiving:0,gkHandling:0,gkReflexes:0});
 assert.equal(calculate(makeBuild(12)).categoryRatings.pace,72);
 assert.equal(calculate(makeBuild(1)).categoryRatings.pace,67);
});
test('facility unlocks only at level three; AI modifiers require toggle', () => {
 const b=makeBuild(1); b.facilities=[{id:0,level:2},{id:35,level:1}];
 let r=calculate(b); assert.deepEqual(r.facilityPlaystyles,[]); assert.equal(r.facilityModifiers.gkDiving,undefined);
 b.includeAI=true; r=calculate(b); assert.equal(r.facilityModifiers.gkDiving,3);
 b.facilities[0].level=3; assert.deepEqual(calculate(b).facilityPlaystyles,[{id:5,plus:false}]);
});
test('rejects incompatible and duplicate signature styles and sanitizes imports', () => {
 const b=makeBuild(12); b.playstyles=[34]; assert.match(calculate(b).errors.join(' '),/Goalkeeper/);
 b.playstyles=[b.archetypeId===12 ? 6 : 0]; assert.match(calculate(b).errors.join(' '),/signature/);
 const clean=makeBuild(); clean.extra='untrusted'; clean.facilities=[{id:0,level:1,extra:true}];
 const normalized=normalizeBuild(clean); assert.equal(normalized.extra,undefined); assert.equal(normalized.facilities[0].extra,undefined);
 clean.name='x'.repeat(101); assert.throws(()=>normalizeBuild(clean),/details/);
});
test('only offered facility budgets are accepted', () => {
 const b=makeBuild(); b.budget=100; assert.match(calculate(b).errors.join(' '),/budget/); assert.throws(()=>normalizeBuild(b),/budget/);
 for(const option of DATA.budgets) { b.budget=option.value; assert.deepEqual(calculate(b).errors,[]); }
});
test('both default signature slots exist at level one and upgrade by level', () => {
 const b=makeBuild(); b.level=1; let signature=calculate(b).signature; assert.deepEqual(signature,[{id:6,plus:false},{id:22,plus:false}]);
 b.level=55; signature=calculate(b).signature; assert.deepEqual(signature,[{id:6,plus:true},{id:22,plus:true}]);
});
test('Far Throw cannot be selected by an archetype without goalkeeper attributes', () => {
 const b=makeBuild(12);
 assert.throws(()=>applySelection(b,'playstyle',30),/maximum/);
 b.playstyles=[30];
 assert.match(calculate(b).errors.join(' '),/Requirements not met/);
 assert.throws(()=>normalizeBuild(b),/Requirements not met/);
});
