import test from "node:test";
import assert from "node:assert/strict";
import { Brain } from "../src/brain/brain.ts";
import { Random } from "../src/utils/random.ts";
import { Creature } from "../src/creature/creature.ts";
import { Simulation } from "../src/simulation/simulation.ts";
import { randomWeights, randomWeight } from "../src/utils/math.ts";

const brain = (value=0.2, rate=0.05, strength=0.1) => new Brain(Array(7).fill(value), Array(7).fill(value), Array(7).fill(value), Array(7).fill(value), value, value, value, value, rate, strength);
const genes = b => [...b.weightsMove,...b.weightsTurn,...b.weightsEat,...b.weightsReproduce,b.biasMove,b.biasTurn,b.biasEat,b.biasReproduce,b.mutationRate,b.mutationStrength];
const behavior = b => genes(b).slice(0,32);
function scripted(next=0, gaussian=1) {
  return {uniformCalls:0, gaussianCalls:0,
    next() {this.uniformCalls++; return typeof next === "function" ? next(this.uniformCalls-1) : next;},
    gaussian() {this.gaussianCalls++; return typeof gaussian === "function" ? gaussian(this.gaussianCalls-1) : gaussian;}};
}
function independent(a,b) {
  const refs = v => {const out=new Set(); const walk=x=>{if(x && typeof x === "object" && !out.has(x)){out.add(x);Object.values(x).forEach(walk);}};walk(v);return out;};
  const first=refs(a);for(const ref of refs(b)) assert.ok(!first.has(ref),"shared mutable reference");
}
const finite = v => {if(typeof v === "number") assert.ok(Number.isFinite(v));else if(v && typeof v === "object") Object.values(v).forEach(finite);};

test("genetic defaults and explicit zeros are preserved", () => {
  const b=new Brain([0], [0], [0], [0], 0, 0, 0, 0);
  assert.equal(b.mutationRate,0.05);assert.equal(b.mutationStrength,0.1);
  assert.equal(brain(0,0,0).mutationRate,0);assert.equal(brain(0,0,0).mutationStrength,0);
});

test("blend consumes an independent alpha per behavioral and strategy gene", () => {
  const a=brain(-2,0.2,0.1), b=brain(4,0.8,0.5), rng=scripted(i=>i/35);
  const beforeA=structuredClone(a),beforeB=structuredClone(b);
  const child=a.crossover(b,rng);
  assert.deepEqual(genes(child),genes(a).map((x,i)=>(i/35)*x+(1-i/35)*genes(b)[i]));
  assert.equal(rng.uniformCalls,34);assert.equal(rng.gaussianCalls,0);
  assert.deepEqual(structuredClone(a),beforeA);assert.deepEqual(structuredClone(b),beforeB);
  independent(a,child);independent(b,child);
});

test("blend remains within parental bounds and never clamps behavioral weights", () => {
  const a=brain(-100,0,0),b=brain(200,1,10),rng=new Random(42);
  for(let j=0;j<100;j++) {
    const child=a.crossover(b,rng);
    for(let i=0;i<34;i++) assert.ok(genes(child)[i]>=Math.min(genes(a)[i],genes(b)[i]) && genes(child)[i]<=Math.max(genes(a)[i],genes(b)[i]));
    assert.ok(behavior(child).some(g=>Math.abs(g)>1));
  }
});

test("identical parents and self crossover preserve genes exactly with fresh arrays", () => {
  const a=brain(0.1,0.1,0.1), b=brain(0.1,0.1,0.1);
  for(const parent of [a,b]) {
    const rng=scripted(0.3);const child=a.crossover(parent,rng);
    assert.deepEqual(genes(child),genes(a));independent(a,child);assert.equal(rng.uniformCalls,34);
  }
});

for(const field of ["weightsMove","weightsTurn","weightsEat","weightsReproduce"]) {
  test(`mismatched ${field} is rejected before consuming RNG`, () => {
    const a=brain(),b=brain();b[field].pop();const rng=scripted();
    assert.throws(()=>a.crossover(b,rng),RangeError);assert.equal(rng.uniformCalls,0);
  });
}

for(const [rate,strength] of [[0,0.1],[1,0],[0,0]]) {
  test(`mutation rate ${rate}, strength ${strength} preserves genome and copies arrays`, () => {
    const a=brain(0.2,rate,strength), rng=scripted(0,2), before=structuredClone(a);
    const child=a.mutate(rng);assert.deepEqual(structuredClone(child),before);assert.deepEqual(structuredClone(a),before);independent(a,child);
    assert.equal(rng.uniformCalls,34);assert.equal(rng.gaussianCalls,rate===1?34:0);
  });
}

