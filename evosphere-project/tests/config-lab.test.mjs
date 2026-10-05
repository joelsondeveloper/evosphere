import test from "node:test";
import assert from "node:assert/strict";
import { Random } from "../src/utils/random.ts";
import { createInitialPopulation } from "../src/population/createInitialPopulation.ts";
import { validateConfiguration } from "../src/app/configuration.ts";
import { Loop } from "../src/loop/loop.ts";

const world = { width: 600, height: 600 };
const organism = { speed: 12, turnSpeed: 33, visionRange: 44, maxEnergy: 80, initialEnergy: 60, metabolism: 0.5, mutationRate: 0.2, mutationStrength: 0.7 };

test("manual seed and invalid seed boundaries are validated", () => {
  validateConfiguration({ amount: 1, seed: 2147483646, organism });
  for (const seed of [0, -1, 2147483647, 1.5, NaN, Infinity]) assert.throws(() => validateConfiguration({ amount: 1, seed, organism }), RangeError);
});

test("Config Lab values reach founder creatures and brains", () => {
  const a = createInitialPopulation(1, world, new Random(123), organism)[0];
  assert.equal(a.speed, organism.speed); assert.equal(a.turnSpeed, organism.turnSpeed);
  assert.equal(a.visionRange, organism.visionRange); assert.equal(a.maxEnergy, organism.maxEnergy);
  assert.equal(a.energy, organism.initialEnergy); assert.equal(a.metabolism, organism.metabolism);
  assert.equal(a.brain.mutationRate, organism.mutationRate); assert.equal(a.brain.mutationStrength, organism.mutationStrength);
});

test("same seed and Config Lab produce equivalent independent founders", () => {
  const a = createInitialPopulation(6, world, new Random(777), organism);
  const b = createInitialPopulation(6, world, new Random(777), organism);
  assert.deepEqual(a, b); assert.notEqual(a[0], b[0]); assert.notEqual(a[0].brain, b[0].brain);
});

test("changing a Config Lab object after creation does not rewrite existing founders", () => {
  const mutable = { ...organism };
  const founders = createInitialPopulation(1, world, new Random(9), mutable);
  mutable.speed = 999; mutable.mutationRate = 1;
  assert.equal(founders[0].speed, organism.speed);
  assert.equal(founders[0].brain.mutationRate, organism.mutationRate);
});

test("simulation speed scales fixed ticks without changing tick duration", () => {
  const steps = []; const loop = new Loop({ update: dt => steps.push(dt), creatures: [], food: [] }, { draw() {} });
  loop.setSpeed(5); globalThis.requestAnimationFrame = callback => { loop.callback = callback; return 1; }; globalThis.cancelAnimationFrame = () => {};
  loop.start(); loop.callback(0); loop.callback(1000 / 60); assert.equal(steps.length, 5); assert.ok(steps.every(dt => dt === 1 / 60)); loop.stop();
});

