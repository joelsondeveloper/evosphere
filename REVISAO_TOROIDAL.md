# Revisão e validação toroidal do EvoSphere

Data: 02/10/2026. Este relatório descreve o estado atual e substitui, para geometria e temporização, as observações históricas de `REVISAO_TECNICA.md`. O projeto agora possui wrap e ticks fixos; essas mudanças já existiam antes desta rodada.

## Análise antes das alterações

A árvore de trabalho estava limpa. Foram lidos todos os módulos em `src`, a suíte existente, o carregador de testes e as configurações. Não foram encontradas referências a `worldWidth` ou `worldHeight`.

Conexões observadas:

- `WorldSize`, em `utils/types.ts`, contém `width` e `height`.
- `main.ts` cria `Simulation` com 600×600.
- `Simulation` fornece seu `worldSize` aos sensores; atualiza a direção, move e aplica wrap nas duas coordenadas; procura o alimento mais próximo e verifica a distância para comer; usa as mesmas dimensões para spawn.
- `getFoodSensors` chama `getVisible`, `findNearest`, `relativeAngle` e `distanceBetween`, sempre repassando `WorldSize`.
- `getVisible` e `findNearest` usam a distância toroidal. `relativeAngle` usa `angleBetween` e normaliza a diferença em relação à direção da criatura.
- `Loop` já acumulava tempo e executava ticks de 1/60 s, limitando o tempo recebido por quadro a 100 ms. Sua implementação foi preservada.
- `Renderer` ainda usava 600×600 diretamente no tamanho do Canvas e na limpeza.

A geometria existente estava correta para posições canônicas dentro de mundos válidos, inclusive através das bordas. A distância e o ângulo, contudo, só compensavam um deslocamento de mundo: coordenadas externas separadas por múltiplas larguras/alturas produziam respostas incorretas. Isso também afetava sensores, chamados antes do primeiro wrap de uma criatura inicializada fora do mapa.

## Resultados de validação

| Etapa | Aprovações | Falhas |
| --- | ---: | ---: |
| Suíte original, antes de qualquer edição | 6 | 17 |
| Testes migrados + primeiros casos novos, antes das correções de produção | 66 | 5 |
| Suíte final completa | **72** | **0** |

As 17 falhas originais vinham das chamadas antigas sem `WorldSize`, da antiga assinatura de `Simulation` e da expectativa desatualizada de um único passo variável de 100 ms no loop. Os 23 testes anteriores foram mantidos e ajustados ao contrato atual.

Os cinco casos vermelhos novos demonstraram: distância incorreta com posições externas, ângulo incorreto com múltiplos deslocamentos de mundo, percepção incorreta antes do wrap inicial, Renderer com dimensões fixas e ausência de rejeição de dimensões inválidas. Depois foi acrescentado um caso de ângulo em posições equivalentes para proteger o tratamento de zero negativo.

Executados em `evosphere-project`:

- `npm test`: 72 testes aprovados, nenhum ignorado ou com falha.
- `npm run build`: TypeScript e Vite aprovados, tanto no estado inicial quanto no final.
- `git diff --check`: aprovado.

A suíte importa `main.ts` e executa a aplicação com DOM/Canvas simulados. Não foi realizada inspeção visual em navegador nesta rodada. Os testes de Canvas verificam argumentos e dimensões, não pixels renderizados.

## Testes novos: 49 casos

Arquivo: `evosphere-project/tests/toroidal.test.mjs`. Comparações geométricas usam tolerância absoluta de 1e-9; identidades de objetos, contagens e remoções usam igualdade exata.

| Grupo | Casos | O que valida |
| --- | ---: | --- |
| Distâncias | 8 | Normal; bordas horizontal, vertical e dupla; posição idêntica; metade do mundo; mundo retangular; posições externas equivalentes. Todas verificadas nos dois sentidos. |
| Ângulos absolutos | 12 | Normal; horizontal nos dois sentidos; vertical nos dois sentidos; duas bordas nos dois sentidos; empates positivos/negativos em metade do mundo; mundo retangular; múltiplos deslocamentos; posições equivalentes coincidentes. |
| Ângulo relativo | 1 | Direção da criatura e normalização combinadas com o deslocamento toroidal. |
| Mais próximo | 2 | Alimento próximo pela borda vence candidato local; empate preserva primeiro candidato. |
| Sensores/visão | 5 | Detecção horizontal, vertical e diagonal; inclusão exata do limite e exclusão além do alcance; seleção do alimento mais próximo pela borda. |
| Alimentação | 6 | Consumo horizontal, vertical e diagonal; remoção apenas do consumido; exclusão no limite exato e além dele; impossibilidade de duas criaturas comerem a mesma instância. |
| Movimento/wrap | 9 | Quatro limites; dois eixos juntos; chegada exata à borda direita/inferior; múltiplas voltas positivas e negativas, em mundo 800×400. |
| Integração | 1 | Sensor vê pela borda, criatura cruza e come no mesmo update. |
| Percepção antes do primeiro wrap | 1 | Posição inicial externa equivalente à posição canônica. |
| Spawn | 1 | Usa largura e altura distintas de WorldSize; aleatoriedade substituída apenas no teste. |
| Renderer | 1 | Canvas e limpeza usam 800×400, sem dimensão fixa 600. |
| Dimensões inválidas | 1 | Rejeita zero, negativo, NaN e Infinity em ambos os eixos. |
| Ticks fixos | 1 | Preserva resto de tempo inferior a um tick e desenha a cada quadro. |

O teste antigo do loop agora exige seis ticks de 1/60 s após o intervalo limitado a 100 ms. O teste anterior de overflow de distância utiliza um mundo suficientemente grande para preservar seu propósito original.

