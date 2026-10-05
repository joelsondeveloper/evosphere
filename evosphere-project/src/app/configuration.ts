import { DEFAULT_ORGANISM_CONFIGURATION, type OrganismConfiguration } from "../population/createInitialPopulation";
export const MIN_WORLD_SEED = 1;
export const MAX_WORLD_SEED = 2147483646;
export interface SimulationConfiguration { amount: number; organism?: OrganismConfiguration; speed?: number; seed?: number; }
export const DEFAULT_CONFIGURATION: Readonly<SimulationConfiguration> = Object.freeze({ amount: 20, organism: DEFAULT_ORGANISM_CONFIGURATION });
export function resolveOrganismConfiguration(configuration: SimulationConfiguration): OrganismConfiguration {
  return { ...DEFAULT_ORGANISM_CONFIGURATION, ...(configuration.organism ?? {}), ...(configuration.speed === undefined ? {} : { speed: configuration.speed }) };
}
export function validateConfiguration(configuration: SimulationConfiguration) {
  if (!Number.isSafeInteger(configuration.amount) || configuration.amount < 0) throw new RangeError("A quantidade deve ser um inteiro não negativo.");
  const organism = resolveOrganismConfiguration(configuration);
  for (const value of Object.values(organism)) if (!Number.isFinite(value) || value < 0) throw new RangeError("A configuração dos organismos deve conter valores finitos e não negativos.");
  if (organism.maxEnergy <= 0 || organism.initialEnergy > organism.maxEnergy || organism.mutationRate > 1) throw new RangeError("Confira os limites de energia e mutação.");
  if (configuration.seed !== undefined && (!Number.isSafeInteger(configuration.seed) || configuration.seed < MIN_WORLD_SEED || configuration.seed > MAX_WORLD_SEED)) throw new RangeError(`A seed deve ser um inteiro entre ${MIN_WORLD_SEED} e ${MAX_WORLD_SEED}.`);
}
