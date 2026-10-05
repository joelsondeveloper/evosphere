import type { Random } from "../utils/types";

function finiteGene(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError("Genes must be finite");
  return value;
}

function validateMutationParameters(rate: number, strength: number) {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new RangeError(
      "Mutation rate must be finite and between zero and one",
    );
  }
  if (!Number.isFinite(strength) || strength < 0) {
    throw new RangeError("Mutation strength must be finite and non-negative");
  }
}

function uniform(random: Random): number {
  const value = random.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("Random.next() must return a finite value in [0, 1)");
  }
  return value;
}

export class Brain {
  weightsMove: number[] = [];
  weightsTurn: number[] = [];
  weightsEat: number[] = [];
  weightsReproduce: number[] = [];
  biasMove: number = 0;
  biasTurn: number = 0;
  biasEat: number = 0;
  biasReproduce: number = 0;

  mutationRate: number;
  mutationStrength: number;

  constructor(
    weightsMove: number[],
    weightsTurn: number[],
    weightsEat: number[],
    weightsReproduce: number[],
    biasMove: number,
    biasTurn: number,
    biasEat: number,
    biasReproduce: number,

    mutationRate?: number,
    mutationStrength?: number,
  ) {
    this.weightsMove = [...weightsMove];
    this.weightsTurn = [...weightsTurn];
    this.weightsEat = [...weightsEat];
    this.weightsReproduce = [...weightsReproduce];
    this.biasMove = biasMove;
    this.biasTurn = biasTurn;
    this.biasEat = biasEat;
    this.biasReproduce = biasReproduce;

    this.mutationRate = mutationRate ?? 0.05;
    this.mutationStrength = mutationStrength ?? 0.1;
    this.validateGenome();
  }

  private validateGenome() {
    for (const weights of [
      this.weightsMove,
      this.weightsTurn,
      this.weightsEat,
      this.weightsReproduce,
    ]) {
      for (const gene of weights) finiteGene(gene);
    }
    finiteGene(this.biasMove);
    finiteGene(this.biasTurn);
    finiteGene(this.biasEat);
    finiteGene(this.biasReproduce);
    validateMutationParameters(this.mutationRate, this.mutationStrength);
  }

  neuron(inputs: number[], weights: number[], bias: number) {
    if (inputs.length !== weights.length) {
      throw new RangeError("Brain input and weight counts must match");
    }
    if (
      !Number.isFinite(bias) ||
      !inputs.every(Number.isFinite) ||
      !weights.every(Number.isFinite)
    ) {
      throw new RangeError("Brain inputs, weights and bias must be finite");
    }
    let sum = 0;
    for (let i = 0; i < inputs.length; i++) {
      sum += inputs[i] * weights[i];
    }
    if (Number.isNaN(sum)) {
      throw new RangeError("Neuron sum is NaN");
    }
    return Math.tanh(sum + bias);
  }

  think(inputs: number[]) {
    const move = (this.neuron(inputs, this.weightsMove, this.biasMove) + 1) / 2;
    const turn = this.neuron(inputs, this.weightsTurn, this.biasTurn);
    const eat = (this.neuron(inputs, this.weightsEat, this.biasEat) + 1) / 2;
    const reproduce = (this.neuron(inputs, this.weightsReproduce, this.biasReproduce) + 1) / 2;
    return { move, turn, eat, reproduce };
  }

