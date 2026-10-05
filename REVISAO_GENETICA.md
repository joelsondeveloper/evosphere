# Revisão da infraestrutura genética do EvoSphere

## Resumo e estado inicial

Foram inspecionados Brain, Random, o contrato Random em types.ts, a integração com Simulation, a inicialização do universo e os testes existentes. A árvore de trabalho já continha alterações não commitadas em brain.ts, random.ts e types.ts. Elas foram preservadas; o diff contra HEAD inclui a implementação genética anterior a esta revisão.

Antes de editar, os **100 testes existentes passaram**, assim como o build TypeScript/Vite. A suíte anterior verificava o PRNG uniforme, a simulação e a geometria toroidal, mas não detectava o clamp incorreto dos novos genes de estratégia.

O Brain já tinha defaults corretos (mutationRate 0.05 e mutationStrength 0.1), preservava zeros explícitos via `??`, copiava arrays no construtor, gerava descendentes por blend e retornava um novo Brain na mutação. O Random já implementava Box-Muller com cache por instância.

## Bugs encontrados e correções

### 1. Clamp incorreto de mutationRate

A expressão `Math.max(0, valor, 1)` impunha um mínimo de 1, em vez de limitar a taxa a [0,1]. Assim, até um Brain com taxa zero passava a ter taxa um após mutate, e ruído positivo podia produzir valores maiores que um.

Correção: `Math.min(1, Math.max(0, valor))`. Os testes demonstram ambos os limites, preservação de zero e comportamento nas taxas 0 e 1. Não foi introduzido piso positivo.

### 2. Valores inválidos e overflow podiam gerar genomas contaminados

O construtor aceitava genes NaN/Infinity, taxa fora de [0,1] e força negativa ou não finita. Campos públicos alterados depois também entravam nas operações genéticas. Mesmo com entradas finitas, `gene + gaussian * strength` podia transbordar para Infinity.

Correções locais em Brain:

- Validar finitude de pesos e biases, taxa finita em [0,1] e força finita não negativa ao construir e antes de crossover/mutate.
- Rejeitar arrays com posições ausentes ao percorrer seus valores.
- Validar o uniforme recebido em [0,1), o valor gaussiano e o resultado aritmético.
- Lançar RangeError em caso inválido ou overflow, sem entregar um descendente contaminado.

Pesos e biases continuam sem clamp; números finitos grandes continuam permitidos. As validações não substituem a escolha de limites biológicos. Uma falha durante uma operação já iniciada pode ter consumido RNG; não foi implementado rollback.

### 3. Crossover inválido consumia parte da sequência

A incompatibilidade de weightsTurn ou weightsEat era descoberta depois de consumir alphas dos arrays anteriores. Isso alterava o RNG mesmo quando a incompatibilidade completa dos pais já poderia ser detectada antes.

Correção: validar os dois genomas e os três pares de tamanhos antes do primeiro sorteio. Casos inválidos por dados ou tamanhos são rejeitados sem consumir RNG. Cada par de arrays continua exigindo comprimentos iguais.

### 4. Crossover de genes idênticos podia introduzir ruído de arredondamento

Com genes 0.1 e alpha 0.3, a expressão de blend retornava 0.09999999999999999. Isso não quebrava o replay, mas mudava um gene que matematicamente deveria permanecer igual.

Correção: depois de consumir e validar o alpha, retornar diretamente o valor quando os dois genes são iguais. Arrays do descendente continuam novos. O consumo permanece um alpha por gene, inclusive em autocrossover.

### 5. Verificação de whitespace

Foi removido um espaço em branco no final de uma linha de random.ts apontado por `git diff --check`. A implementação funcional de gaussian() não foi alterada.

## Testes adicionados e validação final

Arquivo novo: `evosphere-project/tests/genetics.test.mjs`, com **35 testes**. Nenhum teste anterior foi removido ou enfraquecido.

