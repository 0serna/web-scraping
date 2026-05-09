## ADDED Requirements

### Requirement: Exclusion filter applied after scoring

El filtro de exclusión de slugs SHALL aplicarse después de calcular los scores de ranking.

#### Scenario: Model excluded influences normalization

- **WHEN** se calcula el ranking con un modelo que matchea EXCLUDED_SLUG_PREFIXES
- **THEN** el modelo excluido SHALL contribuir a maxCoding y maxAgentic

#### Scenario: Excluded model not in output

- **WHEN** se devuelve el ranking final
- **THEN** los modelos que matchean EXCLUDED_SLUG_PREFIXES NO SHALL aparecer en el resultado

### Requirement: Scores relative to original ranking

Los scores de los modelos visibles SHALL reflejar su posición relativa contra todos los modelos (incluidos los excluidos).

#### Scenario: First visible vs excluded first

- **WHEN** el modelo #1 del ranking es excluido y el #2 es el primero visible
- **THEN** el modelo #2 SHALL mantener su score relativo (ej: 80 si el excluido tenía 100)

### Requirement: Empty result handling

El servicio SHALL devolver un array vacío cuando todos los modelos resultan excluidos.

#### Scenario: All models excluded

- **WHEN** todos los modelos del ranking matchean EXCLUDED_SLUG_PREFIXES
- **THEN** el servicio SHALL devolver un array vacío (no lanzar error)

### Requirement: Score validation against original ranking

La validación de score positivo SHALL verificar contra el primer modelo del ranking original (incluyendo los excluidos).

#### Scenario: Valid ranking has positive first score

- **WHEN** el ranking se calcula correctamente
- **THEN** el primer modelo del ranking interno SHALL tener internalScore > 0