  crossover(parentB: Brain, random: Random) {
    this.validateGenome();
    parentB.validateGenome();
    // Check all pairs before consuming RNG, including mismatches in later neurons.
    if (
      this.weightsMove.length !== parentB.weightsMove.length ||
      this.weightsTurn.length !== parentB.weightsTurn.length ||
      this.weightsEat.length !== parentB.weightsEat.length ||
      this.weightsReproduce.length !== parentB.weightsReproduce.length
    ) {
      throw new RangeError("Weight counts must match");
    }
    const weightsMove = this.crossoverWeights(
      this.weightsMove,
      parentB.weightsMove,
      random,
    );
    const weightsTurn = this.crossoverWeights(
      this.weightsTurn,
      parentB.weightsTurn,
      random,
    );
    const weightsEat = this.crossoverWeights(
      this.weightsEat,
      parentB.weightsEat,
      random,
    );
    const weightsReproduce = this.crossoverWeights(
      this.weightsReproduce,
      parentB.weightsReproduce,
      random,
    )
    const biasMove = this.crossoverGene(
      this.biasMove,
      parentB.biasMove,
      random,
    );
    const biasTurn = this.crossoverGene(
      this.biasTurn,
      parentB.biasTurn,
      random,
    );
    const biasEat = this.crossoverGene(this.biasEat, parentB.biasEat, random);
    const biasReproduce = this.crossoverGene(this.biasReproduce, parentB.biasReproduce, random);
    const mutationRate = this.crossoverGene(
      this.mutationRate,
      parentB.mutationRate,
      random,
    );
    const mutationStrength = this.crossoverGene(
      this.mutationStrength,
      parentB.mutationStrength,
      random,
    );
    return new Brain(
      weightsMove,
      weightsTurn,
      weightsEat,
      weightsReproduce,
      biasMove,
      biasTurn,
      biasEat,
      biasReproduce,
      mutationRate,
      mutationStrength,
    );
  }

  crossoverWeights(weightsA: number[], weightsB: number[], random: Random) {
    const weights = [];
    if (weightsA.length !== weightsB.length) {
      throw new RangeError("Weight counts must match");
    }
    for (const gene of weightsA) finiteGene(gene);
    for (const gene of weightsB) finiteGene(gene);
    for (let i = 0; i < weightsA.length; i++) {
      weights.push(this.crossoverGene(weightsA[i], weightsB[i], random));
    }
    return weights;
  }

  crossoverGene(biasA: number, biasB: number, random: Random) {
    finiteGene(biasA);
    finiteGene(biasB);
    const a = uniform(random);
    // Preserve identical genes exactly, while still consuming their alpha.
    if (biasA === biasB) return biasA;
    return finiteGene(a * biasA + (1 - a) * biasB);
  }

  mutate(random: Random) {
    this.validateGenome();

    const weightsMove = this.weightsMove.map((gene) =>
      this.mutateGene(gene, this.mutationRate, this.mutationStrength, random),
    );
    const weightsTurn = this.weightsTurn.map((gene) =>
      this.mutateGene(gene, this.mutationRate, this.mutationStrength, random),
    );
    const weightsEat = this.weightsEat.map((gene) =>
      this.mutateGene(gene, this.mutationRate, this.mutationStrength, random),
    );
    const weightsReproduce = this.weightsReproduce.map((gene) =>
      this.mutateGene(gene, this.mutationRate, this.mutationStrength, random),
    );
    const biasMove = this.mutateGene(
      this.biasMove,
      this.mutationRate,
      this.mutationStrength,
      random,
    );
    const biasTurn = this.mutateGene(
      this.biasTurn,
      this.mutationRate,
      this.mutationStrength,
      random,
    );
    const biasEat = this.mutateGene(
      this.biasEat,
      this.mutationRate,
      this.mutationStrength,
      random,
    );
    const biasReproduce = this.mutateGene(
      this.biasReproduce,
      this.mutationRate,
      this.mutationStrength,
      random,
    );
    const mutationRate = Math.min(
      1,
      Math.max(
        0,
        this.mutateGene(
          this.mutationRate,
          this.mutationRate,
          this.mutationStrength,
          random,
        ),
      ),
    );
    const mutationStrength = Math.max(
      0,
      this.mutateGene(
        this.mutationStrength,
        this.mutationRate,
        this.mutationStrength,
        random,
      ),
    );
    return new Brain(
      weightsMove,
      weightsTurn,
      weightsEat,
      weightsReproduce,
      biasMove,
      biasTurn,
      biasEat,
      biasReproduce,
      mutationRate,
      mutationStrength,
    );
  }

  mutateGene(
    gene: number,
    mutationRate: number,
    mutationStrength: number,
    random: Random,
  ) {
    finiteGene(gene);
    validateMutationParameters(mutationRate, mutationStrength);
    const a = uniform(random);
    if (a < mutationRate) {
      const gaussian = finiteGene(random.gaussian());
      return finiteGene(gene + gaussian * mutationStrength);
    }
    return gene;
  }
}
