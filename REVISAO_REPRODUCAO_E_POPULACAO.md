# Revisão de reprodução, população e integração do EvoSphere

Data: 05/10/2026. Revisão do código local, sem commit e sem implementação de funcionalidades novas.

## 1. Estado geral do projeto

Foram lidos todos os módulos de produção, as configurações de build/typecheck, o carregador de testes e as suítes existentes. O projeto mantém a separação de responsabilidades: Simulation executa regras e modifica estado, Creature cria o descendente com atributos físicos do primeiro pai, Brain implementa a rede e os operadores genéticos, Renderer desenha e Loop acumula tempo para ticks fixos.

O trabalho começou com mudanças locais já existentes em Brain, Creature, main, sensores, Simulation, utilitários e tipos, além da nova criação de população e dos testes genéticos. Essas mudanças foram preservadas. O diff contra HEAD inclui esse trabalho anterior e não representa somente as correções desta revisão.

O build inicial passou. Dos **135 testes encontrados, 60 passaram e 75 falharam**. Muitas falhas eram de fixtures ainda construídas para três outputs e quatro inputs; as expectativas precisavam acompanhar o contrato atual, sem reduzir a cobertura.

### Contrato neural confirmado

Os inputs são montados na Simulation nesta ordem:

1. foodAngle;
2. foodDistance;
3. foodVisible;
4. energy;
5. creatureAngle;
6. creatureDistance;
7. creatureVisible.

Os quatro neurônios recebem esses sete valores. Move, eat e reproduce transformam tanh para [0,1]; turn mantém [-1,1]. O genoma atual contém **28 pesos, quatro biases e dois genes de estratégia: 34 genes**.

A população inicial sorteia os 28 pesos e quatro biases. MutationRate e mutationStrength começam nos defaults 0.05 e 0.1, sem sorteio. Posição x/y e direção consomem outros três uniformes: **35 chamadas a next por indivíduo**, 175 para os cinco indivíduos do main atual. Os testes verificam quantidade e continuidade da sequência, independência de objetos, dimensões dos arrays e posições dentro do mundo.

Crossover percorre os quatro arrays, os quatro biases e os dois genes de estratégia; mutate cobre os mesmos 34 genes. Cada operação mantém sua ordem de consumo do RNG. Os testes genéticos anteriores foram ampliados para esse contrato.

## 2. Bugs encontrados

### BUG A — Validação incompleta do novo output reproduce

ValidateGenome inspecionava somente weightsMove, weightsTurn, weightsEat e seus biases. WeightsReproduce e biasReproduce podiam conter NaN, Infinity ou posições ausentes sem rejeição na construção. Algumas falhas só apareciam após consumo parcial do RNG em operações genéticas.

### BUG B — População inicial aceitava dimensões inválidas

Amount já era validado corretamente, mas WorldSize não. Largura/altura zero, negativas ou não finitas podiam gerar criaturas com posições inválidas antes da posterior validação no construtor da Simulation.

### BUG C — Capacidade energética inválida permitia reprodução incorreta

Com maxEnergy zero e energia positiva, o indivíduo podia satisfazer a comparação de energia, pagar custo zero e gerar um filho com energia zero. Esse filho era anexado depois da filtragem de mortos. Capacidade infinita também podia participar como iniciador, dependendo do estado, contaminando energia/custos. Nenhuma dessas situações representa a regra válida de reprodução por reservas energéticas finitas.

### BUG D — Pais eram cobrados antes da criação válida do filho

Os custos eram debitados antes de Creature.reproduce. Quando crossover/mutação lançavam um erro, por exemplo por overflow de genes, os pais ficavam sem energia e não havia descendente. Um teste provoca esse erro com valores finitos extremos e demonstra o débito indevido.

### O que já estava correto

Cada parceiro já era comparado com **sua própria maxEnergy**, tanto no filtro de candidatos quanto na verificação final. Cada um também paga 25% da própria capacidade. Não havia troca entre as capacidades dos pais; isso foi validado com valores diferentes em ambas as ordens.

Ambos precisam ter reproduce > 0.5; findNearest exclui o próprio indivíduo; Set impede participação em dois pares no mesmo tick; distância usa o mundo toroidal; o filho é criado por crossover seguido de mutate, entra ao final e não age no tick do nascimento. Essas regras foram preservadas.

