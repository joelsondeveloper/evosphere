export class Random {
    private state: number = 0;

    constructor(seed: number) {
        if (!Number.isSafeInteger(seed) || seed <= 0 || seed >= 2147483647) {
            throw new RangeError("Seed must be a positive safe integer less than 2147483647");
        }
        this.state = seed;
    }

    next(): number {
        this.state = this.state * 16807 % 2147483647;
        return this.state / 2147483647;
    }
}