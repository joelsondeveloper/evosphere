# Revisão técnica do EvoSphere — 02/10/2026

Escopo: todos os arquivos de código em `evosphere-project/src`, configuração TypeScript, scripts, dependências declaradas e documentação. Nenhuma funcionalidade de reprodução, genética, mutação, sensor, comportamento ou UI foi adicionada. A arquitetura foi preservada.

## 1. Problemas encontrados

| Problema | Consequência | Situação |
| --- | --- | --- |
| Sensores dividiam por `maxEnergy = 0` e, com alimento sobreposto, por `visionRange = 0` | `NaN`/`Infinity` chegavam ao cérebro e podiam contaminar movimento | Corrigido para denominadores zero |
| Brain aceitava quantidades diferentes de entradas e pesos | Pesos faltantes produziam `NaN`; pesos extras eram ignorados | Corrigido com erro explícito |
| Arrays de pesos eram guardados por referência | Alteração externa ou uso do mesmo array nos três neurônios afetava outros pesos | Corrigido com cópias |
| Simulação guardava o array de criaturas recebido | Alterações externas da lista afetavam a simulação até a primeira filtragem | Corrigido com cópia superficial |
| Spawn exigia `timer > intervalo` e zerava o timer | Perdia frações de segundo e tentativas em passos longos; frequência dependia do FPS | Corrigido |
| Não havia validação de delta, intervalo e probabilidade de spawn | Tempo negativo alterava energia/movimento ao contrário; parâmetros não finitos contaminavam estado | Corrigido nos pontos descritos abaixo |
| Criatura já com energia zero podia comer antes da filtragem | Possível reanimação de criatura morta | Corrigido |
| `Food(..., 0)` virava alimento de energia 30 | Valor explícito era descartado pelo operador `||` | Corrigido |
| Normalização angular usava laços de subtração | `Infinity` e números finitos enormes podiam travar; custo crescia com o ângulo | Corrigido |
| Direção acumulava indefinidamente | Perda gradual de precisão e normalização cada vez mais cara | Corrigido |
| Distância elevava componentes ao quadrado | Overflow intermediário, mesmo quando a distância final cabia em um número | Reduzido com `Math.hypot` |
| Cada `start()` criava outro ciclo de animação | Atualizações e desenhos duplicados | Corrigido |
| Retorno de aba suspensa passava um delta enorme | Salto de posição, grande desconto de energia e perda de interações | Limitado no loop |
| `randomWeights` aceitava contagens inválidas | Contagem infinita poderia não terminar; fracionária era arredondada implicitamente | Corrigido |

Não encontrei incompatibilidade na configuração inicial: cada sensor fornece quatro entradas, e cada um dos três neurônios recebe quatro pesos. Ângulos são calculados em graus e convertidos para radianos no movimento de forma consistente. O eixo vertical do Canvas é compatível com `atan2` e seno utilizados.

A filtragem existente não pula mortes consecutivas. A remoção imediata do alimento impede que duas criaturas consumam a mesma instância no mesmo passo. Esses comportamentos foram mantidos e testados.

A compilação original já passava; não havia erro de tipagem demonstrado pelo compilador. A configuração, contudo, não ativava `strict`.

## 2. Correções realizadas

- Sensores retornam energia normalizada zero quando não há capacidade positiva; alimento coincidente com alcance zero tem distância normalizada zero. Não foram adicionados sensores.
- Brain copia os arrays recebidos, verifica dimensões e valores finitos e rejeita uma soma `NaN`. A incompatibilidade gera `RangeError`, em vez de produzir uma criatura corrompida silenciosamente.
- Spawn calcula as tentativas completas e preserva o restante do tempo. Cada intervalo continua usando uma tentativa Bernoulli com a probabilidade existente, sem alterar para outro modelo probabilístico.
- `update` rejeita delta negativo/não finito, intervalo não positivo/não finito, probabilidade fora de [0,1] e contagens de tentativas fora da faixa inteira segura. Um passo zero não move, alimenta ou gera alimentos.
- Criaturas sem energia são ignoradas antes de agir e removidas pela filtragem final.
- Ângulos usam resto modular e são mantidos em [-180,180]; entradas angulares não finitas são rejeitadas.
- Defaults numéricos usam `??`; energia zero de alimento é preservada. Pontuação faltante foi ajustada nos trechos modificados.
- `Loop.start()` é idempotente e reutiliza um callback. O delta enviado pelo loop é limitado a 100 ms.
- TypeScript `strict` foi ativado. Foram adicionados testes com o executor nativo do Node e o TypeScript já instalado, sem novas dependências.

**Efeito do limite de 100 ms:** tempo excedente é descartado. A simulação não recupera todo o tempo passado em segundo plano e fica mais lenta que o relógio real abaixo de 10 FPS. É uma proteção para o loop atual, não uma garantia de independência de FPS. Chamadas diretas a `Simulation.update` continuam aceitando passos maiores.

## 3. Problemas deliberadamente não corrigidos