## 3. Correções e arquivos de produção alterados nesta rodada

- `evosphere-project/src/brain/brain.ts`: incluir weightsReproduce e biasReproduce na validação já existente. Nenhum novo output ou gene foi criado nesta revisão.
- `evosphere-project/src/population/createInitialPopulation.ts`: rejeitar dimensões não positivas/não finitas antes da geração e do consumo do RNG.
- `evosphere-project/src/simulation/simulation.ts`: centralizar localmente a elegibilidade energética da reprodução, exigindo capacidade positiva finita, energia finita e reserva de pelo menos metade da própria capacidade; criar o filho antes de debitar os custos e registrar o par.

São correções pontuais. Não foram alterados thresholds de intenção, alcance, ordem dos candidatos, política de nearest, atributos físicos, posição do nascimento, cooldown, genes ou outputs. A sequência RNG das execuções válidas não recebe sorteios extras por essas correções.

A criação anterior do filho não torna o tick inteiro transacional: movimentos e alimentação anteriores já aconteceram e falhas posteriores ainda podem deixar estado parcial. Ela protege especificamente o débito reprodutivo do par cuja criação falhou.

## 4. Testes adicionados e atualizados

**135 casos anteriores preservados e migrados; 43 novos casos efetivos; total de 178.** Dos novos, 42 estão em `reproduction-population.test.mjs` e um amplia a matriz genética de incompatibilidade de arrays para weightsReproduce.

As quatro suítes anteriores foram atualizadas para o novo construtor do Brain, sete inputs, quatro outputs e contagens de genes/sorteios. Os sensores de comida agora retornam três entradas; a energia foi movida para a montagem dos inputs na Simulation. Um teste novo inspeciona exatamente essa montagem, incluindo energia zero quando maxEnergy é zero.

Nos testes de replay antigos, a população não precisa mais permanecer numericamente constante, pois reprodução agora existe. A comparação completa dos estados a cada passo foi mantida e os testes novos verificam contagens exatas de nascimentos em cenários controlados. O teste de aplicação verifica 175 sorteios iniciais e contabiliza os desenhos usando a população efetivamente enviada ao Renderer.

### Cobertura nova

- Cada um dos sete inputs influenciando cada um dos quatro outputs.
- Ordem exata dos sete sensores/entradas enviados ao Brain.
- Sensores de criaturas nas bordas horizontal, vertical e diagonal; exclusão de si mesmo por identidade; percepção de outro indivíduo na mesma posição; limite de alcance.
- Energia suficiente, insuficiente e exatamente no threshold, com capacidades iguais e diferentes.
- Intenção dos dois pais e exclusão do valor reproduce = 0.5.
- Distâncias menores, iguais e maiores que 20; reprodução pelas três combinações de bordas toroidais.
- Ausência de autorreprodução; no máximo um pareamento por indivíduo no tick; cenários com três e quatro pais.
- Parceiro próximo sem energia não bloqueando outro candidato elegível.
- Elegibilidade após alimentação e metabolismo.
- Custos individuais; filho no fim da lista, com metade da capacidade herdada; atributos e posição do primeiro pai; primeira ação somente no tick seguinte.
- Cérebro do filho comparado exatamente com crossover seguido de mutate em um RNG de referência, inclusive com cache gaussiano previamente preenchido.
- Independência entre pais, filhos, arrays e universos.
- Genética inválida, erro de criação do filho, capacidade zero/infinita e dimensões inválidas.
- Amount zero sem sorteios, amount negativo/fracionário/não finito/fora do inteiro seguro, população múltipla e posições em mundo retangular.
- População reproduzível pela seed e divergência entre seeds diferentes.
- Dois replays de 1200 ticks com nascimentos reais na Simulation, para seeds 1 e 12345.

Antes das correções, 37 dos primeiros 41 testes da suíte nova passaram e quatro falharam, reproduzindo os quatro bugs listados. Um caso adicional protege o input de energia zero.

## 5. Resultado final das verificações

| Verificação | Resultado |
| --- | --- |
| npm test | **178 aprovados, zero falhas, zero ignorados** |
| npm run build | **TypeScript e Vite aprovados** |
| tsc -p evosphere-project/tsconfig.json --noEmit | **Aprovado** |
| git diff --check | **Aprovado** |

