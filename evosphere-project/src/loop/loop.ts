import { Simulation } from "../simulation/simulation";
import { Renderer } from "../renderer/renderer";

export class Loop {
  simulation: Simulation;
  renderer: Renderer;
  previousTimeStamp: number | null;
  private started = false;
  private readonly onFrame = (timestamp: number) => this.frame(timestamp);
  tickDuration: number = 1 / 60;
  accumulatedTime: number = 0;

  constructor(simulation: Simulation, renderer: Renderer) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.previousTimeStamp = null;
  }

  frame(timestamp: number) {
    requestAnimationFrame(this.onFrame);
    if (this.previousTimeStamp === null) {
      this.previousTimeStamp = timestamp;
      return;
    }
    // Avoid a single destructive step after a suspended/background tab.
    const delta = Math.min(0.1, Math.max(0, (timestamp - this.previousTimeStamp) / 1000));
    this.previousTimeStamp = timestamp;

    this.accumulatedTime += delta;
    while (this.accumulatedTime >= this.tickDuration) {
      this.simulation.update(this.tickDuration);
      this.accumulatedTime -= this.tickDuration;
    }
    this.renderer.draw(this.simulation.creatures, this.simulation.food);
  }

  start() {
    if (this.started) return;
    this.started = true;
    requestAnimationFrame(this.onFrame);
  }
}