- **Bordas:** alimentos nascem em [0,600) em ambos os eixos, mas criaturas podem sair do mapa. Não há regra definida de paredes, retorno pela borda ou mundo aberto. Escolher uma mudaria a dinâmica.
- **Geometria visual:** a criatura é desenhada como quadrado 20×20 ancorado pelo canto; sensores e alimentação usam esse mesmo ponto como posição. Alimentos são círculos de raio 5. Isso faz a distância visual diferir da distância lógica; elementos podem ficar parcialmente cortados nas bordas. Centralizar ou mudar colisões exige definir a convenção espacial.
- **Dependência de FPS:** alimentação permite no máximo um alimento por atualização; em passos maiores, a criatura pode atravessar a região de alcance sem comer. Rotação seguida de deslocamento é uma integração discreta cuja trajetória muda com o passo. Não implementei passo fixo, colisão contínua ou cooldown.
- **Ordem das atualizações:** criaturas anteriores na lista têm prioridade pelo mesmo alimento; as seguintes já percebem o mundo alterado. Alterar a resolução dessa disputa muda a seleção futura.
- **Regras de energia:** alimentação acontece antes do metabolismo; custo de movimento depende da saída neural, não da distância real ou da velocidade; virar não tem custo separado. A criatura pode comer mesmo sem ver o alimento, se estiver dentro do alcance de alimentação. São escolhas do modelo, não erros inequívocos.
- **Validação total das entidades:** atributos públicos ainda aceitam valores negativos, não finitos ou extremamente grandes via chamadas externas. Por exemplo, velocidade infinita pode contaminar posição; alimento com energia `NaN` pode contaminar energia; capacidade minúscula pode causar overflow na normalização. As verificações novas não constituem uma fronteira completa de validação. Definir todos os domínios aceitos é trabalho separado.
- **Referências de entidades:** copiar o array não clona criaturas. Compartilhar deliberadamente a mesma criatura ou instância de Brain continua compartilhando estado; referências a arrays antigos ficam obsoletas após `filter`. Não alterei identidade nem encapsulamento das entidades.
- **Crescimento e custo:** a busca sensorial e a busca para comer percorrem alimentos, com custo da ordem de criaturas × alimentos por passo, além de arrays temporários e filtragens. Alimentos continuam surgindo mesmo após extinção, sem limite ou expiração. Passos diretos enormes ou intervalos extremamente pequenos ainda podem demandar muitas tentativas, mesmo dentro da faixa numérica segura. Não introduzi limites ecológicos nem estruturas espaciais.
- **Manutenção:** dimensão 600 repetida em renderização/spawn, três blocos quase iguais de inicialização, construtor de criatura com muitos argumentos posicionais e número de entradas repetido como `4`. São pequenos hoje; não justificam uma reestruturação nesta revisão.
- **Documentação:** README descreve a visão futura e tem checklist desatualizado, inclusive capacidades ainda ausentes. Não reescrevi a apresentação do projeto.

## 4. Estado dos testes e execução

Antes: sem script de testes e sem suíte própria encontrada; `npm run build` passou.

Depois: **23 testes passaram, zero falhas**, com `npm test` dentro de `evosphere-project`. `npm run build` passou com `strict`; `git diff --check` passou.

Cobertura: contrato sensor/Brain; divisões por zero; alcance de visão; busca vazia; dados inválidos; independência dos arrays; energia zero; ângulos enormes; overflow intermediário de distância; contagem de pesos; intervalos e resto do spawn; probabilidades inválidas; delta zero/negativo/não finito; mortes consecutivas; disputa por alimento; limite energético; movimento retilíneo e metabolismo a 30/60/120 FPS; direção normalizada; início duplicado do loop; retorno de aba suspensa.

O teste de aplicação importa `main.ts`, anexa o Canvas a um DOM mínimo simulado e executa 120 atualizações/desenhos. Ele verifica integração de inicialização, mas não equivale a inspeção visual num navegador.

Vite foi iniciado localmente; a página e o módulo inicial responderam HTTP 200. A ferramenta de navegador encerrou antes de abrir a página, impossibilitando a validação visual real. O servidor de verificação foi encerrado ao final.

Limites: não há teste estatístico de longo prazo do spawn, benchmark de população grande, teste visual real, nem garantia de equivalência de trajetórias e alimentação entre FPS diferentes. Comparação de FPS da suíte cobre apenas movimento retilíneo com saídas constantes e metabolismo.

## 5. Riscos antes de reprodução e evolução

1. FPS e ordem de atualização podem virar vantagens seletivas artificiais.
2. Cópia rasa de criaturas ou compartilhamento do mesmo Brain entre pais e filhos pode acoplar indivíduos; os arrays agora são copiados apenas ao construir um novo Brain.
3. Sem semente reproduzível, será difícil distinguir efeito de uma mudança de código de variação aleatória.
4. Sem regras de bordas e geometria, sobrevivência fora da tela e alcance visual inconsistente podem confundir experimentos.
5. Domínios inválidos de energia, velocidade e demais atributos precisam ser impedidos antes de qualquer geração automática de parâmetros.
6. Quantidade e ordem dos sensores precisam fazer parte de um contrato estável com os pesos; igualdade de comprimento não detecta troca da ordem semântica das entradas.
7. Crescimento de população e alimento multiplicará o custo das buscas e alocações. Medir antes de otimizar.
8. O sistema ainda precisa de critérios explícitos para balanço energético e resolução de interações; os testes atuais não demonstram equilíbrio ecológico.

## 6. O que eu modificaria com escopo ampliado

Minha prioridade seria adotar um passo fixo de simulação e definir o tratamento de pausas; em seguida, estabelecer bordas, posição geométrica e regras temporais de alimentação. Depois, adicionaria aleatoriedade com semente e cenários repetíveis para comparar mudanças.

Na manutenção, centralizaria dimensões e constantes, usaria um objeto de configuração no construtor de criatura e um contrato tipado para as quatro entradas e três saídas do Brain. Definiria validação dos parâmetros e uma operação explícita de cópia independente do cérebro antes de implementar herança.

Somente após medir populações maiores consideraria busca espacial e redução de alocações. Não vejo justificativa atual para ECS, workers, WebGL ou uma reorganização grande das classes. Nenhuma dessas propostas foi implementada nesta revisão.
