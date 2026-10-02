export class Food {
    x: number;
    y: number;
    energy: number
    constructor(x: number, y: number, energy?: number) {
        this.x = x;
        this.y = y;
        this.energy = energy ?? 30;
    }
}