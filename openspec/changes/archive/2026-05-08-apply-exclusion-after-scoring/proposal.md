## Why

El filtro `EXCLUDED_SLUG_PREFIXES` en `ModelRankingService` se aplica antes de calcular los scores de ranking. Esto significa que los modelos excluidos no influyen en la normalización, alterando el ranking relativo de los modelos visibles respecto al original.

## What Changes

- Mover el filtro `EXCLUDED_SLUG_PREFIXES` para ejecutarse **después** del cálculo de scores
- El modelo excluido influirá en `maxCoding` y `maxAgentic` para normalización
- El ranking interno se calcula con todos los modelos, luego se filtran los excluidos del resultado
- Devolver array vacío si todos los modelos resultan excluidos (no lanzar error)
- Mantener validación de score positivo contra el primer modelo del ranking original

## Capabilities

### New Capabilities

- `ranking-exclusion-post-scoring`: Filtro de exclusión aplicado después del cálculo de scores para respetar el ranking original

### Modified Capabilities

- `model-ranking`: Modificar el orden de aplicación del filtro de exclusión

## Impact

- `src/domains/ai/services/model-ranking-service.ts`: Reordenar lógica de filtering
- Tests en `model-ranking-service.test.ts`: Actualizar expectativas de comportamiento
