import { Simulation } from "../simulation/simulation";
import { Renderer } from "../renderer/renderer";

export class Loop {
  simulation: Simulation;
  renderer: Renderer;
  previousTimeStamp: number | null;

  constructor(simulation: Simulation, renderer: Renderer) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.previousTimeStamp = null;
  }

  frame(timestamp: number) {
    requestAnimationFrame(this.frame.bind(this));
    if (this.previousTimeStamp === null) {
      this.previousTimeStamp = timestamp;
      return;
    }
    const delta: number = (timestamp - this.previousTimeStamp) / 1000;
    this.previousTimeStamp = timestamp;

    this.simulation.update(delta);
    this.renderer.draw(this.simulation.creatures, this.simulation.food);
  }

  start() {
    requestAnimationFrame(this.frame.bind(this));
  }
}