Cobertura:

- Defaults e zeros explícitos.
- Alpha independente por gene, ordem e quantidade dos sorteios, herança dos dois genes de estratégia, limites parentais e ausência de clamp comportamental.
- Pais idênticos, autocrossover, independência dos arrays e preservação dos pais.
- Incompatibilidade em cada um dos três arrays, antes do consumo do RNG.
- Taxa zero, taxa um, força zero, comparação estrita da probabilidade, número de chamadas gaussianas, clamp inferior/superior e ordem da auto-adaptação.
- NaN, Infinity, -Infinity, taxas inválidas, força negativa, arrays esparsos e corrupção posterior de campos públicos.
- Overflow da mutação e saídas inválidas de geradores injetados.
- Fórmula do par Box-Muller, cache com valor zero, intercalação com next e independência do cache entre instâncias.
- Estatística gaussiana com seed fixa e limites amplos.
- Replay genético em universos independentes para três seeds, por 5000 gerações cada, e divergência com seeds diferentes.

Primeira execução dos 35 casos novos, antes das correções: **11 passaram e 24 falharam**. O caso de genes idênticos foi então fortalecido com alpha 0.3 e reproduziu separadamente o desvio de arredondamento.

Resultado final:

| Verificação | Resultado |
| --- | --- |
| npm test | **135 aprovados, 0 falhas, 0 ignorados** |
| npm run build | **TypeScript e Vite aprovados** |
| git diff --check | **Aprovado** |

Os 100 testes anteriores, incluindo os 72 de simulação/geometria e os 28 de determinismo uniforme, continuam passando. Não houve inspeção visual em navegador; a suíte existente exercita a inicialização com DOM/Canvas simulados.

## Análise do crossover

O crossover implementa `alpha * geneA + (1-alpha) * geneB`, com sorteio independente por gene. Não é extrapolação do tipo BLX-alpha: o resultado fica entre os valores dos pais, sujeito ao arredondamento de ponto flutuante.

Para o Brain atual, são 17 chamadas a next: quatro pesos de move, quatro de turn, quatro de eat, três biases, mutationRate e mutationStrength. Crossover não chama gaussian. Os pais permanecem intactos, e o descendente possui arrays próprios.

O blend tende a reduzir diferenças extremas quando repetido, e a independência por gene pode romper combinações de pesos que funcionavam bem juntas. Isso é uma consequência do desenho escolhido, não um bug. Inverter a ordem dos pais com a mesma sequência de alphas geralmente muda o descendente exato; a ordem dos pais deve fazer parte do contrato de replay.

A compatibilidade genética valida os pares de arrays entre os pais. Não fixa a topologia em quatro entradas: o contrato do neurônio continua verificando a quantidade de entradas ao pensar. Dois pais com a mesma topologia inadequada aos sensores ainda não são uma configuração válida para a Simulation.

## Análise da mutação gaussiana

Cada um dos 17 genes recebe uma decisão uniforme. Quando `next() < mutationRate`, recebe `gene + gaussian() * mutationStrength`. A ordem permanece pesos move, turn, eat, biases move/turn/eat, taxa e força.

MutationRate e mutationStrength originais são usados em todas as decisões e deslocamentos da chamada. Mutar a taxa para zero no penúltimo gene não cancela a tentativa de mutar a força no último. O teste correspondente confirma isso. Não foi alterada a ordem nem aplicada a estratégia recém-mutada retroativamente aos pesos.

Mutate retorna outro Brain. O Brain herdado/intermediário e seus arrays permanecem intactos. Com força zero e taxa positiva, tentativas bem-sucedidas ainda consomem gaussianas, embora o deslocamento seja zero; esse consumo original foi preservado por afetar o replay.

### Box-Muller e cache

