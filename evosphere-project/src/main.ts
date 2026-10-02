import "./style.css";
import { Simulation } from "./simulation/simulation";
import { Renderer } from "./renderer/renderer";
import { Loop } from "./loop/loop";
import { Creature } from "./creature/creature";
import { Brain } from "./brain/brain";
import { randomWeight, randomWeights } from "./utils/math";

const brain1 = new Brain(
  randomWeights(4),
  randomWeights(4),
  randomWeights(4),
  randomWeight(),
  randomWeight(),
  randomWeight()
);

const brain2 = new Brain(
  randomWeights(4),
  randomWeights(4),
  randomWeights(4),
  randomWeight(),
  randomWeight(),
  randomWeight()
);

const brain3 = new Brain(
  randomWeights(4),
  randomWeights(4),
  randomWeights(4),
  randomWeight(),
  randomWeight(),
  randomWeight()
);

const creature1 = new Creature(
  100, 100, brain1,
  100, 45, 0, 100,
  100, 100, 1
);

const creature2 = new Creature(
  200, 200, brain2,
  100, 45, 0, 100,
  100, 100, 1
);

const creature3 = new Creature(
  300, 300, brain3,
  100, 45, 0, 100,
  100, 100, 1
);

const creatures: Creature[] = [creature1, creature2, creature3];
const simulation = new Simulation({ width: 600, height: 600 }, creatures);
const renderer = new Renderer();
const loop = new Loop(simulation, renderer);

const app = document.getElementById("app");
if (!app) {
  throw new Error("No app element found");
}

app.appendChild(renderer.canvas);

loop.start();
