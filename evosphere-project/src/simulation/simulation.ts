import { Creature } from "../creature/creature";
import { Food } from "../food/food";
import { getFoodSensors } from "../sensors/sensors";
import { findNearest, distanceBetween, normalizeAngle } from "../utils/math";
import { Random } from "../utils/random";
import type { WorldSize } from "../utils/types";

export class Simulation {
  worldSize: WorldSize;
  random: Random;
  creatures: Creature[] = [];
  food: Food[] = [];
  foodSpawnTimer: number = 0;
  foodSpawnInterval: number = 1;
  foodSpawnChance: number;

  constructor(
    worldSize: WorldSize,
    random: Random,
    creatures: Creature[] = [],
    foodSpawnChance?: number,
  ) {
    if (!Number.isFinite(worldSize.width) || worldSize.width <= 0 ||
        !Number.isFinite(worldSize.height) || worldSize.height <= 0) {
      throw new RangeError("World dimensions must be finite and positive");
    }
    this.worldSize = worldSize;
    this.random = random;
    this.creatures = [...creatures];
    this.foodSpawnChance = foodSpawnChance ?? 0.3;
  }

  update(delta: number) {
    if (!Number.isFinite(delta) || delta < 0) {
      throw new RangeError("Delta must be finite and non-negative");
    }
    if (
      !Number.isFinite(this.foodSpawnInterval) ||
      this.foodSpawnInterval <= 0
    ) {
      throw new RangeError("Food spawn interval must be finite and positive");
    }
    if (
      !Number.isFinite(this.foodSpawnChance) ||
      this.foodSpawnChance < 0 ||
      this.foodSpawnChance > 1
    ) {
      throw new RangeError("Food spawn chance must be between zero and one");
    }
    const nextSpawnTimer = this.foodSpawnTimer + delta;
    const spawnAttempts = Math.floor(nextSpawnTimer / this.foodSpawnInterval);
    if (
      !Number.isFinite(nextSpawnTimer) ||
      nextSpawnTimer < 0 ||
      !Number.isSafeInteger(spawnAttempts)
    ) {
      throw new RangeError(
        "Food spawn timer exceeds the supported numeric range",
      );
    }
    if (delta === 0) return;

    const eatingRange = 15;
    for (const creature of this.creatures) {
      if (creature.energy <= 0) continue;
      const { move, turn, eat } = creature.brain.think(
        getFoodSensors(creature, this.food, this.worldSize),
      );
      creature.move = move;
      creature.turn = turn;
      creature.direction = normalizeAngle(
        creature.direction + delta * creature.turnSpeed * creature.turn,
      );
      const radians = (creature.direction * Math.PI) / 180;
      creature.x += delta * creature.speed * Math.cos(radians) * creature.move;
      creature.y += delta * creature.speed * Math.sin(radians) * creature.move;
      creature.x =
        ((creature.x % this.worldSize.width) + this.worldSize.width) % this.worldSize.width;
      creature.y =
        ((creature.y % this.worldSize.height) + this.worldSize.height) % this.worldSize.height;

      if (eat > 0.5) {
        const foodNearest = findNearest(creature, this.food, this.worldSize);
        if (
          foodNearest &&
          distanceBetween(
            creature.x,
            creature.y,
            foodNearest.x,
            foodNearest.y,
            this.worldSize,
          ) < eatingRange
        ) {
          creature.energy = Math.min(
            creature.maxEnergy,
            foodNearest.energy + creature.energy,
          );
          this.food = this.food.filter((food) => food !== foodNearest);
        }
      }

      const movementCost = 2;
      creature.energy -=
        (creature.metabolism + creature.move * movementCost) * delta;
    }

    this.foodSpawnTimer =
      nextSpawnTimer - spawnAttempts * this.foodSpawnInterval;
    for (let attempt = 0; attempt < spawnAttempts; attempt++) {
      if (
        this.random.next() < this.foodSpawnChance) {
        this.food.push(
          new Food(
            this.random.next() * this.worldSize.width,
            this.random.next() * this.worldSize.height,
          ),
        );
      }
    }

    this.creatures = this.creatures.filter((creature) => creature.energy > 0);
  }
}
