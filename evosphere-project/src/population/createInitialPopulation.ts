import { Brain } from "../brain/brain";
import { Creature } from "../creature/creature";
import type { Random, WorldSize } from "../utils/types";
import { randomWeight, randomWeights } from "../utils/math";

export const DEFAULT_CREATURE_SPEED = 50;
export interface OrganismConfiguration {
  speed: number;
  turnSpeed: number;
  visionRange: number;
  maxEnergy: number;
  initialEnergy: number;
  metabolism: number;
  mutationRate: number;
  mutationStrength: number;
}

export interface FounderPopulation {
  amount: number;
  configuration: OrganismConfiguration;
}

export const DEFAULT_ORGANISM_CONFIGURATION: Readonly<OrganismConfiguration> =
  Object.freeze({
    speed: DEFAULT_CREATURE_SPEED,
    turnSpeed: 90,
    visionRange: 120,
    maxEnergy: 100,
    initialEnergy: 100,
    metabolism: 1,
    mutationRate: 0.05,
    mutationStrength: 0.1,
  });

export function createInitialPopulation(
  amount: number,
  worldSize: WorldSize,
  random: Random,
  configuration:
    | OrganismConfiguration
    | number = DEFAULT_ORGANISM_CONFIGURATION,
): Creature[] {
  const creatures: Creature[] = [];
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError("Amount must be a non-negative safe integer");
  }
  if (
    !Number.isFinite(worldSize.width) ||
    worldSize.width <= 0 ||
    !Number.isFinite(worldSize.height) ||
    worldSize.height <= 0
  ) {
    throw new RangeError("World dimensions must be finite and positive");
  }
  const organism =
    typeof configuration === "number"
      ? { ...DEFAULT_ORGANISM_CONFIGURATION, speed: configuration }
      : configuration;
  for (const value of Object.values(organism))
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        "Organism configuration must be finite and non-negative",
      );
    }
  if (
    organism.maxEnergy <= 0 ||
    organism.initialEnergy > organism.maxEnergy ||
    organism.mutationRate > 1
  ) {
    throw new RangeError("Organism configuration contains invalid limits");
  }
  for (let i = 0; i < amount; i++) {
    const brain = new Brain(
      randomWeights(7, random),
      randomWeights(7, random),
      randomWeights(7, random),
      randomWeights(7, random),
      randomWeight(random),
      randomWeight(random),
      randomWeight(random),
      randomWeight(random),
      organism.mutationRate,
      organism.mutationStrength,
    );

    const x = random.next() * worldSize.width;
    const y = random.next() * worldSize.height;
    const direction = random.next() * 360;

    creatures.push(
      new Creature(
        x,
        y,
        brain,
        organism.speed,
        organism.turnSpeed,
        direction,
        organism.visionRange,
        organism.maxEnergy,
        organism.initialEnergy,
        organism.metabolism,
      ),
    );
  }

  return creatures;
}

export function createFounderPopulations(founders: FounderPopulation[], worldSize: WorldSize, random: Random) {
  const creatures: Creature[] = [];
  for (const founder of founders) {
    creatures.push(...createInitialPopulation(founder.amount, worldSize, random, founder.configuration));
  }
  return creatures;
}