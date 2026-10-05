import { Simulation } from "../simulation/simulation";
import { Renderer } from "../renderer/renderer";

export class Loop {
  simulation: Simulation;
  renderer: Renderer;
  previousTimeStamp: number | null;
  private started = false;
  private onFrame: FrameRequestCallback = () => {};
  private frameId: number | null = null;
  private runId = 0;
  tickDuration: number = 1 / 60;
  accumulatedTime: number = 0;
  simulationSpeed = 1;

  constructor(simulation: Simulation, renderer: Renderer) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.previousTimeStamp = null;
  }

  frame(timestamp: number) {
    if (!this.started) return;
    this.frameId = requestAnimationFrame(this.onFrame);
    if (this.previousTimeStamp === null) {
      this.previousTimeStamp = timestamp;
      return;
    }
    // Avoid a single destructive step after a suspended/background tab.
    const delta = Math.min(0.1, Math.max(0, (timestamp - this.previousTimeStamp) / 1000));
    this.previousTimeStamp = timestamp;

    this.accumulatedTime += delta * this.simulationSpeed;
    while (this.accumulatedTime >= this.tickDuration) {
      this.simulation.update(this.tickDuration);
      this.accumulatedTime -= this.tickDuration;
    }
    this.renderer.draw(this.simulation.creatures, this.simulation.food);
  }

  setSpeed(multiplier: number) {
    if (!Number.isFinite(multiplier) || multiplier <= 0) throw new RangeError("Simulation speed must be positive");
    this.simulationSpeed = multiplier;
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.previousTimeStamp = null;
    this.accumulatedTime = 0;
    const runId = ++this.runId;
    this.onFrame = (timestamp) => {
      if (this.started && this.runId === runId) this.frame(timestamp);
    };
    this.frameId = requestAnimationFrame(this.onFrame);
  }

  stop() {
    this.started = false;
    this.runId += 1;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.previousTimeStamp = null;
    this.accumulatedTime = 0;
  }
}
