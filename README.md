# EvoSphere 🧬

**An artificial life sandbox where neural behavior and genetic evolution emerge through natural selection.**

EvoSphere is a 2D artificial life simulation built around a simple idea:

> What happens if we create the rules of life, but don't program the solution?

Instead of hard-coding behaviors such as *find food*, *run from danger*, or *reproduce efficiently*, organisms have an inheritable neural brain that controls their actions.

They are born, sense the environment, make decisions, consume energy, reproduce, mutate, and die.

Natural selection does the rest.

---

## 🌎 The Idea

Each organism has its own:

- Genome
- Neural brain
- Energy
- Biological traits
- Sensors
- Behavior
- Mutation history
- Ancestry

The simulation does not explicitly tell organisms how to survive.

Their brains receive environmental information:

```text
Environment
     │
     ▼
  Sensors
     │
     ▼
 Neural Brain
     │
     ▼
   Actions
```

Examples of inputs:

```text
food distance
food direction
energy
age
nearby organisms
```

Possible outputs:

```text
move
turn
eat
reproduce
attack
```

The neural parameters themselves can be inherited and mutated.

If a behavior increases an organism's ability to survive and reproduce, the genes responsible for that behavior may become more common over generations.

---

## 🧬 Evolution First

Evolution is not an additional feature of EvoSphere.

**Evolution is the core mechanic.**

Instead of assigning arbitrary fitness points for desired behavior, the world itself creates evolutionary pressure.

```text
find food
    ↓
gain energy
    ↓
survive
    ↓
reproduce
    ↓
genes spread
```

An organism that fails to survive simply leaves fewer descendants.

No predefined strategy is required.

This allows unexpected behaviors and evolutionary strategies to emerge naturally.

---

## 🔬 Two Ways to Experience EvoSphere

### World Mode

A continuous living ecosystem.

Organisms are born, reproduce and die while generations overlap.

The player acts primarily as an observer and environmental force.

### Lab Mode

A controlled environment for evolutionary experiments.

Compare populations, change environmental conditions and observe how evolution responds across generations.

---

## 🧪 Scientific Inspector

The normal interface focuses on making the ecosystem understandable and enjoyable to watch.

For deeper analysis, organisms can be inspected individually.

The long-term inspector will expose information such as:

```text
Creature #841

Biology
├── Age
├── Energy
├── Health
└── Metabolism

Genome
├── Size
├── Speed
├── Vision
└── Neural genes

Brain
├── Sensors
├── Neurons
├── Connections
└── Weights

Lineage
├── Parents
├── Children
└── Ancestors

Evolution
├── Mutations
└── Genetic changes
```

The goal is to make emergent behavior something that can not only be observed, but investigated.

---

## 🧠 First Experiment

The first milestone is intentionally small.

A population starts with randomly generated genomes and neural brains.

Organisms can:

- sense food
- move
- rotate
- consume energy
- eat
- reproduce
- mutate
- die

There will be no programmed `seekFood()` behavior.

The first major experiment is simple:

> **Can random organisms evolve food-seeking behavior through natural selection alone?**

If later generations consistently outperform their ancestors without the behavior being explicitly programmed, the core concept works.

---

## 🛠 Tech Stack

### Simulation

- TypeScript

### Rendering

- HTML Canvas

### Interface

- React

The simulation engine is designed to remain independent from the renderer and UI.

```text
            EvoSphere

       ┌─────────────────┐
       │ Simulation Core │
       └────────┬────────┘
                │
       ┌────────┴────────┐
       │                 │
   Renderer          Dashboard
     Canvas             React
```

This separation allows the simulation to eventually run without rendering, making large evolutionary experiments and automated testing possible.

---

## ⚙️ Engineering Goals

EvoSphere is also an engineering experiment.

The project will explore topics such as:

- Genetic algorithms
- Artificial neural networks
- Emergent behavior
- Artificial life
- Natural selection
- Evolutionary computation
- Simulation architecture
- Spatial partitioning
- Procedural generation
- Performance optimization
- Deterministic simulations
- Data visualization

As populations grow, optimization techniques may include:

- Spatial hashing
- Quadtrees
- Web Workers
- Data-oriented structures
- WebGL
- WASM where justified

One long-term engineering challenge is:

> **How many biologically and behaviorally meaningful organisms can we simulate in real time?**

---

## 🌱 Long-Term Vision

EvoSphere may eventually simulate much more than organisms searching for food.

Planned areas of exploration include:

### Genetics

From simple numerical genes toward richer genotype-to-phenotype relationships.

### Behavior

Evolving neural architectures, memory, personality and individual experience.

### Ecology

Predation, herbivory, competition, cooperation and ecological niches.

### Plants

Plants becoming evolving organisms themselves rather than static resources.

### Life Cycles

Birth, development, adulthood, aging and death.

### Relationships

Parents, offspring, groups, territories, rivals and potentially social behavior.

### Environment

Biomes, climate, terrain, resources and procedurally generated worlds.

### Matter Cycle

```text
organism
   ↓
 corpse
   ↓
decomposition
   ↓
nutrients
   ↓
 plants
   ↓
organisms
```

The project will evolve incrementally. Complexity will only be introduced when the previous system is stable, measurable and understood.

---

## 🗺 Development Philosophy

EvoSphere follows a few principles:

**Program the laws, not the solution.**

Prefer systems capable of producing behavior over hard-coded behavior.

**Evolution should matter.**

Genetic differences should have meaningful consequences for survival and reproduction.

**Emergence over scripting.**

Interesting strategies should ideally arise from interactions between organisms, genetics and the environment.

**Start small. Scale carefully.**

Complex biological systems will be introduced progressively rather than attempting to simulate an entire ecosystem from day one.

**Measure everything.**

Evolution is difficult to understand without data. Population statistics, lineage information and experiments are first-class parts of the project.

---

## 🚧 Status

EvoSphere is currently in early development.

### Milestone 0.1 — First Evolution

- [ ] Simulation loop
- [ ] 2D world
- [ ] Creature entity
- [ ] Energy system
- [ ] Food system
- [ ] Genome
- [ ] Neural brain
- [ ] Sensors
- [ ] Neural-controlled movement
- [ ] Eating
- [ ] Asexual reproduction
- [ ] Genetic inheritance
- [ ] Mutation
- [ ] Death
- [ ] Population statistics
- [ ] Deterministic simulation seeds
- [ ] First evolutionary experiment

---

## 📜 License

License to be defined.

---

**EvoSphere**

*Create the world. Define the laws. Let evolution find the solution.*