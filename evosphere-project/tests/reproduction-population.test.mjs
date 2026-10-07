import test from "node:test";
import assert from "node:assert/strict";
import { Brain } from "../src/brain/brain.ts";
import { Creature } from "../src/creature/creature.ts";
import { Food } from "../src/food/food.ts";
import { Simulation } from "../src/simulation/simulation.ts";
import { Random } from "../src/utils/random.ts";
import { createInitialPopulation } from "../src/population/createInitialPopulation.ts";
import { getCreatureSensors } from "../src/sensors/sensors.ts";

const world={width:600,height:400};
const zeros=()=>Array(7).fill(0);
const makeBrain=(intent=1)=>new Brain(zeros(),zeros(),zeros(),zeros(),-1000,0,0,intent,0,0.1);
const creature=({x=100,y=100,max=100,energy=max,intent=1}={})=>new Creature(x,y,makeBrain(intent),0,0,0,100,max,energy,0);
const simulation=(creatures,seed=42)=>new Simulation({...world},new Random(seed),creatures,0);
const genes=b=>[...b.weightsMove,...b.weightsTurn,...b.weightsEat,...b.weightsReproduce,b.biasMove,b.biasTurn,b.biasEat,b.biasReproduce,b.mutationRate,b.mutationStrength];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function refs(value,result=new Set()) {if(value&&typeof value==='object'&&!result.has(value)){result.add(value);Object.values(value).forEach(v=>refs(v,result));}return result;}
function independent(a,b){const first=refs(a);for(const value of refs(b))assert.ok(!first.has(value));}
function finite(value){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(finite);}

test("all seven inputs independently feed all four outputs",()=>{
  for(let input=0;input<7;input++) {
    const weights=zeros();weights[input]=0.75;
    const b=new Brain(weights,weights,weights,weights,0,0,0,0);
    const values=zeros();values[input]=1;const outputs=b.think(values);
    for(const output of ['move','eat','reproduce']) close(outputs[output],(Math.tanh(0.75)+1)/2);
    close(outputs.turn,Math.tanh(0.75));assert.equal(genes(b).length,34);
  }
});

test("Simulation supplies the seven named inputs in the required order",t=>{
  const a=creature({x:595,y:100,energy:75}),b=creature({x:595,y:110,intent:0});
  const s=simulation([a,b]);s.food=[new Food(5,100)];
  const spy=t.mock.method(a.brain,'think',()=>({move:0,turn:0,eat:0,reproduce:0}));s.update(0.1);
  assert.deepEqual(spy.mock.calls[0].arguments[0],[0,0.1,1,0.75,0.5,0.1,1]);
});

for(const [name,x,y,angle,distance] of [['horizontal',5,395,0,10],['vertical',595,5,0.5,10],['diagonal',5,5,0.25,Math.sqrt(200)]]) {
  test(`creature sensor sees another creature across ${name} seam`,()=>{
    const a=creature({x:595,y:395}),b=creature({x,y});const inputs=getCreatureSensors(a,[a,b],world);
    close(inputs[0],angle);close(inputs[1],distance/100);assert.equal(inputs[2],1);
  });
}

test("creature sensors ignore self by identity, retain colocated others and respect vision",()=>{
  const a=creature(),b=creature();
  assert.deepEqual(getCreatureSensors(a,[a],world),[0,1,0]);
  assert.deepEqual(getCreatureSensors(a,[a,b],world),[0,0,1]);
  b.x=200;assert.deepEqual(getCreatureSensors(a,[a,b],world),[0,1,1]);
  b.x=201;assert.deepEqual(getCreatureSensors(a,[a,b],world),[0,1,0]);
});

for(const [name,maxA,energyA,maxB,energyB,children] of [
 ['both at own threshold',100,50,200,100,1],
 ['partner below own threshold',100,100,200,75,0],
 ['first below own threshold',200,75,100,100,0],
 ['smaller partner at own threshold',200,100,100,50,1],
 ['first just insufficient',100,49.999,100,100,0],
 ['partner just insufficient',100,100,100,49.999,0],
]) {
 test(`reproduction energy: ${name}`,()=>{
  const a=creature({max:maxA,energy:energyA}),b=creature({x:105,max:maxB,energy:energyB});const s=simulation([a,b]);s.update(0.1);
  assert.equal(s.creatures.length,2+children);assert.equal(a.energy,energyA-children*maxA/4);assert.equal(b.energy,energyB-children*maxB/4);
 });
}

for(const [aIntent,bIntent] of [[0,1],[1,0],[-1,1],[1,-1],[0,0]]) {
 test(`both intentions must exceed 0.5: biases ${aIntent}, ${bIntent}`,()=>{
  const a=creature({intent:aIntent}),b=creature({intent:bIntent});const s=simulation([a,b]);s.update(0.1);
  assert.equal(s.creatures.length,2);assert.equal(a.energy,100);assert.equal(b.energy,100);
 });
}

