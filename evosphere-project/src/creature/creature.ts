import { Brain } from "../brain/brain";

export class Creature {
    x: number;
    y: number;
    speed: number;
    turnSpeed: number;
    direction: number;
    move: number;
    turn: number;
    visionRange: number;
    maxEnergy: number;
    energy: number;
    metabolism: number;
    brain: Brain;

    constructor(x: number, y: number, brain: Brain, speed?: number, turnSpeed?: number, direction?: number, visionRange?: number, maxEnergy?: number, energy?: number, metabolism?: number) {
        this.x = x;
        this.y = y;
        this.speed = speed ?? 0;
        this.turnSpeed = turnSpeed ?? 0;
        this.direction = direction ?? 0;
        this.move = 1;
        this.turn = 1;
        this.visionRange = visionRange ?? 0;
        this.maxEnergy = maxEnergy ?? 0;
        this.energy = energy ?? 0;
        this.metabolism = metabolism ?? 0;
        this.brain = brain;
    }
}