A implementação usa dois uniformes: raio `sqrt(-2 * log(u1))` e ângulo `2*pi*u2`. Retorna o componente cosseno e guarda o seno. A chamada seguinte retorna o cache e o limpa, sem consumir uniformes. O teste com cache exatamente zero confirma que a condição `!== null` está correta.

Chamadas next entre as duas gaussianas não descartam o cache, comportamento intencional e testado. O cache pertence à instância, sem estado global. O Park-Miller com seeds válidas produz u1 estritamente maior que zero, de modo que log(0) não ocorre no gerador concreto. Uma futura substituição que possa produzir zero em u1 exigirá tratamento específico em Box-Muller; essa situação não foi introduzida no gerador atual.

Para 100000 amostras da seed 42:

| Medida | Observado | Faixa usada no teste |
| --- | ---: | --- |
| Média | 0.00508838 | valor absoluto menor que 0.02 |
| Variância populacional | 1.00122746 | entre 0.96 e 1.04 |
| Fração positiva | 0.50281 | entre 0.48 e 0.52 |
| Fração com valor absoluto maior que 2 | 0.04589 | entre 0.04 e 0.052 |
| Média do produto dos pares consecutivos | 0.00172904 | valor absoluto menor que 0.03 |

Os resultados são aproximadamente compatíveis com uma normal padrão. A seed fixa elimina flutuação entre execuções no mesmo ambiente e as margens são amplas. Isso é uma verificação de sanidade, não prova completa da qualidade estatística ou independência do PRNG. Como o uniforme é discreto e finito, as caudas também têm alcance finito.

## Análise dos genes de estratégia evolutiva

As seguintes decisões foram **preservadas**, pois alterá-las mudaria a dinâmica pretendida:

- **Taxa zero é absorvente sob mutação isolada.** Nenhum gene, nem a própria taxa ou a força, pode mudar por mutate quando a taxa é zero. Crossover com parceiro de taxa positiva pode recuperar uma taxa positiva; dois pais com taxa zero não conseguem fazê-lo.
- **Força zero também é absorvente sob mutação isolada.** Mesmo havendo tentativas, todos os deslocamentos são zero, inclusive os da taxa e da própria força. Um parceiro com força positiva pode recuperar a amplitude por crossover.
- **Clamps acumulam valores exatamente nas fronteiras.** O ruído gaussiano é simétrico antes do clamp; as distribuições finais da taxa e da força deixam de sê-lo perto de zero e um. Não foi aplicado epsilon mínimo.
- **A força controla também o deslocamento da taxa.** Um atributo que escala pesos/biases também escala uma probabilidade adimensional. Forças grandes tornam os saltos da taxa mais extremos e aumentam a chegada aos limites.
- **A força sofre mudança relativa.** Quando selecionada, passa de s para `max(0, s*(1+z))`, salvo diferenças de arredondamento. Um z menor ou igual a -1 a leva a zero. Portanto, chegar a zero não exige uma cauda particularmente rara da normal.
- **A taxa regula a própria capacidade de adaptação.** Taxas baixas reduzem simultaneamente a exploração comportamental e a chance de mudar a estratégia. Isso pode estabilizar linhagens, mas também restringir a adaptação.

Sem população, seleção e sucesso reprodutivo ainda não é possível concluir que esses genes produzirão auto-adaptação vantajosa. Eles são parâmetros herdáveis que evoluem pelas regras implementadas; melhoria evolutiva é uma hipótese a medir.

## Determinismo e integração/replay

Foram criados pares de universos inteiramente independentes para seeds 1, 12345 e 2147483646. Cada universo cria apenas um RNG, reutilizado na geração dos Brains, crossover, mutate e spawn.

Em cada uma das 5000 gerações por seed, o harness cruza dois Brains, guarda o herdado, chama mutate, verifica que o herdado não mudou, substitui o Brain de uma criatura existente e executa um tick de 1/60 s. Essa substituição existe somente no teste: não foram implementados nascimentos, escolha de parceiros ou reprodução na Simulation. O segundo Brain fica como parceiro fixo de estratégia positiva, evitando que o replay inteiro se torne trivial pela absorção de todos os parâmetros em zero.

