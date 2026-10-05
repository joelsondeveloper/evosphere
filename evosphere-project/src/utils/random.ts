export class Random {
    private state: number = 0;
    private cachedGaussian: number | null = null;

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

    gaussian(): number {
        if (this.cachedGaussian !== null) {
            const result = this.cachedGaussian;
            this.cachedGaussian = null;
            return result;
        }
        const x1 = this.next();
        const x2 = this.next();

        const z1 = Math.sqrt(-2.0 * Math.log(x1)) * Math.cos(2.0 * Math.PI * x2);
        const z2 = Math.sqrt(-2.0 * Math.log(x1)) * Math.sin(2.0 * Math.PI * x2);
        this.cachedGaussian = z2;
        return z1;
    }
}