Distribuição final: simulation 23, toroidal 49, determinism 28, genetics 36 e reproduction-population 42.

A aplicação também é importada e exercitada com DOM/Canvas simulados na suíte. Não foi feita inspeção visual real em navegador nem benchmark de grande população nesta rodada.

## 6. Determinismo

Em produção, o único Math.random continua sendo a escolha de WORLD_SEED antes da criação do universo. Isso é intencional. Main cria uma única instância de Random, usada pela população inicial e pela Simulation; esta a passa ao crossover e à mutação. Não foi encontrado new Random no meio da reprodução ou do ciclo de atualização.

Os replays novos constroem dois universos sem qualquer objeto mutável compartilhado. Usam a mesma seed, configuração e ordem dos indivíduos. O cenário de teste utiliza mundo 16×16 e intenção de reprodução inicial explícita para garantir interações; ele não altera regras de energia. Quatro pais geram exatamente dois filhos no primeiro tick. Depois, cada universo segue as regras reais por 1200 ticks.

Os estados são comparados exatamente a cada tick, incluindo genomas, posições, energia, alimentos, timer, configuração e estado do RNG com cachedGaussian. Instrumentação de testes é excluída dos snapshots, mas nenhum campo de domínio é omitido intencionalmente. Os números são verificados como finitos; Math.random é bloqueado durante esses replays; a ordem de avanço A/B alterna. A próxima gaussiana e o próximo uniforme também coincidem.

Continuam passando os replays anteriores de PRNG, simulação e genética, incluindo 100 mil uniformes por seed de referência, 12 mil ticks e 5 mil gerações genéticas por seed.

**Nos cenários testados, mesma seed + mesma configuração/estado inicial + mesma ordem de operações e ticks produz exatamente o mesmo estado, agora incluindo nascimentos reais.** Isso não prova igualdade bit a bit entre engines ou versões diferentes, nem independência da ordem do array.

## 7. Ordem de atualização, vieses e efeitos emergentes

O tick executa:

1. Para cada indivíduo vivo, calcula sensores/intenção, move e aplica wrap, tenta comer, registra intenção reprodutiva e desconta metabolismo/movimento.
2. Percorre candidatos em ordem, busca o parceiro elegível mais próximo ainda não pareado e realiza os cruzamentos.
3. Processa spawn de alimentos.
4. Remove criaturas sem energia e insere os recém-nascidos.

Consequências preservadas:

- Sensores veem um estado parcialmente atualizado: criaturas anteriores já se moveram e podem ter consumido alimentos; as posteriores ainda não.
- A intenção reprodutiva foi calculada antes da alimentação e do metabolismo, mas a reserva energética e a distância do par são verificadas depois das ações de todos.
- Candidatos anteriores escolhem primeiro; empates de distância seguem a ordem dos arrays. Não há garantia de pareamento globalmente ótimo ou simétrico.
- O primeiro pai determina atributos físicos e posição do filho, conforme a regra solicitada. Trocar a ordem pode mudar atributos, posição e resultado genético exato.
- Não existe cooldown; indivíduos ainda elegíveis podem se reproduzir no tick seguinte. O recém-nascido também passa a agir e pode se tornar elegível a partir do próximo tick, sem maturidade.
- Reprodução ocorre antes do spawn e consome o mesmo RNG. Mudar o número de cruzamentos pode mudar a sequência posterior de alimentos; isso é acoplamento determinístico, não uso indevido de aleatoriedade.

### Energia total com capacidades diferentes

Se Ma é a capacidade do primeiro pai e Mb a do segundo, os pais pagam 0.25*Ma + 0.25*Mb e o filho recebe 0.5*Ma. A variação líquida é **0.25*(Ma-Mb)**. Pode haver criação ou remoção de energia total quando as capacidades diferem.

Isso segue exatamente as regras fornecidas e a herança física permitida, portanto **não foi tratado como bug nem corrigido**. A população inicial atual usa a mesma capacidade para todos, de modo que esse efeito não aparece nesses pares homogêneos. Deve ser revisto antes de tornar atributos físicos variáveis por evolução.

## 8. Riscos técnicos ainda existentes

