
import { DEFAULT_ORGANISM_CONFIGURATION, type FounderPopulation } from "../population/createInitialPopulation";
export const MIN_WORLD_SEED = 1;
export const MAX_WORLD_SEED = 2147483646;
export interface SimulationConfiguration {
  founders: FounderPopulation[];
  seed?: number;
}

export const DEFAULT_CONFIGURATION = Object.freeze({
  founders: Object.freeze([{ amount: 20, configuration: DEFAULT_ORGANISM_CONFIGURATION }]),
  amount: 20,
  organism: DEFAULT_ORGANISM_CONFIGURATION,
});

export function validateConfiguration(configuration: SimulationConfiguration) {
  if (!Array.isArray(configuration.founders)) throw new RangeError("Founders must be an array");
  for (const founder of configuration.founders) {
    if (!founder || !Number.isSafeInteger(founder.amount) || founder.amount < 0) throw new RangeError("Founder amount must be a non-negative safe integer");
    const organism = founder.configuration;
    if (!organism || Object.values(organism).some(value => !Number.isFinite(value) || value < 0)) throw new RangeError("Founder configuration must contain finite non-negative values");
    if (organism.maxEnergy <= 0 || organism.initialEnergy > organism.maxEnergy || organism.mutationRate > 1) throw new RangeError("Invalid founder energy or mutation limits");
  }
  if (configuration.seed !== undefined) {
    if (
      !Number.isSafeInteger(configuration.seed) ||
      configuration.seed < MIN_WORLD_SEED ||
      configuration.seed > MAX_WORLD_SEED
    ) {
      throw new RangeError("Seed must be a safe integer between 1 and 2147483646");
    }
  }
}
