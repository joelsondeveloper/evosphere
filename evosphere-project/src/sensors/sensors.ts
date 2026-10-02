import { getVisible } from "./vision";
import { findNearest, relativeAngle, distanceBetween } from "../utils/math";
import { Creature } from "../creature/creature";
import { Food } from "../food/food";
import type { WorldSize } from "../utils/types";

export function getFoodSensors(creature: Creature, foods: Food[], worldSize: WorldSize) {
    const foodVisible = getVisible(creature, creature.visionRange, foods, worldSize);

    const nearestFood = findNearest(creature, foodVisible, worldSize);

    const energyInput = creature.maxEnergy > 0 ? creature.energy / creature.maxEnergy : 0;

    if (nearestFood) {
        const angleInput = relativeAngle(creature.direction, creature, nearestFood, worldSize) / 180;
        const distanceInput = creature.visionRange > 0
            ? Math.min(1, distanceBetween(creature.x, creature.y, nearestFood.x, nearestFood.y, worldSize) / creature.visionRange)
            : 0;
        return [angleInput, distanceInput, 1, energyInput];
    } else {
        return [0, 1, 0, energyInput];
    }
}