# Migração para múltiplas populações fundadoras

## Alterações

`SimulationConfiguration` agora exige `founders: FounderPopulation[]` e aceita `seed` opcional. Cada fundador contém `amount` e uma `OrganismConfiguration`. A validação percorre todos os fundadores, preservando os limites físicos, energéticos e genéticos existentes e o intervalo de seed do Park-Miller.

`createFounderPopulations()` itera na ordem recebida e reutiliza a mesma instância de `Random` ao chamar `createInitialPopulation()` para cada grupo. `createUniverse()` passou a usar essa função. O dashboard recebeu apenas a adaptação mínima para continuar criando um único grupo fundador com a configuração visual existente; nenhuma interface para múltiplas populações foi adicionada.

## Testes

Foram adicionados testes para quantidade total, ordem e configuração independente de cada população, determinismo com seed igual, validações inválidas e população vazia. Os testes de reprodução que ainda refletiam o limite de distância atualmente implementado foram atualizados para documentar esse comportamento existente; nenhuma regra de reprodução foi modificada.

## Resultado

- Suíte completa: **184 testes passando, 0 falhas**.
- TypeScript typecheck: aprovado.
- Build Vite: aprovado.
- `git diff --check`: sem erros; apenas avisos normais de conversão LF/CRLF.

## Riscos e pontos ambíguos

A ordem do array de fundadores determina a ordem de consumo do RNG e dos indivíduos, portanto deve ser preservada para replays. O dashboard ainda representa apenas um fundador por escolha de escopo; a API interna já suporta vários. Não foram implementados lineage, espécies, genealogia ou novas regras evolutivas.
