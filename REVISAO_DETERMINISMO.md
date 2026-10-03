# Revisão do determinismo do EvoSphere

Data: 03/10/2026. Ambiente de execução: Windows, Node.js 22.14.0, TypeScript e Vite instalados no projeto. Não foi feito commit.

## 1. Estado encontrado antes das alterações

A revisão começou pela leitura de todos os módulos de produção, testes e integração do RNG, antes de qualquer edição. A árvore de trabalho já continha mudanças não commitadas relativas ao mundo toroidal e ao novo RNG, inclusive `random.ts` e a suíte toroidal ainda não versionados. Essas alterações foram preservadas; o diff contra HEAD inclui trabalho anterior a esta rodada.

`Random` mantém estado por instância e usa a recorrência Park-Miller `(state * 16807) % 2147483647`. `next()` divide o novo estado por 2147483647. Para seeds válidas, o produto máximo da atualização é 36092757638322, abaixo do limite de inteiros exatos de JavaScript, 9007199254740991. Não há necessidade de trocar o algoritmo nem de converter a implementação para BigInt.

`main.ts` sorteia `WORLD_SEED` em [1,2147483646], cria uma única instância e a passa para todos os pesos e biases dos três Brains e para `Simulation`. Cada Brain consome 15 valores: três arrays de quatro pesos e três biases. São 45 chamadas antes de iniciar a simulação.

`Simulation` mantém a instância recebida e usa `next()` para decidir o spawn e gerar suas duas coordenadas. `randomWeight` e `randomWeights` usam o gerador fornecido. Não há criação de Random dentro do loop, da simulação ou dos helpers de pesos. Renderer e sensores não geram aleatoriedade.

A suíte inicial tinha 72 testes: **42 passaram e 30 falharam**. As chamadas antigas de Simulation e randomWeights não forneciam RNG, e o teste de spawn ainda substituía Math.random em vez do gerador injetado. O build inicial passou.

## 2. Testes anteriores, novos e resultados

- **72 testes anteriores preservados**, com adaptações para injeção do RNG onde necessário.
- **28 novos testes** em `evosphere-project/tests/determinism.test.mjs`.
- Total final: **100 testes aprovados, zero falhas, zero ignorados**.
- Antes da correção de produção: 99 dos 100 passaram; o único caso vermelho rejeitava a seed 2147483647. Esse caso foi também executado isoladamente e falhou com ausência do RangeError esperado.
- `npm test`: aprovado após a correção.
- `npm run build`: TypeScript e Vite aprovados.
- `git diff --check`: aprovado.

Distribuição dos 28 casos novos:

| Grupo | Quantidade | Cobertura |
| --- | ---: | --- |
| Seeds inválidas | 11 | 0, -1, -2147483647, 0.5, 1.5, NaN, Infinity, -Infinity, 2147483647, 2147483648 e MAX_SAFE_INTEGER |
| Sequência do PRNG | 6 | Vetor fixo da seed 1; três seeds com 100 mil chamadas cada; divergência entre seeds; independência de outro gerador |
| Pesos | 2 | Igualdade exata, intervalo [-1,1), continuidade da sequência, contagens vazias/inválidas sem consumo |
| Brains | 1 | Vinte Brains consecutivos reproduzíveis, saídas iguais, arrays independentes e ausência de reinício por Brain |
| Universos e replay | 3 | Igualdade a cada tick em 600 e 12000 ticks; repetição sequencial de experimento com 1200 ticks |
| Divergência pelo spawn | 1 | Seeds diferentes com configuração e estado inicial não aleatório idênticos produzem posições diferentes |
| Eventos de spawn | 1 | Momento e posição de cada evento, incluindo tentativas malsucedidas, contra referência independente |
| Continuidade Brain → spawn | 1 | Spawn continua a sequência já consumida pela criação do Brain |
| Consumo do RNG | 1 | Uma chamada por tentativa e duas adicionais apenas em sucesso; zero chamadas sem intervalo transcorrido |
| Interações | 1 | Alimentação toroidal, energia e remoção por morte permanecem exatamente iguais |

O teste de inicialização já existente foi ampliado: verifica 45 chamadas iniciais para os Brains, chamadas posteriores de spawn na mesma instância e apenas uma chamada global para escolher a seed. O teste toroidal de dimensões de spawn agora substitui `next()` apenas na instância local do seu próprio cenário.

## 3. Bugs encontrados

