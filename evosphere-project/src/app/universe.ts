import { createFounderPopulations } from "../population/createInitialPopulation";
import { Random } from "../utils/random";
import { Simulation } from "../simulation/simulation";
import {
  validateConfiguration,
  type SimulationConfiguration,
} from "./configuration";
export const WORLD_SIZE = Object.freeze({ width: 600, height: 600 });
export function generateWorldSeed() {
  return Math.floor(Math.random() * 2147483646) + 1;
}
export function createUniverse(
  configuration: SimulationConfiguration,
  seed?: number,
) {
  validateConfiguration(configuration);
  const chosenSeed = seed ?? configuration.seed ?? generateWorldSeed();
  const random = new Random(chosenSeed);
  const worldSize = { ...WORLD_SIZE };
  const creatures = createFounderPopulations(
    configuration.founders,
    worldSize,
    random,
  )
  return { seed: chosenSeed, simulation: new Simulation(worldSize, random, creatures) };
}
