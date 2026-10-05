import test from "node:test";
import assert from "node:assert/strict";
import { Random } from "../src/utils/random.ts";
import { Brain } from "../src/brain/brain.ts";
import { Creature } from "../src/creature/creature.ts";
import { Food } from "../src/food/food.ts";
import { Simulation } from "../src/simulation/simulation.ts";
import { Renderer } from "../src/renderer/renderer.ts";
import { Loop } from "../src/loop/loop.ts";
import { distanceBetween, angleBetween, relativeAngle, findNearest } from "../src/utils/math.ts";
import { getFoodSensors } from "../src/sensors/sensors.ts";
import { getVisible } from "../src/sensors/vision.ts";

const world = { width: 600, height: 600 };
const rectangular = { width: 800, height: 400 };
const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`);
};
const makeCreature = (x, y, direction = 0, speed = 0, eat = 0) =>
  new Creature(x, y, new Brain([0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0], 0, 0, eat, 0),
    speed, 0, direction, 20, 100, 50, 1);

for (const [name, from, to, expected, size = world] of [
  ["normal", [100,100], [103,104], 5],
  ["horizontal seam", [595,300], [5,300], 10],
  ["vertical seam", [300,595], [300,5], 10],
  ["both seams", [595,595], [5,5], Math.sqrt(200)],
  ["same point", [10,20], [10,20], 0],
  ["half-world tie", [0,0], [300,300], Math.hypot(300,300)],
  ["rectangular world", [795,395], [5,5], Math.sqrt(200), rectangular],
  ["equivalent positions outside the map", [-1205,1805], [5,5], 10],
]) {
  test(`distance: ${name}, symmetric in both directions`, () => {
    close(distanceBetween(...from, ...to, size), expected);
    close(distanceBetween(...to, ...from, size), expected);
  });
}

for (const [name, from, to, expected, size = world] of [
  ["normal", [100,100], [110,110], 45],
  ["right across horizontal seam", [595,300], [5,300], 0],
  ["left across horizontal seam", [5,300], [595,300], 180],
  ["down across vertical seam", [300,595], [300,5], 90],
  ["up across vertical seam", [300,5], [300,595], -90],
  ["both seams forward", [595,595], [5,5], 45],
  ["both seams backward", [5,5], [595,595], -135],
  ["positive half-world tie", [0,0], [300,0], 0],
  ["negative half-world tie", [300,0], [0,0], 180],
  ["rectangular world", [795,395], [5,5], 45, rectangular],
  ["multiple world offsets", [1795,-605], [5,5], 45],
  ["coincident equivalent positions", [1200,600], [0,0], 0],
]) {
  test(`angle: ${name}`, () => close(angleBetween(...from, ...to, size), expected));
}

test("relative angle uses heading and the shortest toroidal displacement", () => {
  close(relativeAngle(90, {x:595,y:300}, {x:5,y:300}, world), -90);
  close(relativeAngle(-170, {x:5,y:300}, {x:595,y:300}, world), -10);
});

test("nearest chooses the food across the seam regardless of candidate order", () => {
  const c = makeCreature(595,300); const across = new Food(5,300); const local = new Food(575,300);
  assert.equal(findNearest(c, [local, across], world), across);
  assert.equal(findNearest(c, [across, local], world), across);
  assert.equal(findNearest(c, [], world), null);
});

test("nearest ties keep the first candidate", () => {
  const c = makeCreature(595,300); const across = new Food(5,300); const local = new Food(585,300);
  assert.equal(findNearest(c, [local, across], world), local);
});

for (const [name, x, y, fx, fy, angle] of [
  ["horizontal", 595,300,5,300,0],
  ["vertical", 300,595,300,5,0.5],
  ["both borders", 595,595,5,5,0.25],
]) {
  test(`sensors detect food through ${name}`, () => {
    const c = makeCreature(x,y); const food = new Food(fx,fy);
    const inputs = getFoodSensors(c, [food], world);
    close(inputs[0], angle); close(inputs[1], Math.hypot(fx === x ? 0 : 10, fy === y ? 0 : 10) / 20);
    assert.deepEqual(inputs.slice(2), [1]);
  });
}

test("vision includes exactly its radius across the seam and excludes beyond it", () => {
  const c = makeCreature(595,300); c.visionRange = 10;
  const edge = new Food(5,300); const outside = new Food(5.01,300);
  assert.deepEqual(getVisible(c, 10, [edge,outside], world), [edge]);
  assert.deepEqual(getFoodSensors(c, [outside], world), [0,1,0]);
});

test("sensors select the closest visible food across the seam", () => {
  const c = makeCreature(595,300);
  const inputs = getFoodSensors(c, [new Food(580,300), new Food(5,300)], world);
  close(inputs[0], 0); close(inputs[1], 0.5);
});

for (const [name, x, y, fx, fy] of [
  ["horizontal",595,300,5,300], ["vertical",300,595,300,5], ["both seams",595,595,5,5],
]) {
  test(`eating works across ${name} and removes only the nearest food`, () => {
    const c = makeCreature(x,y,0,0,1); const s = new Simulation(world, new Random(12345),[c],0);
    const far = new Food(300,100); s.food = [far,new Food(fx,fy)];
    s.update(0.1); assert.deepEqual(s.food,[far]); close(c.energy,79.8);
  });
}

for (const [name, fx] of [["exactly at eatingRange",10], ["outside eatingRange",10.01]]) {
  test(`food ${name} across the seam is not eaten`, () => {
    const c = makeCreature(595,300,0,0,1); const s = new Simulation(world, new Random(12345),[c],0); const food = new Food(fx,300);
    s.food = [food]; s.update(0.1); assert.deepEqual(s.food,[food]); close(c.energy,49.8);
  });
}

test("two creatures cannot consume the same food through a seam", () => {
  const a = makeCreature(595,300,0,0,1); const b = makeCreature(5,300,0,0,1);
  const s = new Simulation(world, new Random(12345),[a,b],0); s.food = [new Food(0,300)]; s.update(0.1);
  assert.equal(s.food.length,0); close(a.energy,79.8); close(b.energy,49.8);
});

for (const [name, x, y, direction, speed, expectedX, expectedY] of [
  ["right",795,200,0,20,5,200], ["left",5,200,180,20,795,200],
  ["bottom",400,395,90,20,400,5], ["top",400,5,-90,20,400,395],
  ["both axes",795,395,45,20*Math.SQRT2,5,5],
  ["exact right endpoint",790,200,0,20,0,200],
  ["exact bottom endpoint",400,390,90,20,400,0],
  ["multiple positive widths",795,200,0,3220,5,200],
  ["multiple negative widths",5,200,180,3220,795,200],
]) {
  test(`movement wraps ${name} in a rectangular world`, () => {
    const c = makeCreature(x,y,direction,speed); const s = new Simulation(rectangular, new Random(12345),[c],0);
    s.update(1); close(c.x,expectedX); close(c.y,expectedY);
    assert.ok(c.x >= 0 && c.x < rectangular.width && c.y >= 0 && c.y < rectangular.height);
  });
}

test("movement, sensors and eating agree after wrapping in the same update", () => {
  const c = makeCreature(795,200,0,20,1); const s = new Simulation(rectangular, new Random(12345),[c],0); s.food = [new Food(8,200)];
  const before = getFoodSensors(c,s.food,rectangular); close(before[0],0); close(before[1],13/20);
  s.update(1); close(c.x,5); assert.equal(s.food.length,0); close(c.energy,78);
});

test("initial positions outside the map are sensed as equivalent wrapped positions", () => {
  const c = makeCreature(1795,-605); const f = new Food(5,5);
  const inputs = getFoodSensors(c,[f],world);
  close(inputs[0],0.25); close(inputs[1],Math.sqrt(200)/20); assert.equal(inputs[2],1);
});

test("spawn uses the rectangular WorldSize on both axes", (t) => {
  const random = new Random(12345);
  t.mock.method(random,"next",() => 0.75);
  const s = new Simulation(rectangular, random,[],1); s.update(1);
  assert.equal(s.food.length,1); close(s.food[0].x,600); close(s.food[0].y,300);
});

test("renderer sizes and clears its canvas using WorldSize", (t) => {
  const previous = globalThis.document; const clears = [];
  globalThis.document = {createElement: () => ({style:{}, getContext: () => ({clearRect: (...args) => clears.push(args)})})};
  t.after(() => {if (previous === undefined) delete globalThis.document; else globalThis.document = previous;});
  const renderer = new Renderer(rectangular); renderer.draw([],[]);
  assert.equal(renderer.canvas.width,800); assert.equal(renderer.canvas.height,400);
  assert.deepEqual(clears,[[0,0,800,400]]);
});

test("simulation rejects zero, negative and non-finite world dimensions", () => {
  for (const invalid of [0,-1,NaN,Infinity]) {
    assert.throws(() => new Simulation({width:invalid,height:600}, new Random(12345)),RangeError);
    assert.throws(() => new Simulation({width:600,height:invalid}, new Random(12345)),RangeError);
  }
});

test("fixed ticks preserve accumulated sub-tick time and render each frame", (t) => {
  const previous = globalThis.requestAnimationFrame; const callbacks = []; const steps = []; let draws = 0;
  globalThis.requestAnimationFrame = cb => {callbacks.push(cb); return callbacks.length;};
  t.after(() => {if (previous === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = previous;});
  const loop = new Loop({update: dt => steps.push(dt),creatures:[],food:[]},{draw: () => draws++});
  loop.start(); callbacks.shift()(0); callbacks.shift()(10);
  assert.equal(steps.length,0); close(loop.accumulatedTime,0.01);
  callbacks.shift()(20); assert.equal(steps.length,1); close(steps[0],1/60);
  close(loop.accumulatedTime,0.02 - 1/60); assert.equal(draws,2);
});