for(const [name,ax,ay,bx,by,count] of [
 ['inside',100,100,119.99,100,3],['exact boundary',100,100,120,100,3],['outside',100,100,120.01,100,3],
 ['horizontal seam',595,100,5,100,3],['vertical seam',100,395,100,5,3],['diagonal seam',595,395,5,5,3]
]) {
 test(`reproduction distance: ${name}`,()=>{const s=simulation([creature({x:ax,y:ay}),creature({x:bx,y:by})]);s.update(0.1);assert.equal(s.creatures.length,count);});
}

test("no self reproduction and at most one pairing per individual per tick",()=>{
  const alone=simulation([creature()]);alone.update(0.1);assert.equal(alone.creatures.length,1);
  for(const count of [3,4]) {
    const parents=Array.from({length:count},(_,i)=>creature({x:100+i}));const s=simulation(parents);s.update(0.1);
    assert.equal(s.creatures.length,count+Math.floor(count/2));
    assert.equal(parents.filter(c=>c.energy===75).length,2*Math.floor(count/2));
  }
});

test("nearest ineligible partner does not hide a farther eligible partner",()=>{
  const a=creature(),b=creature({x:101,energy:20}),c=creature({x:110});const s=simulation([a,b,c]);s.update(0.1);
  assert.equal(s.creatures.length,4);assert.equal(a.energy,75);assert.equal(b.energy,20);assert.equal(c.energy,75);
});

test("eligibility is evaluated after food and metabolism",()=>{
  const a=creature({energy:50}),b=creature();a.metabolism=1;const s=simulation([a,b]);s.update(0.1);assert.equal(s.creatures.length,2);
  const c=creature({energy:40}),d=creature();c.brain.biasEat=1;const fed=simulation([c,d]);fed.food=[new Food(100,100)];fed.update(0.1);
  assert.equal(fed.creatures.length,3);assert.equal(c.energy,45);
});

test("newborn is appended last, inherits first parent's physical fields and acts next tick only",t=>{
  const a=creature({x:595,y:100}),b=creature({x:5,y:100,max:200});a.speed=40;a.direction=30;a.turnSpeed=20;a.visionRange=90;
  b.speed=200;const s=simulation([a,b]);s.update(0.1);const child=s.creatures[2];
  assert.deepEqual(s.creatures.slice(0,2),[a,b]);
  for(const key of ['x','y','speed','turnSpeed','direction','visionRange','maxEnergy','metabolism'])assert.equal(child[key],a[key]);
  assert.equal(child.energy,50);assert.equal(child.move,1);assert.equal(child.turn,1);
  assert.equal(a.energy,75);assert.equal(b.energy,150);independent(child.brain,a.brain);independent(child.brain,b.brain);
  const spy=t.mock.method(child.brain,'think',child.brain.think);s.update(0.1);assert.equal(spy.mock.callCount(),1);
});

test("child brain is exactly crossover then mutation with the same RNG and cache",()=>{
  const a=creature(),b=creature({x:105});a.brain.mutationRate=1;b.brain.mutationRate=1;
  b.brain.weightsTurn[6]=2;b.brain.biasEat=-2;
  const beforeA=structuredClone(a.brain),beforeB=structuredClone(b.brain);
  const s=simulation([a,b]);const reference=new Random(42);s.random.gaussian();reference.gaussian();
  const expected=a.brain.crossover(b.brain,reference).mutate(reference);s.update(0.1);
  assert.deepEqual(s.creatures[2].brain,expected);assert.deepEqual(structuredClone(s.random),structuredClone(reference));
  assert.deepEqual(structuredClone(a.brain),beforeA);assert.deepEqual(structuredClone(b.brain),beforeB);
});

test("zero or non-finite energy capacity cannot create free or zero-energy offspring",()=>{
  for(const max of [0,Infinity]) {
    const a=creature({max,energy:100}),b=creature();const s=simulation([a,b]);s.update(0.1);
    assert.equal(s.creatures.length,2);assert.equal(a.energy,100);assert.equal(b.energy,100);
  }
});

test("failed child genetics does not charge either parent",t=>{
  const a=creature(),b=creature();a.brain.mutationRate=1;b.brain.mutationRate=1;
  a.brain.mutationStrength=Number.MAX_VALUE;b.brain.mutationStrength=Number.MAX_VALUE;
  const s=simulation([a,b]);t.mock.method(s.random,'gaussian',()=>2);
  assert.throws(()=>s.update(0.1),RangeError);assert.equal(a.energy,100);assert.equal(b.energy,100);assert.equal(s.creatures.length,2);
});

test("reproduce weights and bias are validated at construction and before RNG consumption",()=>{
  for(const value of [NaN,Infinity,-Infinity]) {
    const bad=zeros();bad[6]=value;
    assert.throws(()=>new Brain(zeros(),zeros(),zeros(),bad,0,0,0,0),RangeError);
    assert.throws(()=>new Brain(zeros(),zeros(),zeros(),zeros(),0,0,0,value),RangeError);
  }
  for(const corrupt of [b=>b.weightsReproduce[6]=NaN,b=>b.biasReproduce=Infinity,b=>delete b.weightsReproduce[0]]) {
    const a=makeBrain(),b=makeBrain();corrupt(b);const rng=new Random(42),before=structuredClone(rng);
    assert.throws(()=>a.crossover(b,rng),RangeError);assert.deepEqual(structuredClone(rng),before);
    assert.throws(()=>b.mutate(rng),RangeError);assert.deepEqual(structuredClone(rng),before);
  }
});

