
import { distanceBetween } from "../utils/math";
import type { Positionable } from "../utils/types";

export function getVisible<T extends Positionable>(position: Positionable, visionRange: number , objects: T[]) {
    const visibleObjects: T[] = [];
    for (const object of objects) {
        const distance = distanceBetween(position.x, position.y, object.x, object.y);
        if (distance <= visionRange) {
            visibleObjects.push(object);
        }
    }
    return visibleObjects;
}