test("rate one mutates every behavioral gene using the original strength", () => {
  const a=brain(2,1,0.1),rng=scripted(0.5,2),before=structuredClone(a),child=a.mutate(rng);
  assert.deepEqual(behavior(child),Array(32).fill(2.2));assert.equal(child.mutationRate,1);
  assert.equal(child.mutationStrength,0.1+2*0.1);assert.equal(rng.gaussianCalls,34);
  assert.deepEqual(structuredClone(a),before);independent(a,child);
});

test("each mutation decision uses strict probability and only successes request gaussian", () => {
  const a=brain(2,0.5,0.1), rng=scripted(i=>i%2?0.5:0.49,1), child=a.mutate(rng);
  assert.deepEqual(behavior(child),Array.from({length:32},(_,i)=>i%2?2:2.1));
  assert.equal(child.mutationRate,0.6);assert.equal(child.mutationStrength,0.1);
  assert.equal(rng.uniformCalls,34);assert.equal(rng.gaussianCalls,17);
});

test("strategy mutations use original rate and strength, allowing exact zero", () => {
  const a=brain(0,1,0.1),rng=scripted(0.5,i=>i===32?-20:2),child=a.mutate(rng);
  assert.equal(child.mutationRate,0);assert.equal(child.mutationStrength,0.1+2*0.1);
  assert.equal(rng.gaussianCalls,34);
});

test("strategy lower and upper bounds are enforced without epsilon floors", () => {
  const a=brain(0,1,0.1);
  const lower=a.mutate(scripted(0,-20));assert.equal(lower.mutationRate,0);assert.equal(lower.mutationStrength,0);
  const upper=a.mutate(scripted(0,20));assert.equal(upper.mutationRate,1);assert.equal(upper.mutationStrength,2.1);
});

for(const invalid of [NaN,Infinity,-Infinity]) {
  test(`non-finite genome values ${invalid} are rejected at construction`, () => {
    for(let i=0;i<8;i++) {
      const args=[[0],[0],[0],[0],0,0,0,0];if(i<4)args[i]=[invalid];else args[i]=invalid;
      assert.throws(()=>new Brain(...args),RangeError);
    }
  });
}
for(const rate of [-0.01,1.01,NaN,Infinity]) {
  test(`invalid mutation rate ${rate} is rejected`,()=>assert.throws(()=>brain(0,rate,0.1),RangeError));
}
for(const strength of [-0.01,NaN,Infinity]) {
  test(`invalid mutation strength ${strength} is rejected`,()=>assert.throws(()=>brain(0,0.1,strength),RangeError));
}

test("public fields corrupted after construction fail before genetic RNG consumption", () => {
  for(const change of [b=>b.weightsEat[1]=NaN,b=>b.biasTurn=Infinity,b=>b.mutationRate=2,b=>b.mutationStrength=-1,b=>delete b.weightsMove[0]]) {
    const a=brain(),b=brain();change(b);const rng=scripted();
    assert.throws(()=>a.crossover(b,rng),RangeError);assert.throws(()=>b.mutate(rng),RangeError);
    assert.equal(rng.uniformCalls,0);
  }
});

test("overflowing mutation fails instead of returning an infinite descendant", () => {
  const a=brain(Number.MAX_VALUE,1,Number.MAX_VALUE),before=structuredClone(a);
  assert.throws(()=>a.mutate(scripted(0,2)),RangeError);assert.deepEqual(structuredClone(a),before);
});

test("invalid uniform or gaussian outputs cannot contaminate descendants", () => {
  const a=brain(0,1,0.1);
  for(const value of [NaN,Infinity,-0.1,1]) {
    assert.throws(()=>a.crossover(a,scripted(value)),RangeError);
    assert.throws(()=>a.mutate(scripted(value)),RangeError);
  }
  for(const value of [NaN,Infinity,-Infinity]) assert.throws(()=>a.mutate(scripted(0,value)),RangeError);
});

test("Box-Muller pair and cache agree with independent uniform draws", () => {
  const a=new Random(12345),reference=new Random(12345),u=reference.next(),v=reference.next();
  const radius=Math.sqrt(-2*Math.log(u));
  assert.equal(a.gaussian(),radius*Math.cos(2*Math.PI*v));
  assert.equal(a.next(),reference.next()); // A uniform call must not discard the pending Gaussian.
  assert.equal(a.gaussian(),radius*Math.sin(2*Math.PI*v));
  assert.equal(a.next(),reference.next());
});

