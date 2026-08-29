# TrackerGoHome — Plan del Proyecto

Tracker de Pokémon GO y Pokémon HOME: consulta el Pokédex nacional, registra capturas (GO) y registros (HOME), y consulta datos competitivos scrapeados (attackers, PvP, movimientos).

## Stack

Next.js 16 (App Router) · React 19 · Prisma 7 + SQLite (libsql) · Tailwind 4 · shadcn-style UI · Zustand · Vitest

## Fases

### Fase 1 — Fundaciones ✅
- Setup Next.js + Tailwind + shadcn UI (~21 componentes en `src/components/ui/`)
- Schema Prisma completo (`prisma/schema.prisma`): Pokédex, tracker GO/HOME, rankings scrapeados, usuario/config
- Seed del Pokédex Nacional gen 1–9 desde PokéAPI (`npm run db:seed`)

### Fase 2 — Pokédex Nacional ✅
- `/pokedex`: grid paginado, búsqueda fuzzy (Fuse.js), filtros por generación/tipo, diálogo de detalle

### Fase 3 — Mi Pokédex GO ✅
- `/go`: toggle de captura, 10 checks (Shiny/Lucky/Hundo/XXL/XXS/Mega/Gmax/Shadow/Purified/Costume), editor CP/nivel/IVs

### Fase 4 — Mi Pokédex HOME ✅
- `/home`: registro HOME, idiomas (11 códigos), origen por juego (13 juegos con progreso)
- Único módulo con tests (`src/app/home/__tests__/`)

### Fase 5 — Datos externos ✅
Scrapers operativos (scripts npm):
| Fuente | Datos | Script |
|---|---|---|
| PokéAPI | Pokédex base | `db:seed` |
| PvPoke gamemaster | Base stats | `db:populate-base-stats` |
| DittoBase | Best Attackers (19 tipos) | `db:scrape:attackers` |
| PvPoke rankings | PvP Rankings (3 ligas) | `db:scrape:pvp` |
| PvPoke + CPM | Mejores IVs PvP | `db:scrape:pvp-ivs` |
| PvPoke gamemaster | Move Rankings | `db:scrape:moves` |

Páginas: `/attackers`, `/pvp`, `/pvp-ivs`, `/moves`

### Fase 6 — Herramientas ✅
- Dashboard `/` con stats agregados y accesos rápidos
- `/type-chart`: matriz interactiva 18×18
- `/iv-checker`: calculadora client-side de ranking IVs
- `/team-builder`: armado de equipos con análisis de cobertura

### Fase 7 — Perfiles, Settings, Backup y Scraping programado ✅
- **Perfiles con separación de datos**: `userId` en `GoEntry`/`HomeEntry`, CRUD de perfiles (`User`)
- **Settings** `/settings`: gestión de perfiles, frecuencia de scraping, tema, ejecución manual
- **Backup** `/backup`: exportar/importar JSON del tracker (merge/upsert), historial (`BackupLog`)
- **Scraping programado**: cron vía `instrumentation.ts` según frecuencia configurada
- Tests para settings/backup y lógica del scheduler (41 tests, 5 archivos)
- Lint y typecheck limpios (0 errores/0 warnings); build OK; smoke test HTTP 200 en todas las rutas

### Fase 8 — Gráficas de progreso ✅
- Dashboard con sección **Progreso** (recharts): gauges radiales de captura GO y registro HOME
- Barras comparativas por generación (GO vs HOME)
- Distribución de checks GO (Shiny/Lucky/Hundo/XXL/XXS/Mega/Gmax/Shadow/Purified)
- Progreso por juego HOME (registrados vs faltantes, apilado)
- Action `getChartsData` en `src/app/charts/actions.ts` + tests (45 tests, 6 archivos)

### Futuro 💡
- Sincronización multi-dispositivo
- Notificaciones de eventos (Community Days, etc.)

## Convenciones

- Patrón: client components + server actions (`actions.ts` por ruta)
- Acceso a datos: singleton `prisma` de `src/lib/prisma.ts`
- UI en español; componentes shadcn-style en `src/components/ui/`
- Estado global: Zustand persistido en localStorage (`src/stores/app-store.ts`)
- Tests: Vitest con mock de `@/lib/prisma`
