import type { Positionable } from "./types";

export function distanceBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function angleBetween(x1: number, y1: number, x2: number, y2: number) {
  return radiansToDegrees(Math.atan2(y2 - y1, x2 - x1));
}

export function normalizeAngle(angle: number) {
  while (angle < -180) {
    angle += 360;
  }
  while (angle > 180) {
    angle -= 360;
  }
  return angle;
}

export function relativeAngle(angle1: number, pos1: Positionable, pos2: Positionable) {
  const angle2 = angleBetween(pos1.x, pos1.y, pos2.x, pos2.y);
  return normalizeAngle(angle2 - angle1);
}

export function findNearest<T extends Positionable>(
  position: Positionable,
  candidates: T[],
): T | null {
  let nearest: T | null = null;
  let nearestDistance: number = Infinity;
  for (const candidate of candidates) {
    const distance = distanceBetween(
      position.x,
      position.y,
      candidate.x,
      candidate.y,
    );
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

export function randomWeights(count: number) {
  const weights: number[] = [];
  for (let i = 0; i < count; i++) {
    weights.push(randomWeight());
  }
  return weights;
}

export function randomWeight() {
  return Math.random() * 2 - 1;
}