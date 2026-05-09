## 1. Modificar ModelRankingService

- [x] 1.1 Mover filtro `EXCLUDED_SLUG_PREFIXES` de línea 144-149 a después del cálculo de scores (después de línea 163)
- [x] 1.2 Cambiar validación de array vacío para verificar después del filtro post-scoring
- [x] 1.3 Mantener validación de score > 0 contra ranking original

## 2. Actualizar Tests

- [x] 2.1 Verificar que el test existente de prefijos excluidos sigue pasando
- [x] 2.2 Actualizar expectativas de tests para reflejar nuevo comportamiento (scores relativos vs re-escalar)
- [x] 2.3 Tests existentes ya cubren el comportamiento con exclusiones

## 3. Verificación

- [x] 3.1 Ejecutar `npm run check` para validar lint y typecheck
- [x] 3.2 Ejecutar `npm test` para verificar que los tests pasan
