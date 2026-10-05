import { createInitialPopulation } from "../population/createInitialPopulation";
import { Random } from "../utils/random";
import { Simulation } from "../simulation/simulation";
import {
  validateConfiguration,
  resolveOrganismConfiguration,
  type SimulationConfiguration,
} from "./configuration";
export const WORLD_SIZE = Object.freeze({ width: 600, height: 600 });
export function generateWorldSeed() {
  return Math.floor(Math.random() * 2147483646) + 1;
}
export function createUniverse(
  configuration: SimulationConfiguration,
  seed: number,
) {
  validateConfiguration(configuration);
  const random = new Random(seed);
  const worldSize = { ...WORLD_SIZE };
  const creatures = createInitialPopulation(configuration.amount, worldSize, random, resolveOrganismConfiguration(configuration));
  return { seed, simulation: new Simulation(worldSize, random, creatures) };
}
