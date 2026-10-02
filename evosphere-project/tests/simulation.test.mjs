import test from "node:test";
import assert from "node:assert/strict";
import { Brain } from "../src/brain/brain.ts";
import { Creature } from "../src/creature/creature.ts";
import { Food } from "../src/food/food.ts";
import { Simulation } from "../src/simulation/simulation.ts";
import { Loop } from "../src/loop/loop.ts";
import { getFoodSensors } from "../src/sensors/sensors.ts";
import { getVisible } from "../src/sensors/vision.ts";
import { distanceBetween, normalizeAngle, findNearest, randomWeights } from "../src/utils/math.ts";

const brain = (eat = 0) => new Brain([0,0,0,0], [0,0,0,0], [0,0,0,0], 0, 0, eat);
const creature = (b = brain()) => new Creature(0, 0, b, 10, 45, 0, 100, 100, 50, 1);

test("sensor inputs and the three neurons agree on four weights", () => {
  const c = creature();
  assert.deepEqual(getFoodSensors(c, []), [0, 1, 0, 0.5]);
  assert.deepEqual(getFoodSensors(c, [new Food(50, 0)]), [0, 0.5, 1, 0.5]);
  assert.deepEqual(c.brain.think(getFoodSensors(c, [])), {move: 0.5, turn: 0, eat: 0.5});
});
test("zero energy capacity and zero-range overlapping food stay finite", () => {
  const c = new Creature(0, 0, brain());
  assert.deepEqual(getFoodSensors(c, [new Food(0,0)]), [0, 0, 1, 0]);
  assert.ok(getFoodSensors(c, []).every(Number.isFinite));
});
test("vision includes its boundary, excludes outside and nearest handles empty lists", () => {
  const c = creature(); const edge = new Food(100,0);
  assert.deepEqual(getVisible(c, 100, [edge, new Food(101,0)]), [edge]);
  assert.equal(findNearest(c, []), null);
  assert.equal(findNearest(c, [edge, new Food(200,0)]), edge);
});
test("brain rejects missing/extra weights and non-finite data", () => {
  assert.throws(() => brain().think([1,2,3]), RangeError);
  assert.throws(() => brain().think([1,2,3,4,5]), RangeError);
  assert.throws(() => brain().think([NaN,0,0,0]), RangeError);
  const b = brain(); b.weightsTurn[0] = Infinity;
  assert.throws(() => b.think([0,0,0,0]), RangeError);
});
test("brain owns separate copies of supplied weight arrays", () => {
  const weights = [0,0,0,0]; const b = new Brain(weights,weights,weights,0,0,0);
  weights[0] = 10; b.weightsMove[1] = 2;
  assert.deepEqual(b.weightsTurn, [0,0,0,0]);
  assert.deepEqual(b.weightsEat, [0,0,0,0]);
  assert.equal(b.weightsMove[0], 0);
});
test("zero food energy is preserved and omitted energy defaults to 30", () => {
  assert.equal(new Food(0,0,0).energy, 0);
  assert.equal(new Food(0,0).energy, 30);
});
test("angle normalization handles huge finite angles and rejects infinity", () => {
  assert.equal(normalizeAngle(-540), -180);
  assert.equal(normalizeAngle(540), 180);
  assert.equal(normalizeAngle(1e20), -80);
  assert.throws(() => normalizeAngle(Infinity), RangeError);
  assert.throws(() => normalizeAngle(NaN), RangeError);
});
test("distance avoids intermediate squared overflow", () => {
  assert.equal(distanceBetween(0,0,3,4), 5);
  assert.ok(Number.isFinite(distanceBetween(0,0,1e200,1e200)));
});
test("weight generation rejects invalid counts", () => {
  assert.throws(() => randomWeights(Infinity), RangeError);
  assert.throws(() => randomWeights(-1), RangeError);
  assert.throws(() => randomWeights(1.5), RangeError);
  assert.equal(randomWeights(4).length, 4);
});
test("spawn triggers at interval and keeps remainder across large steps", () => {
  const s = new Simulation([], 1);
  s.update(1); assert.equal(s.food.length, 1);
  s.update(2.5); assert.equal(s.food.length, 3);
  assert.equal(s.foodSpawnTimer, 0.5);
  s.update(0.5); assert.equal(s.food.length, 4);
  assert.ok(s.food.every(f => f.x >= 0 && f.x < 600 && f.y >= 0 && f.y < 600));
});
test("failed spawn attempts also consume their interval", () => {
  const s = new Simulation([], 0); s.update(2.5);
  assert.equal(s.food.length, 0); assert.equal(s.foodSpawnTimer, 0.5);
});
test("invalid delta and spawn intervals fail before changing state", () => {
  const c = creature(); const s = new Simulation([c], 0);
  for (const dt of [-1, NaN, Infinity]) assert.throws(() => s.update(dt), RangeError);
  assert.equal(c.x, 0); assert.equal(c.energy, 50);
  for (const interval of [0, -1, Infinity, NaN]) {
    s.foodSpawnInterval = interval; assert.throws(() => s.update(1), RangeError);
  }
});
test("zero delta does not eat, move or spawn", () => {
  const c = creature(brain(1)); const s = new Simulation([c], 1); s.food = [new Food(0,0)];
  s.update(0); assert.equal(s.food.length, 1); assert.equal(c.energy, 50); assert.equal(c.x, 0);
});
test("dead creatures cannot consume food and adjacent deaths are all removed", () => {
  const dead = creature(brain(1)); dead.energy = 0;
  const dying = creature(); dying.energy = 0.01;
  const alive = creature(); alive.x = 200;
  const s = new Simulation([dead, dying, alive], 0); const f = new Food(0,0); s.food = [f];
  s.update(0.1); assert.deepEqual(s.creatures, [alive]); assert.deepEqual(s.food, [f]);
});
test("two creatures cannot consume the same food", () => {
  const a = creature(brain(1)); const b = creature(brain(1));
  const s = new Simulation([a,b], 0); s.food = [new Food(0,0)]; s.update(0.1);
  assert.equal(s.food.length, 0);
  assert.ok(Math.abs(a.energy - 79.8) < 1e-9);
  assert.ok(Math.abs(b.energy - 49.8) < 1e-9);
});
test("eating caps energy and removes only the consumed object", () => {
  const c = creature(brain(1)); c.energy = 99;
  const s = new Simulation([c], 0); const far = new Food(300,300);
  s.food = [new Food(0,0), far]; s.update(0.1);
  assert.deepEqual(s.food, [far]); assert.ok(Math.abs(c.energy - 99.8) < 1e-9);
});
test("simulation owns its list while keeping creature entity identity", () => {
  const c = creature(); const original = [c]; const s = new Simulation(original, 0);
  original.push(creature()); assert.equal(s.creatures.length, 1); assert.equal(s.creatures[0], c);
});
test("straight motion/metabolism agree at 30, 60 and 120 FPS", () => {
  for (const fps of [30,60,120]) {
    const c = creature(); const s = new Simulation([c], 0);
    for (let i=0; i<fps; i++) s.update(1/fps);
    assert.ok(Math.abs(c.x - 5) < 1e-9); assert.ok(Math.abs(c.energy - 48) < 1e-9);
  }
});
test("turning direction stays normalized", () => {
  const c = creature(); c.direction = 179; c.brain.biasTurn = 1;
  const s = new Simulation([c], 0); s.update(1);
  assert.ok(c.direction >= -180 && c.direction <= 180);
});
test("loop starts only once and caps suspended-tab elapsed time", (t) => {
  const callbacks = []; t.mock.method(globalThis, "requestAnimationFrame", cb => {callbacks.push(cb); return callbacks.length;});
  const deltas = []; let draws = 0;
  const l = new Loop({update: dt => deltas.push(dt), creatures: [], food: []}, {draw: () => draws++});
  l.start(); l.start(); assert.equal(callbacks.length, 1);
  callbacks.shift()(1000); callbacks.shift()(61000);
  assert.deepEqual(deltas, [0.1]); assert.equal(draws, 1); assert.equal(callbacks.length, 1);
});