test("cached Gaussian zero is returned without extra draws", t => {
  const rng=new Random(1);const values=[0.5,0];
  const spy=t.mock.method(rng,"next",()=>{assert.ok(values.length);return values.shift();});
  assert.ok(Number.isFinite(rng.gaussian()));assert.equal(rng.gaussian(),0);assert.equal(spy.mock.callCount(),2);
});

test("Gaussian cache belongs to each instance and mixed sequences replay exactly", () => {
  const a=new Random(1),b=new Random(1),noise=new Random(2);
  for(let i=0;i<10000;i++) {
    const x=i%3?a.gaussian():a.next();noise.gaussian();noise.next();
    const y=i%3?b.gaussian():b.next();assert.equal(x,y);assert.ok(Number.isFinite(x));
  }
  assert.deepEqual(structuredClone(a),structuredClone(b));
});

test("seeded Gaussian sample has broad normal-standard statistical bounds", t => {
  const rng=new Random(42);const n=100000;let sum=0,squares=0,positive=0,tails=0,pairs=0,previous=0;
  for(let i=0;i<n;i++) {
    const x=rng.gaussian();assert.ok(Number.isFinite(x));sum+=x;squares+=x*x;
    positive+=x>0?1:0;tails+=Math.abs(x)>2?1:0;if(i%2)pairs+=previous*x;previous=x;
  }
  const mean=sum/n,variance=squares/n-mean*mean,positiveFraction=positive/n,tailFraction=tails/n,pairMoment=pairs/(n/2);
  t.diagnostic(JSON.stringify({n,mean,variance,positiveFraction,tailFraction,pairMoment}));
  assert.ok(Math.abs(mean)<0.02);assert.ok(Math.abs(variance-1)<0.04);
  assert.ok(positiveFraction>0.48 && positiveFraction<0.52);
  assert.ok(tailFraction>0.04 && tailFraction<0.052);assert.ok(Math.abs(pairMoment)<0.03);
});

function universe(seed) {
  const rng=new Random(seed);
  const make=()=>new Brain(randomWeights(7,rng), randomWeights(7,rng), randomWeights(7,rng), randomWeights(7,rng), randomWeight(rng), randomWeight(rng), randomWeight(rng), randomWeight(rng), 0.6, 0.1);
  const creatures=[0,1].map(i=>new Creature(595-i*100,300,make(),100,45,0,100,100000,100000,1));
  return new Simulation({width:600,height:400},rng,creatures,0.4);
}
function generation(s) {
  const inherited=s.creatures[0].brain.crossover(s.creatures[1].brain,s.random);
  const before=structuredClone(inherited);const child=inherited.mutate(s.random);
  assert.deepEqual(structuredClone(inherited),before);independent(inherited,child);
  // Test harness only: replace one existing brain; no births or reproduction logic in Simulation.
  s.creatures[0].brain=child;s.update(1/60);
  assert.ok(child.mutationRate>=0 && child.mutationRate<=1 && child.mutationStrength>=0);
}
for(const seed of [1,12345,2147483646]) {
  test(`genetic replay seed ${seed}: 5000 generations plus simulation ticks`, t => {
    t.mock.method(Math,"random",()=>{throw new Error("global randomness");});
    const a=universe(seed),b=universe(seed),noise=universe(77);independent(a,b);
    const initial=structuredClone(a);
    for(let i=0;i<5000;i++) {
      if(i%2){generation(b);generation(a);}else{generation(a);generation(b);}
      if(i%31===0) generation(noise);
      const state=structuredClone(a);finite(state);assert.deepEqual(state,structuredClone(b),`generation ${i}`);
    }
    assert.notDeepEqual(structuredClone(a),initial);assert.ok(a.creatures.length >= 2);independent(a,b);
    assert.equal(a.random.gaussian(),b.random.gaussian());assert.equal(a.random.next(),b.random.next());
  });
}

test("different seeds diverge for the same genetic parents", () => {
  const a=brain(-1,0.6,0.2),b=brain(1,0.4,0.1);
  const run=seed=>{const rng=new Random(seed);return a.crossover(b,rng).mutate(rng);};
  assert.notDeepEqual(run(1),run(2));
});