## Bugs corrigidos e alterações exatas

1. **Dimensões duplicadas no Renderer.** `Renderer` recebe `WorldSize` no construtor, inicializa o Canvas com ele e usa `canvas.width/height` ao limpar. `main.ts` passa `simulation.worldSize`. O único 600×600 restante em `src` é a configuração inicial do mundo.
2. **Distância e ângulo incorretos para coordenadas externas.** `distanceBetween` e `angleBetween` reduzem cada deslocamento por módulo da dimensão correspondente antes de escolher o caminho mínimo. Ângulos preservam o sinal nos empates de meia dimensão. Zeros negativos do resto são convertidos para zero ao chamar `atan2`, evitando uma direção artificial para posições equivalentes coincidentes.
3. **Dimensões inválidas contaminando wrap/geometria.** O construtor de `Simulation` rejeita largura ou altura não finita ou não positiva com `RangeError`, antes de aceitar o mundo.
4. **Suíte desatualizada pela migração.** Foram atualizadas as chamadas de Simulation, distância, busca e sensores para passar WorldSize e a expectativa do loop para ticks fixos. Nenhum teste anterior foi removido.

Arquivos de produção alterados: `main.ts`, `renderer/renderer.ts`, `simulation/simulation.ts`, `utils/math.ts`. Sensores, Brain, regras de alimentação, movimento e Loop não foram reestruturados. Nenhuma dependência foi adicionada.

## Regras preservadas e riscos não corrigidos

- **Limites diferentes de visão e alimentação:** visão usa `<= visionRange`; alimentação usa `< 15`. Alimento exatamente a 15 unidades não é consumido. Essa regra foi preservada e testada.
- **Empates:** em meia dimensão há dois caminhos igualmente curtos. A direção continua seguindo o sinal do deslocamento; nearest continua escolhendo o primeiro candidato em empate. Não foi criada nova política de desempate.
- **Representação gráfica:** os corpos não são desenhados também no lado oposto quando atravessam parcialmente uma borda. Quadrados usam o canto como posição, enquanto a lógica mede distâncias entre pontos. Não alterei aparência ou geometria de corpos.
- **WorldSize mutável:** Simulation mantém a referência recebida e valida apenas na construção; alterações posteriores podem invalidar dimensões e desalinhar o Canvas, cujo tamanho é definido na criação. Não existe fluxo de redimensionamento no projeto atual; não implementei um nem impus imutabilidade nova.
- **Domínio numérico:** os utilitários pressupõem dimensões válidas. Chamadas diretas com dimensões inválidas ou coordenadas não finitas ainda podem produzir NaN. Subtrações de coordenadas próximas ao limite máximo do tipo number podem transbordar. A validação não cobre todo estado público mutável.
- **Dimensões fracionárias/extremas:** a simulação aceita números positivos finitos, mas Canvas tem dimensões inteiras e limites próprios. Os mundos usados e testados têm dimensões inteiras representáveis; não introduzi uma política de tamanho máximo ou arredondamento.
- **Ticks:** o loop fixo reduz dependência do FPS, mas descarta tempo acima de 100 ms por quadro e mantém a limitação conhecida de baixa taxa de quadros. `tickDuration` é público; zero/negativo pode travar o acumulador. Não ampliei esta revisão geométrica para mudar sua configuração ou política temporal.
- **Interações discretas:** criaturas ainda podem atravessar uma região de alimentação entre ticks se forem muito rápidas. Consumo acontece no ponto final do movimento, uma vez por tick, e a ordem da lista decide a disputa. Não implementei colisão contínua ou resolução simultânea.
- **Escalabilidade:** alimentos não expiram e a busca permanece proporcional a criaturas × alimentos; esta rodada não inclui benchmark nem otimização espacial.
- **Testes em JavaScript:** o loader transpila TypeScript sem checar os argumentos dos arquivos de teste. O build verifica `src`; foi justamente a execução da suíte que detectou chamadas antigas nos testes. Não migrei a infraestrutura de testes.

## Conclusão sobre consistência toroidal

Com base nos testes, **movimento, distância, nearest, sensores, ângulos relativos/absolutos e alimentação são consistentes para as dimensões válidas e posições finitas cobertas**, tanto em mundo quadrado quanto retangular. O exemplo (595,300) → (5,300), em 600×600, mede 10 unidades e aponta para a direita, por 0 graus. O inverso aponta para a esquerda, por 180 graus.

Essa conclusão é sobre a geometria lógica. Não significa desenho de cópias dos corpos nas bordas, suporte a redimensionamento dinâmico ou garantia para todo valor extremo representável.

## O que acrescentaria, modificaria ou removeria depois

- **Acrescentaria:** verificações de invariância por translação periódica e cenários de longa duração; medições de população, quantidade de alimentos e tempo por tick antes de otimizar. A atual suíte já serve como proteção inicial.
- **Modificaria:** tornaria explícito o contrato de dimensões fixas e válidas; definiria uma convenção única para centro/canto dos corpos; daria aos testes verificação de assinaturas; documentaria as regras de empate e consumo. Protegeria a configuração de tick contra valores inválidos.
- **Simplificaria/removeria:** repetição de inicialização das três criaturas e documentação que ainda descreve o estado anterior; manteria a centralização das dimensões já corrigida.
- **Preservaria:** separação Simulation/Renderer/Loop e estruturas simples até medições justificarem mudanças. Não implementaria etapas biológicas futuras enquanto contratos geométricos, temporais e de cópia de estado não estiverem bem protegidos.

Essas sugestões não foram implementadas nesta rodada.