**Bug de produção: limite superior inclusivo na validação da seed.** O construtor rejeitava `seed > 2147483647`, aceitando o próprio módulo. A primeira atualização dessa seed resulta em zero e todas as seguintes continuam zero, uma sequência degenerada que viola o domínio de seeds estabelecido.

**Integração da suíte desatualizada.** Os testes antigos não acompanhavam a nova assinatura de Simulation e dos helpers de pesos. Isso impedia validar regressões da simulação e do mundo toroidal. Não era um problema da passagem de RNG em `main.ts`, que já estava correta.

Não foi encontrado outro bug na recorrência ou reinício acidental da sequência em produção.

## 4. Alterações realizadas

- `src/utils/random.ts`: única alteração de produção desta rodada — trocar `seed > 2147483647` por `seed >= 2147483647`.
- `tests/simulation.test.mjs`: fornecer geradores às chamadas existentes e verificar a continuidade da instância usada pela inicialização real da aplicação.
- `tests/toroidal.test.mjs`: fornecer geradores às simulações e adaptar o controle do spawn ao RNG injetado.
- `tests/determinism.test.mjs`: nova suíte de 28 casos descrita acima.
- Este relatório.

A recorrência Park-Miller, a normalização de next(), as regras de spawn e a arquitetura Simulation/Renderer/Loop foram preservadas. Não foram adicionadas dependências, reprodução, mutação, crossover ou outras funcionalidades biológicas.

## 5. Evidências de determinismo e independência

### Referência matemática

Para seed 1, os primeiros estados esperados são 16807, 282475249, 1622650073, 984943658 e 1144108930. O teste compara exatamente as saídas normalizadas com esse vetor fixo.

Para cada seed 1, 12345 e 2147483646, duas instâncias independentes foram comparadas por **100000 chamadas**, também confrontadas com uma referência da recorrência calculada em BigInt. Cada valor foi verificado como finito e no intervalo `0 <= valor < 1`. Para seeds válidas, esta implementação retorna valores estritamente positivos, o que atende ao contrato sem exigir que zero ocorra.

### Estado completo por tick

A fábrica de experimento utilizada somente nos testes cria um Random por universo e o reutiliza em todos os Brains e na Simulation. Cada chamada cria novo WorldSize, novas criaturas, Brains, arrays de pesos e alimentos.

Uma verificação recursiva por identidade confirma que os dois universos não compartilham nenhum objeto mutável. As comparações usam cópias destacadas obtidas por structuredClone, que nesta implementação incluem os campos de criaturas, pesos/biases, alimentos, dimensões, configuração, timer e estado armazenado no RNG. Não há serialização JSON que converta NaN em null. Também se verifica explicitamente que todos os números comparados são finitos.

Dois pares de experimentos foram comparados **depois de cada um dos 600 e 12000 ticks de 1/60 s**, com igualdade exata, sem tolerância. A ordem de avanço A/B alterna, e um terceiro universo avança entre eles para detectar interferência global. Math.random é substituído por uma função que lança erro durante esses experimentos, inclusive na construção dos Brains.

As três criaturas permanecem vivas no teste longo, com capacidade inicial de energia suficiente para isso: não é uma comparação trivial entre mundos vazios após extinção. O estado final difere do inicial e o próximo valor do RNG também coincide entre as duas simulações. Um cenário separado garante consumo através da borda e morte de uma criatura, comparando os estados após essas interações e por mais 1200 ticks.

### Spawn e consumo da sequência

Um experimento de 400 ticks de 0.25 s verifica 100 oportunidades de spawn. A cada tick, compara os eventos de duas simulações com uma referência independente em BigInt: tick do evento, x, y e energia. O cenário contém tanto sucesso quanto falha. Usar 0.25 s permite verificar o agendamento esperado sem ambiguidade de arredondamento acumulado.

Outro teste assegura que a sequência não reinicia depois da criação de um Brain. A política atual de consumo foi registrada em teste: uma chamada por tentativa, mesmo com probabilidade zero; duas chamadas adicionais para posição somente em sucesso.

## 6. Math.random restante e novas instâncias

Em `src`, resta **uma ocorrência de Math.random**, em `main.ts`, para escolher WORLD_SEED antes da criação do PRNG. Ela é relevante para qual universo será iniciado: duas recargas da página normalmente escolhem seeds diferentes. Foi preservada por ser a seleção inicial de seed, não uma fonte oculta durante a evolução do estado para uma seed já fixada.

