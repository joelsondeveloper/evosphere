# Implementação do dashboard frontend

## O que foi criado

Foi criado um dashboard de laboratório para configurar e iniciar a simulação. A interface tem cabeçalho EvoSphere, painel lateral com quantidade inicial e velocidade, seed atual, estado do universo, Canvas em destaque, legenda visual e uma área reservada para métricas futuras. A interface é responsiva e mantém o Canvas como foco.

## Organização

- `src/app/configuration.ts`: valores padrão e validação dos parâmetros de inicialização.
- `src/app/universe.ts`: criação de um universo com uma seed e configuração, sem lógica de simulação duplicada.
- `src/app/session.ts`: ciclo de vida do universo e encerramento do Loop anterior.
- `src/ui/dashboard.ts`: DOM, controles e eventos da interface.
- `src/main.ts`: montagem mínima da aplicação.

`createInitialPopulation` recebeu apenas um parâmetro opcional de velocidade; a regra física continua na população/criatura. A quantidade é passada diretamente para `createInitialPopulation`; a velocidade também chega como argumento, sem duplicar regras no frontend.

## Reinício

`Loop.stop()` cancela o frame pendente, invalida callbacks antigos e limpa o acumulador. `SimulationSession.start()` para a sessão anterior antes de criar o universo seguinte e remove o Canvas anterior. Isso evita múltiplos loops e elementos antigos ativos.

## Validação

O typecheck estrito passou diretamente com `tsc --noEmit`. A suíte científica existente manteve 175 aprovações. Três testes existentes continuam falhando: dois replays antigos exigem que todos os pais iniciais sobrevivam por 1200 ticks, uma hipótese incompatível com a reprodução atual, e o teste de bootstrap ainda fornece um mock DOM sem `querySelector`, enquanto a nova UI usa essa API. Nenhuma dessas falhas é causada por regra científica nova.

O comando `npm run build` e `npm test` não puderam ser executados pelo binário `npm` nesta sessão porque a instalação global do npm aponta para um `npm-cli.js` ausente. O build equivalente via TypeScript passou; a suíte foi executada diretamente com Node e o loader existente.

## Não implementado

Não foram alterados cérebro, sensores, genética, reprodução, energia, alimentação, RNG ou balanceamento. A seed continua sendo escolhida por `Math.random()` apenas antes da criação do universo, como já era permitido. Métricas, pausa, velocidade em tempo real, persistência de seed e controles evolutivos ficam como melhorias futuras.
