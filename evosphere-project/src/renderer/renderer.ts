import { Creature } from "../creature/creature";
import { Food } from "../food/food";
import type { WorldSize } from "../utils/types";


export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(worldSize: WorldSize) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = worldSize.width;
    this.canvas.height = worldSize.height;
    this.canvas.id = "canvas";
    this.canvas.style.border = "1px solid black";
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("No context found");
    }
    this.ctx = context;
  }

  draw(creatures: Creature[], foods: Food[] = []) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const creature of creatures) {
      this.ctx.fillRect(creature.x, creature.y, 20, 20);
    }
    for (const food of foods) {
      this.ctx.beginPath();
      this.ctx.arc(food.x, food.y, 5, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }
}