for(const amount of [-1,0.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) {
 test(`invalid initial amount ${amount} is rejected before RNG consumption`,()=>{const rng=new Random(1),before=structuredClone(rng);assert.throws(()=>createInitialPopulation(amount,world,rng),RangeError);assert.deepEqual(structuredClone(rng),before);});
}

test("zero population creates nothing and consumes no random values",()=>{const rng=new Random(1),before=structuredClone(rng);assert.deepEqual(createInitialPopulation(0,world,rng),[]);assert.deepEqual(structuredClone(rng),before);});

test("invalid world dimensions cannot produce invalid initial positions",()=>{
  for(const value of [0,-1,NaN,Infinity])for(const key of ['width','height']) {
    const rng=new Random(1),before=structuredClone(rng);assert.throws(()=>createInitialPopulation(1,{...world,[key]:value},rng),RangeError);assert.deepEqual(structuredClone(rng),before);
  }
});

test("initial population reproduces all 34 genes and positions without shared objects",()=>{
 const a=new Random(12345),b=new Random(12345),p=createInitialPopulation(20,world,a),q=createInitialPopulation(20,world,b);
 assert.deepEqual(p,q);independent(p,q);assert.notDeepEqual(p[0].brain,p[1].brain);
 for(let i=0;i<p.length;i++) {
  const c=p[i];finite(c);assert.equal(genes(c.brain).length,34);
  for(const key of ['weightsMove','weightsTurn','weightsEat','weightsReproduce'])assert.equal(c.brain[key].length,7);
  assert.ok(c.x>=0&&c.x<600&&c.y>=0&&c.y<400&&c.direction>=0&&c.direction<360);
  assert.equal(c.energy,c.maxEnergy);assert.equal(c.brain.mutationRate,0.05);assert.equal(c.brain.mutationStrength,0.1);
  for(let j=0;j<i;j++)independent(c,p[j]);
 }
 const ref=new Random(12345);for(let i=0;i<20*35;i++)ref.next();assert.equal(a.next(),ref.next());
 assert.notDeepEqual(p,createInitialPopulation(20,world,new Random(54321)));
});

for(const seed of [1,12345]) {
 test(`population and real sexual reproduction replay for 1200 ticks, seed ${seed}`,t=>{
  t.mock.method(Math,'random',()=>{throw new Error('hidden global random');});
  const setup=()=>{
    const rng=new Random(seed),population=createInitialPopulation(4,{width:16,height:16},rng);
    // Existing rules in a controlled fixture: guarantee initial mating intentions without changing energy requirements.
    for(const c of population){c.brain.weightsReproduce.fill(0);c.brain.biasReproduce=1;c.brain.mutationRate=0.2;}
    return new Simulation({width:16,height:16},rng,population,0.4);
  };
  const a=setup(),b=setup();independent(a,b);const originalParents=[...a.creatures];
  const spy=t.mock.method(a.creatures[0],'reproduce',a.creatures[0].reproduce);
  for(let tick=0;tick<1200;tick++){
    if(tick%2){b.update(1/60);a.update(1/60);}else{a.update(1/60);b.update(1/60);}
    // Method mocks are functions; compare domain data rather than mock instrumentation.
    const state=s=>({worldSize:{...s.worldSize},rng:structuredClone(s.random),foodSpawnTimer:s.foodSpawnTimer,foodSpawnInterval:s.foodSpawnInterval,foodSpawnChance:s.foodSpawnChance,
      food:s.food.map(f=>({...f})),creatures:s.creatures.map(c=>Object.fromEntries(Object.entries(c).filter(([,v])=>typeof v!=='function').map(([k,v])=>[k,structuredClone(v)])))});
    const actual=state(a);finite(actual);assert.deepEqual(actual,state(b),`tick ${tick}`);
    if(tick===0){assert.equal(a.creatures.length,6);assert.equal(spy.mock.callCount(),1);}
  }
  assert.ok(a.creatures.length>4);assert.equal(a.creatures.length,b.creatures.length);independent(a,b);
  assert.equal(a.random.gaussian(),b.random.gaussian());assert.equal(a.random.next(),b.random.next());
 });
}

test("Simulation keeps the energy input finite when maxEnergy and visionRange are zero",t=>{
  const c=creature({max:0,energy:1,intent:0});c.visionRange=0;const s=simulation([c]);
  const spy=t.mock.method(c.brain,'think',()=>({move:0,turn:0,eat:0,reproduce:0}));s.update(0.1);
  assert.deepEqual(spy.mock.calls[0].arguments[0],[0,1,0,0,0,1,0]);
});
