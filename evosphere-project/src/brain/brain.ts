export class Brain {
  weightsMove: number[] = [];
  weightsTurn: number[] = [];
  weightsEat: number[] = [];
  biasMove: number = 0;
  biasTurn: number = 0;
  biasEat: number = 0;

  constructor(
    weightsMove: number[],
    weightsTurn: number[],
    weightsEat: number[],
    biasMove: number,
    biasTurn: number,
    biasEat: number,
  ) {
    this.weightsMove = [...weightsMove];
    this.weightsTurn = [...weightsTurn];
    this.weightsEat = [...weightsEat];
    this.biasMove = biasMove;
    this.biasTurn = biasTurn;
    this.biasEat = biasEat;
  }

  neuron(inputs: number[], weights: number[], bias: number) {
    if (inputs.length !== weights.length) {
      throw new RangeError("Brain input and weight counts must match");
    }
    if (!Number.isFinite(bias) || !inputs.every(Number.isFinite) || !weights.every(Number.isFinite)) {
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
    return { move, turn, eat };
  }
}