A aplicação exporta WORLD_SEED, mas não possui um fluxo de interface para informar a seed de replay. Reproduzir um experimento exige registrar a seed escolhida e reconstruir a configuração e a ordem de inicialização com ela. Não foi criada interface ou persistência nesta rodada.

Em produção, existe apenas um `new Random`, em main.ts. Nos testes, as várias instâncias são intencionais: correspondem a universos independentes, geradores de referência e cenários isolados. Nenhuma instância é recriada por tick dentro de um mesmo experimento.

Não foram encontradas fontes como Date.now, performance.now ou crypto na lógica de produção pesquisada. O timestamp recebido pelo Loop controla quantos ticks são executados; não é usado como RNG. Os testes que substituem Math.random ou next usam mocks restaurados ao término do respectivo caso.

## 7. Riscos que permanecem

1. **Ordem de consumo faz parte da reprodução.** Inserir uma chamada next, mudar a ordem dos Brains ou mudar uma ramificação que consome aleatoriedade altera o restante da sequência. Uma seed isolada não permite comparar versões arbitrárias do código.
2. **Mesmos ticks significa mesma sequência de passos.** Mesmo tempo de relógio, ou mesmo tempo total dividido de outra maneira, não garante o mesmo estado. O Loop limita atrasos e pode descartar tempo; os testes de universos comparam chamadas idênticas a update.
3. **Estado mutável e RNG exposto.** Compartilhar a mesma instância entre universos, chamar simulation.random.next externamente ou compartilhar criaturas pode interferir na sequência. O código atual permite isso; os testes garantem que seus próprios cenários não o fazem.
4. **Save/resume não existe.** Para continuar do meio, a seed inicial não basta: seria necessário preservar estado atual do RNG e toda a simulação, inclusive temporizadores. Não foi adicionada API de checkpoint.
5. **Portabilidade numérica.** A recorrência inteira foi validada contra BigInt, mas a simulação usa sin, cos, tanh e outras operações de ponto flutuante. Esta rodada não demonstra igualdade bit a bit entre engines, plataformas ou versões diferentes.
6. **Estado de PRNG versus seed.** A Simulation recebe uma instância possivelmente já consumida pelos Brains. Dois geradores com a mesma seed original, porém com quantidades diferentes de chamadas anteriores, não estão no mesmo estado inicial.
7. **Dois tipos com o nome Random.** Helpers usam o contrato estrutural `{ next(): number }` de types.ts, enquanto Simulation recebe a classe concreta. Isso compila e não rompe o determinismo atual, mas pode confundir evolução dos testes e futuras dependências. Não renomeei nem unifiquei tipos nesta revisão.
8. **Riscos anteriores continuam.** WorldSize e tickDuration são mutáveis, interações favorecem a ordem da lista, alimentos podem crescer sem limite e buscas são lineares. Determinismo não prova equilíbrio ecológico, escalabilidade ou ausência de bugs nesses aspectos.
9. **Escopo da evidência.** Foram testadas seeds e cenários selecionados, não todo o domínio de seeds nem todo estado possível. Não houve teste visual em navegador ou benchmark de larga escala; a inicialização usa DOM/Canvas simulados.

## 8. Confirmação explícita

**Sim: dentro dos cenários testados, mesma seed + mesma configuração inicial + mesmos ticks produz exatamente o mesmo estado da simulação.** A afirmação pressupõe a mesma implementação, mesma ordem de inicialização/consumo do RNG, objetos independentes e ausência de intervenção externa diferente.

A igualdade foi verificada a cada tick, inclui estado aleatório e temporizadores, preserva os 72 testes anteriores e não depende de tolerância numérica para comparar experimentos.

## 9. Prontidão para reprodução, herança e mutação

**A base de determinismo está pronta para começar uma implementação incremental dessas etapas**, com a suíte atual como proteção. Isso não significa que o comportamento biológico futuro já esteja validado.

Antes ou junto de cada incremento, recomendo garantir cópia independente dos pesos entre pais e filhos, definir a ordem de nascimentos/remoções e consumo do RNG, e manter testes de replay que incluam os novos eventos. Não criar outro Random ao gerar um descendente do mesmo universo. Registrar seed, configuração e versão do experimento será importante para investigação de resultados.

Começaria por uma etapa pequena e testável, mantendo Simulation como responsável pelas regras. Não vejo necessidade de trocar o PRNG ou adotar uma arquitetura nova para iniciar esse trabalho.

Mensagem de commit sugerida, sem executar commit: `fix: validate RNG seed bounds and add determinism regression tests`.
