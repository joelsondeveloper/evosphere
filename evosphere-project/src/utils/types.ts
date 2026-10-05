export interface Positionable {
    x: number;
    y: number;
}

export type WorldSize = { width: number; height: number };

export type Random = { next: () => number, gaussian: () => number };