// Node has no animation frame API; the loop test replaces this placeholder.
globalThis.requestAnimationFrame ??= () => 0;

test("application starts and renders through a minimal DOM/canvas", async (t) => {
  const callbacks = []; let rectangles = 0; let appended = 0;
  t.mock.method(globalThis, "requestAnimationFrame", cb => { callbacks.push(cb); return callbacks.length; });
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({style: {}, getContext: () => ({clearRect() {}, fillRect() {rectangles++;}, beginPath() {}, arc() {}, fill() {}})}),
    getElementById: () => ({appendChild() {appended++;}}),
  };
  t.after(() => { if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument; });
  await import("../src/main.ts");
  assert.equal(appended, 1);
  for (let i=0; i<=120; i++) callbacks.shift()(i * 1000/60);
  assert.equal(rectangles, 360); assert.equal(callbacks.length, 1);
});

test("invalid spawn probability cannot silently disable or force spawning", () => {
  for (const chance of [NaN, Infinity, -0.1, 1.1]) {
    assert.throws(() => new Simulation([], chance).update(1), RangeError);
  }
});
test("overflowing timers and intervals too small for the delta are rejected", () => {
  const s = new Simulation([], 0);
  s.foodSpawnInterval = Number.MIN_VALUE;
  assert.throws(() => s.update(1), RangeError);
  s.foodSpawnInterval = 1; s.foodSpawnTimer = Infinity;
  assert.throws(() => s.update(1), RangeError);
});
