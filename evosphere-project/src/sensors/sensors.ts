import { getVisible } from "./vision";
import { findNearest, relativeAngle, distanceBetween } from "../utils/math";
import { Creature } from "../creature/creature";
import { Food } from "../food/food";

export function getFoodSensors(creature: Creature, foods: Food[]) {
    const foodVisible = getVisible(creature, creature.visionRange, foods);

    const nearestFood = findNearest(creature, foodVisible);

    const energyInput = creature.energy / creature.maxEnergy;

    if (nearestFood) {
        const angleInput = relativeAngle(creature.direction, creature, nearestFood) / 180;
        const distanceInput = Math.min(1, distanceBetween(creature.x, creature.y, nearestFood.x, nearestFood.y) / creature.visionRange);
        return [angleInput, distanceInput, 1, energyInput];
    } else {
        return [0, 1, 0, energyInput];
    }
}