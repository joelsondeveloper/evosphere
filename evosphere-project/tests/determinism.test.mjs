import test from "node:test";
import assert from "node:assert/strict";
import { Random } from "../src/utils/random.ts";
import { randomWeight, randomWeights } from "../src/utils/math.ts";
import { Brain } from "../src/brain/brain.ts";
import { Creature } from "../src/creature/creature.ts";
import { Food } from "../src/food/food.ts";
import { Simulation } from "../src/simulation/simulation.ts";

const modulus = 2147483647;
const makeBrain = rng => new Brain(randomWeights(4,rng), randomWeights(4,rng), randomWeights(4,rng),
  randomWeight(rng), randomWeight(rng), randomWeight(rng));
const snapshot = simulation => structuredClone(simulation);
function assertFinite(value) {
  if (typeof value === "number") assert.ok(Number.isFinite(value));
  else if (value && typeof value === "object") Object.values(value).forEach(assertFinite);
}
function references(value, found = new Set()) {
  if (value && typeof value === "object" && !found.has(value)) {
    found.add(value); Object.values(value).forEach(child => references(child,found));
  }
  return found;
}
function assertIndependent(a,b) {
  const first = references(a);
  for (const value of references(b)) assert.ok(!first.has(value), "experiments share a mutable object");
}
function universe(seed) {
  // Exactly one fresh generator per independent universe, reused for all brains and spawning.
  const random = new Random(seed);
  const creatures = [0,1,2].map(i => new Creature(595-i*100,395-i*100,makeBrain(random),
    100,45,i*90,100,10000,10000,1));
  const simulation = new Simulation({width:600,height:400},random,creatures,0.4);
  simulation.foodSpawnInterval = 0.5;
  simulation.food = [new Food(5,395),new Food(300,200)];
  return simulation;
}

for (const seed of [0,-1,-2147483647,0.5,1.5,NaN,Infinity,-Infinity,2147483647,2147483648,Number.MAX_SAFE_INTEGER]) {
  test(`reject invalid seed ${seed}`, () => assert.throws(() => new Random(seed),RangeError));
}

test("Park-Miller seed 1 matches fixed reference states", () => {
  const random = new Random(1);
  const states = [16807,282475249,1622650073,984943658,1144108930];
  assert.deepEqual(states.map(() => random.next()),states.map(state => state/modulus));
});

for (const seed of [1,12345,2147483646]) {
  test(`seed ${seed}: 100000 exact independent draws, range and BigInt oracle`, () => {
    const a = new Random(seed); const b = new Random(seed); let state = BigInt(seed);
    assert.notEqual(a,b);
    for (let i=0;i<100000;i++) {
      state = state * 16807n % 2147483647n;
      const value = a.next();
      assert.equal(value,b.next()); assert.equal(value,Number(state)/modulus);
      assert.ok(Number.isFinite(value) && value >= 0 && value < 1);
    }
  });
}

test("different seeds produce different sequences", () => {
  const sequence = seed => {const rng = new Random(seed); return Array.from({length:100},() => rng.next());};
  assert.notDeepEqual(sequence(1),sequence(2));
  assert.notDeepEqual(sequence(12345),sequence(2147483646));
});

test("advancing an unrelated generator cannot change another sequence", () => {
  const a = new Random(42); const reference = new Random(42); const unrelated = new Random(42);
  for (let i=0;i<1000;i++) {unrelated.next(); unrelated.next(); assert.equal(a.next(),reference.next());}
});

test("weights are exact, bounded and consume the supplied stream without restarting", () => {
  const a = new Random(42); const b = new Random(42); const oracle = new Random(42);
  for (let i=0;i<100;i++) {
    assert.equal(randomWeight(a),randomWeight(b)); oracle.next();
    const weights = randomWeights(12,a);
    assert.deepEqual(weights,randomWeights(12,b));
    assert.deepEqual(weights,Array.from({length:12},() => oracle.next()*2-1));
    assert.ok(weights.every(weight => weight >= -1 && weight < 1));
  }
  assert.equal(a.next(),oracle.next());
});

test("empty or invalid weight requests do not advance the generator", () => {
  const a = new Random(42); const b = new Random(42);
  assert.deepEqual(randomWeights(0,a),[]);
  for (const count of [-1,0.5,NaN,Infinity]) assert.throws(() => randomWeights(count,a),RangeError);
  assert.equal(a.next(),b.next());
});

test("multiple brains reproduce exactly with independent arrays and successive draws", () => {
  const a = new Random(42); const b = new Random(42);
  const first = Array.from({length:20},() => makeBrain(a));
  const second = Array.from({length:20},() => makeBrain(b));
  assertIndependent(first,second); assert.deepEqual(first,second);
  assert.notDeepEqual(first[0],first[1]);
  for (let i=0;i<first.length;i++) assert.deepEqual(first[i].think([0.2,0.5,1,0.9]),second[i].think([0.2,0.5,1,0.9]));
  first[0].weightsMove[0] += 1;
  assert.notDeepEqual(first[0],second[0]);
});