A ordem de execução entre os dois universos alterna; um terceiro experimento independente também consome RNG. Math.random é bloqueado durante os replays. Verificações recursivas por identidade rejeitam objetos compartilhados, e snapshots destacados com structuredClone são comparados exatamente a cada geração, incluindo criaturas, genomas, alimentos, timer, estado uniforme e cachedGaussian. Os números são verificados como finitos, as estratégias como válidas e ambas as criaturas permanecem vivas. Ao final, a próxima gaussiana e o próximo uniforme também coincidem.

**Confirmação: dentro dos cenários testados, mesma seed, mesmos pais/configuração inicial, mesma ordem de operações e mesmos ticks produzem descendentes e estados exatamente iguais.** Não foi usada tolerância para o replay. O novo cache não quebrou os testes anteriores de next e simulação.

O contrato Random em types.ts inclui next e gaussian e é implementado pela classe concreta; o build estrito passou. O único Math.random em produção continua em main.ts, exclusivamente para escolher a seed inicial. O único new Random de produção continua nessa inicialização. Não foi encontrado reinício de sequência durante operações genéticas.

## Riscos que permanecem

- Pesos, biases e força não têm teto finito de gameplay. A validação impede retornar NaN/Infinity, mas valores grandes podem saturar tanh, tornar respostas quase binárias e elevar a chance de erro por overflow. Erros agora são explícitos; não há recuperação automática na Simulation.
- Campos e arrays continuam públicos. Operações genéticas os revalidam, mas alterações externas ainda podem afetar a simulação e a ordem dos eventos.
- Erro por overflow ou RNG inválido no meio de uma operação não desfaz sorteios já consumidos. O chamador deve tratar a falha de forma definida; não deve tentar novamente silenciosamente supondo a mesma sequência.
- Checkpoints futuros devem preservar tanto state quanto cachedGaussian. Salvar apenas seed ou o estado uniforme não basta para retomar de uma chamada gaussiana ímpar.
- A ordem dos pais, dos genes, das tentativas e dos eventos de reprodução faz parte do determinismo. Alterar qualquer uma pode mudar o replay, mesmo mantendo a seed.
- Não foi demonstrada igualdade bit a bit entre engines ou plataformas diferentes: log, sqrt, sin, cos e tanh podem ter diferenças numéricas entre implementações.
- O teste estatístico não é um estudo evolutivo; os replays não incluem seleção natural, nascimento ou custos reprodutivos.
- Permanecem os riscos já documentados de dimensões/ticks públicos mutáveis, ordem de disputa por comida, crescimento de alimentos e custo das buscas. Eles não foram reestruturados nesta rodada.

## Recomendações e conclusão

**Sim: após estas correções, a infraestrutura genética está segura o suficiente, nos cenários validados, para começar a implementação incremental da reprodução sexual na Simulation.** Isso não significa que a dinâmica de auto-adaptação esteja balanceada nem que a reprodução futura já esteja validada.

Para o próximo incremento, definir explicitamente a ordem de processamento de pais/filhos, usar sempre o mesmo RNG do universo, manter arrays independentes e acrescentar replay que inclua nascimentos e remoções. Preservar zeros como permitido, mas medir a frequência de linhagens com taxa/força zero e a distribuição da amplitude e dos pesos antes de decidir qualquer mudança nas regras.

Antes de adicionar persistência, especificar como salvar o cache gaussiano. Antes de aumentar populações, medir custo por tick. Não há necessidade demonstrada de trocar Park-Miller, introduzir arquitetura complexa ou mudar a política de mutação nesta etapa.

Nenhuma funcionalidade de reprodução, seleção de parceiros, nascimento, energia reprodutiva ou output adicional foi implementada. Não foi feito commit.
