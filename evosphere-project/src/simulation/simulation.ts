import { Creature } from "../creature/creature";
import { Food } from "../food/food";
import { getFoodSensors } from "../sensors/sensors";
import { findNearest, distanceBetween} from "../utils/math";

export class Simulation {
  creatures: Creature[] = [];
  food: Food[] = [];
  foodSpawnTimer: number = 0;
  foodSpawnInterval: number = 1;
  foodSpawnChance: number;

  constructor(creatures: Creature[] = [], foodSpawnChance?: number) {
    this.creatures = creatures;
    this.foodSpawnChance = foodSpawnChance ?? 0.3;
  }

  update(delta: number) {
    const eatingRange = 15;
    for (const creature of this.creatures) {
      const { move, turn, eat } = creature.brain.think(getFoodSensors(creature, this.food));
      creature.move = move;
      creature.turn = turn;
      creature.direction += delta * creature.turnSpeed * creature.turn;
      const radians = (creature.direction * Math.PI) / 180;
      creature.x += delta * creature.speed * Math.cos(radians) * creature.move;
      creature.y += delta * creature.speed * Math.sin(radians) * creature.move;

      if (eat > 0.5) {
        const foodNearest = findNearest(creature, this.food);
        if (foodNearest && distanceBetween(creature.x, creature.y, foodNearest.x, foodNearest.y) < eatingRange) {
          creature.energy = Math.min(creature.maxEnergy, foodNearest.energy + creature.energy);
          this.food = this.food.filter((food) => food !== foodNearest);
        }
      }

      const movementCost = 2
      creature.energy -= (creature.metabolism + creature.move * movementCost) * delta
    }

    this.foodSpawnTimer += delta;
    if (this.foodSpawnTimer > this.foodSpawnInterval) {
      this.foodSpawnTimer = 0;
      if (Math.random() < this.foodSpawnChance) {
        this.food.push(new Food(Math.random() * 600, Math.random() * 600));
      }
    }

    this.creatures = this.creatures.filter((creature) => creature.energy > 0);
  }
}