for (const ticks of [600,12000]) {
  test(`independent universes remain exactly equal at every one of ${ticks} ticks`, (t) => {
    t.mock.method(Math,"random",() => {throw new Error("hidden global randomness");});
    const a = universe(12345); const b = universe(12345); const unrelated = universe(77);
    assertIndependent(a,b); assert.deepEqual(snapshot(a),snapshot(b));
    const initial = snapshot(a);
    for (let i=0;i<ticks;i++) {
      // Alternate scheduling; an unrelated universe consumes its own sequence between the pair.
      const first = i%2 ? b : a; const second = i%2 ? a : b;
      first.update(1/60); if (i%7 === 0) unrelated.update(1/60); second.update(1/60);
      const state = snapshot(a); assertFinite(state);
      assert.deepEqual(state,snapshot(b),`divergence at tick ${i+1}`);
    }
    assert.notDeepEqual(snapshot(a),initial);
    assert.equal(a.creatures.length,3); // The long run must not collapse into an empty-world comparison.
    assertIndependent(a,b); assert.equal(a.random.next(),b.random.next());
  });
}

test("replaying after a previous completed experiment yields the same state", () => {
  const run = () => {const s = universe(9876); for(let i=0;i<1200;i++) s.update(1/60); return snapshot(s);};
  assert.deepEqual(run(),run());
});

test("different seeds diverge via spawning even with identical nonrandom initial state", () => {
  const a = new Simulation({width:600,height:400},new Random(1),[],1);
  const b = new Simulation({width:600,height:400},new Random(2),[],1);
  assert.deepEqual(a.food,b.food); a.update(1); b.update(1);
  assert.equal(a.food.length,1); assert.equal(b.food.length,1);
  assert.notDeepEqual(a.food,b.food);
});

test("food spawn event ticks and coordinates match an independent integer oracle", () => {
  const a = new Simulation({width:800,height:400},new Random(12345),[],0.4);
  const b = new Simulation({width:800,height:400},new Random(12345),[],0.4);
  assertIndependent(a,b);
  let state = 12345n; const next = () => {state=state*16807n%2147483647n; return Number(state)/modulus;};
  const expected = []; const eventsA = []; const eventsB = [];
  for (let tick=1;tick<=400;tick++) {
    if (tick%4 === 0 && next()<0.4) expected.push({tick,x:next()*800,y:next()*400,energy:30});
    for (const [s,events] of [[a,eventsA],[b,eventsB]]) {
      const count = s.food.length; s.update(0.25);
      for (const food of s.food.slice(count)) events.push({tick,...food});
    }
    assert.deepEqual(eventsA,expected); assert.deepEqual(eventsB,expected);
  }
  assert.ok(expected.length > 0 && expected.length < 100);
});

test("spawning continues the RNG after brain creation rather than resetting it", () => {
  const random = new Random(12345); const oracle = new Random(12345);
  makeBrain(random); for(let i=0;i<15;i++) oracle.next();
  const s = new Simulation({width:600,height:400},random,[],1);
  assert.equal(s.random,random); oracle.next();
  const expected = new Food(oracle.next()*600,oracle.next()*400);
  s.update(1); assert.deepEqual(s.food,[expected]); assert.equal(random.next(),oracle.next());
});

test("spawn consumes one draw per attempt and two more only on success", (t) => {
  for (const chance of [0,1]) {
    const random = new Random(1); const original = random.next.bind(random);
    const spy = t.mock.method(random,"next",original);
    const s = new Simulation({width:600,height:400},random,[],chance);
    s.update(0); s.update(0.5); assert.equal(spy.mock.callCount(),0);
    s.update(2.5); assert.equal(spy.mock.callCount(),chance === 0 ? 3 : 9);
    assert.equal(s.food.length,chance === 0 ? 0 : 3);
  }
});

test("determinism includes toroidal eating, energy and death removal", () => {
  const create = () => {
    const random = new Random(17);
    const eater = new Creature(595,300,new Brain([0,0,0,0],[0,0,0,0],[0,0,0,0],0,0,1),0,0,0,20,100,50,1);
    const dying = new Creature(200,200,makeBrain(random),0,0,0,20,100,0.001,1);
    const s = new Simulation({width:600,height:600},random,[eater,dying],0.4);
    s.food = [new Food(5,300)]; return s;
  };
  const a=create();const b=create(); assertIndependent(a,b);
  a.update(1/60);b.update(1/60);
  assert.equal(a.creatures.length,1); assert.equal(a.food.length,0); assert.ok(a.creatures[0].energy>50);
  assert.deepEqual(snapshot(a),snapshot(b));
  for(let i=0;i<1200;i++) {a.update(1/60);b.update(1/60);assert.deepEqual(snapshot(a),snapshot(b));}
});
