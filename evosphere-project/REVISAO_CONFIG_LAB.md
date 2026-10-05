# Revisão do Config Lab

## Organização do dashboard

O dashboard agora separa visualmente **Experimento**, **Controle da simulação** e **Config Lab**. O Canvas continua no centro da área de observação, com fullscreen preservado.

## Seed configurável

A seed aparece como campo editável, possui validação centralizada no intervalo `1..2147483646` e pode ser regenerada pelo botão de nova seed. A seed escolhida é enviada ao `SimulationSession` e ao `Random` do universo.

## Velocidade da simulação

Os multiplicadores `0.5×`, `1×`, `2×`, `5×` e `10×` alteram apenas o acumulador do `Loop`. Cada chamada científica continua usando `tickDuration = 1/60`; nenhum delta é alterado dentro da `Simulation`.

## Config Lab

Os valores físicos e genéticos dos organismos fundadores são reunidos em `OrganismConfiguration`. A configuração chega a `createInitialPopulation`, que cria cópias independentes dos cérebros e aplica `mutationRate` e `mutationStrength` iniciais. Esses atributos físicos continuam fora do genoma e os descendentes seguem as regras existentes.

## Arquitetura

O fluxo permanece `Dashboard → SimulationConfiguration → createUniverse → Random(seed) → createInitialPopulation → Simulation → Loop`. `SimulationSession` ganhou somente o controle de velocidade do Loop e continua encerrando o Loop anterior antes de reiniciar.

## Determinismo e validação

Foram adicionados testes para seeds válidas e inválidas, propagação do Config Lab, equivalência de populações com a mesma seed, isolamento após alterar a configuração e multiplicadores mantendo o timestep fixo. A mesma seed e configuração continuam consumindo a mesma sequência do RNG.

## Resultado

- Suíte completa: **183 testes passando, 0 falhas**.
- TypeScript typecheck: aprovado.
- Build Vite: aprovado.
- `git diff --check`: sem erros (apenas avisos de conversão LF/CRLF do Git).

## Melhorias futuras não implementadas

Podem ser adicionados presets de experimento, persistência de configurações, pausa/avanço manual e métricas científicas. Essas ideias não foram implementadas nesta etapa e não alteram as regras atuais.
