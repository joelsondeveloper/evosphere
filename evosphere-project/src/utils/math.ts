import type { Positionable, WorldSize } from "./types";
export function distanceBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  worldSize: WorldSize
) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const distanceX = Math.min(dx, worldSize.width - dx);
  const distanceY = Math.min(dy, worldSize.height - dy);
  return Math.hypot(distanceX, distanceY);

}

export function angleBetween(x1: number, y1: number, x2: number, y2: number, worldSize: WorldSize) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  if (dx > worldSize.width / 2) {
    dx -= worldSize.width;
  } else if (dx < -worldSize.width / 2) {
    dx += worldSize.width;
  }

  if (dy > worldSize.height / 2) {
    dy -= worldSize.height;
  } else if (dy < -worldSize.height / 2) {
    dy += worldSize.height;
  }
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

export function normalizeAngle(angle: number) {
  if (!Number.isFinite(angle)) {
    throw new RangeError("Angle must be finite");
  }
  angle %= 360;
  if (angle < -180) angle += 360;
  if (angle > 180) angle -= 360;
  return angle;
}

export function relativeAngle(angle1: number, pos1: Positionable, pos2: Positionable, worldSize: WorldSize) {
  const angle2 = angleBetween(pos1.x, pos1.y, pos2.x, pos2.y, worldSize);
  return normalizeAngle(angle2 - angle1);
}

export function findNearest<T extends Positionable>(
  position: Positionable,
  candidates: T[],
  worldSize: WorldSize
): T | null {
  let nearest: T | null = null;
  let nearestDistance: number = Infinity;
  for (const candidate of candidates) {
    const distance = distanceBetween(
      position.x,
      position.y,
      candidate.x,
      candidate.y,
      worldSize
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
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError("Weight count must be a non-negative safe integer");
  }
  const weights: number[] = [];
  for (let i = 0; i < count; i++) {
    weights.push(randomWeight());
  }
  return weights;
}

export function randomWeight() {
  return Math.random() * 2 - 1;
}