- Campos públicos permitem alterações externas inválidas em dimensões, atributos físicos e temporização. Por exemplo, tickDuration zero/negativo pode travar o acumulador do Loop. Não foi feito endurecimento geral da API além dos pontos necessários à reprodução/população.
- O Brain aceita topologias genéricas na construção; think exige correspondência com o tamanho dos inputs. A população inicial e os descendentes testados têm sete pesos por output, mas chamadas externas ainda podem construir uma topologia incompatível.
- Arrays fornecidos à Simulation são copiados superficialmente: criaturas e RNG podem ser compartilhados deliberadamente pelo chamador. Os testes garantem independência dos seus próprios universos, não proíbem todo uso externo indevido.
- Erros não fazem rollback do tick inteiro, do RNG ou do cache. Um erro em um par posterior pode ocorrer depois de outras ações/pares. A recuperação de erros de execução não tem política definida.
- Pesos e força de mutação não têm teto; saturação neural e overflow explícito continuam possíveis. Taxa zero e força zero permanecem absorventes sob mutação isolada; crossover pode recuperá-las com parceiro apropriado.
- Quantidade de alimentos não é limitada, e percepção/busca de parceiros percorrem arrays. Não houve otimização estrutural ou benchmark.
- Amount aceita inteiros seguros, mas valores enormes ainda podem esgotar memória/tempo. Um limite prático seria uma política de capacidade, não foi escolhido arbitrariamente.
- O Renderer não desenha cópias parciais dos corpos nas bordas e não sincroniza redimensionamento dinâmico posterior de WorldSize. A geometria lógica toroidal permanece coberta.
- A energia inicial/maxEnergy da população é 100000, enquanto alimentos fornecem 30 por padrão. Isso enfraquece a pressão alimentar inicial e torna custos reprodutivos muito maiores que uma refeição; é configuração atual, não erro aritmético.
- Os testes são JavaScript e o loader transpila os módulos TypeScript. O build verifica src, mas chamadas incorretas nos arquivos de teste são detectadas em execução, não pelo typecheck.

## 9. Recomendações não implementadas

- Definir e documentar as fronteiras exatas de alcance e a política de percepção de indivíduos mortos no tick.
- Medir distribuição de energia, número de pares, crescimento populacional e frequência de taxa/força zero antes de alterar regras evolutivas.
- Decidir futuramente se a conservação de energia deve ser exigida para pais com capacidades diferentes.
- Documentar seed, versão, ordem dos eventos e estado completo do RNG para eventual replay/checkpoint persistido.
- Considerar proteção de configuração mutável e verificação estática das fixtures, sem redesenhar a arquitetura.
- Só considerar índices espaciais ou outras otimizações após medir gargalos.

Cooldown, maturidade, sexo, espécies, seleção sofisticada de parceiros, genes físicos, novos sensores/outputs e mecânicas ecológicas não foram implementados nem introduzidos como correções.

## 10. Pontos ambíguos preservados

- **Alcance de reprodução:** o código usa `< 20`, enquanto a expressão “distância máxima 20” pode sugerir `<= 20`. O teste registra o comportamento atual: exatamente 20 não reproduz. Como a intenção de inclusão não foi explicitada e trocar isso muda a regra, foi preservado.
- **Percepção de mortos:** os sensores de criaturas recebem o array completo. Um indivíduo sem energia, ou que acabou de morrer durante o tick, pode continuar sendo percebido até a filtragem final. Ele não se torna parceiro elegível pelas regras de energia válidas. Se sensores devem representar apenas indivíduos vivos, será necessária uma decisão explícita sobre o instante dessa percepção.
- **Momento da elegibilidade:** atingir exatamente metade da energia antes do tick não garante reprodução, pois metabolismo/movimento são cobrados antes do pareamento. A ordem atual foi testada e preservada.
- **Nascimento no primeiro pai e herança física unilateral:** comportamentos expressamente intencionais nesta versão; não são bugs.

## Conclusão

Os quatro bugs demonstrados foram corrigidos com alterações pequenas em três arquivos de produção. O contrato neural de 34 genes, os requisitos e custos próprios de cada pai, o limite de um par por indivíduo, o nascimento adiado e a reprodução determinística passaram nas verificações.

A base atual está validada para os cenários cobertos, sem alegação de equilíbrio ecológico ou ausência de todos os estados inválidos possíveis. Nenhuma feature foi adicionada e nenhum commit foi feito.
