import { Renderer } from "../renderer/renderer";
import { Loop } from "../loop/loop";
import {
  validateConfiguration,
  type SimulationConfiguration,
} from "./configuration";
import { createUniverse, generateWorldSeed } from "./universe";
export class SimulationSession {
  private loop: Loop | null = null;
  private readonly host: HTMLElement;
  constructor(host: HTMLElement) {
    this.host = host;
  }
  start(configuration: SimulationConfiguration, seed?: number) {
    validateConfiguration(configuration);
    this.stop();
    const universe = createUniverse(configuration, seed ?? configuration.seed ?? generateWorldSeed());
    const renderer = new Renderer(universe.simulation.worldSize);
    this.loop = new Loop(universe.simulation, renderer);
    this.host.replaceChildren(renderer.canvas);
    renderer.draw(universe.simulation.creatures, universe.simulation.food);
    this.loop.start();
    return universe;
  }
  setSimulationSpeed(multiplier: number) {
    this.loop?.setSpeed(multiplier);
  }
  stop() {
    this.loop?.stop();
    this.loop = null;
    this.host.replaceChildren();
  }
}
