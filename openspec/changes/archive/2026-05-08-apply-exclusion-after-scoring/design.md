## Context

`ModelRankingService.getRanking()` actualmente:

1. Filtra modelos rankeables
2. Aplica `EXCLUDED_SLUG_PREFIXES` (early-exclude)
3. Calcula maxCoding/maxAgentic
4. Calcula scores
5. Ordena por score

El problema: al filtrar antes, los modelos excluidos no participan en la normalización, alterando los scores relativos.

## Goals / Non-Goals

**Goals:**

- Mover filtro de exclusión después del cálculo de scores
- Mantener scores relativos al ranking original (modelo excluido vs visible)
- Devolver array vacío si todos los modelos resultan excluidos

**Non-Goals:**

- No re-escalar scores al primer modelo visible
- No cambiar la validación de score positivo

## Decisions

1. **Orden de operaciones**: Calcular ranking completo (incluyendo modelos a excluir), luego filtrar para output
   - Alternativa considerada: filtrar después de cada paso intermedio
     -selected: single filter final es más simple y cumple el objetivo

2. **Normalización**: Los modelos excluidos contribuyen a maxCoding/maxAgentic
   - Esto asegura que los scores de modelos visibles reflejen su posición vs todos los modelos

3. **Resultado vacío**: Devolver `[]` en lugar de lanzar error
   - Comportamiento más consistente con filtros opcionales

4. **Validación de score**: Verificar contra primer modelo del ranking original
   - Mantiene la garantía de que existe al menos un modelo rankeable

## Risks / Trade-offs

- [Riesgo] Si el primer modelo visible tiene score bajo (ej: 80 vs 100 del excluido), podría parecer "malo" en UI
  - Mitigación: Este es el comportamiento esperado según decisiones tomadas

- [Trade-off] Los scores en UI no reflejan el máximo del conjunto visible, pero sí el ranking relativo real
