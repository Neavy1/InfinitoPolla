# Polla Infinito 2026

Repositorio: [github.com/Neavy1/InfinitoPolla](https://github.com/Neavy1/InfinitoPolla)

Polla mundialista full-stack para el Mundial 2026 (48 equipos, 12 grupos). Los usuarios pronostican clasificados, mejores terceros, llave eliminatoria y posiciones finales. Los pronósticos se bloquean **1 minuto antes** del primer partido de cada fase (validado en el servidor).

## Stack

| Capa | Tecnología | Despliegue |
|------|-----------|------------|
| Frontend | React + Vite + TailwindCSS | **Netlify** |
| Backend | Node + Express + Prisma | **Render** |
| Base de datos | PostgreSQL | **Render** |
| Seguridad | Cloudflare Turnstile, JWT, Argon2 | **Cloudflare** |

## Colores (logo Tiendas Infinito)

- Azul marino: `#1E2273`
- Naranja: `#F58220`
- Verde: `#8DC63F`

## Desarrollo local

### Requisitos

- Node.js 20+
- PostgreSQL 14+

### Configuración

```bash
cp .env.example .env
# Editar DATABASE_URL, JWT_SECRET, etc.
npm install
```

### Base de datos

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
```

### Ejecutar

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001/api/health
- Admin por defecto: `admin` / valor de `ADMIN_PASSWORD` en `.env`

## Despliegue

### 1. Render (Backend + PostgreSQL)

1. Crear base de datos PostgreSQL en Render.
2. Crear Web Service conectado al repo, usando `backend/render.yaml` o:
   - **Build**: `npm install && npm run build -w backend && npm run db:migrate -w backend`
   - **Start**: `npm run start -w backend`
3. Variables de entorno:
   - `DATABASE_URL` (desde la BD)
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `CORS_ORIGIN` = URL de Netlify
   - `TURNSTILE_SECRET_KEY`
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`
4. Tras el primer deploy, ejecutar seed: `npm run db:seed -w backend`

### 2. Netlify (Frontend)

1. Conectar repo, directorio base: `frontend`
2. Build: `npm run build`
3. Publish: `dist`
4. Variables:
   - `VITE_API_URL` = `https://tu-api.onrender.com/api`
   - `VITE_TURNSTILE_SITE_KEY`

### 3. Cloudflare

1. Apuntar DNS del dominio a Netlify (frontend) y subdominio `api` a Render.
2. Activar proxy CDN.
3. Crear widget Turnstile en Cloudflare Dashboard → Turnstile.
4. (Opcional) Rate limiting / WAF.

## Reglas de puntaje

| Categoría | Puntos |
|-----------|--------|
| Grupos - orden correcto (1ro + 2do) | 3 |
| Grupos - equipos correctos en desorden | 2 |
| Mejores terceros (cada acierto) | 2 |
| Dieciseisavos / Octavos / Cuartos - orden | 3 |
| Dieciseisavos / Octavos / Cuartos - desorden | 2 |
| Campeón | 10 |
| Subcampeón | 5 |
| Tercer puesto | 3 |
| Cuarto puesto | 3 |

Configurable desde el panel admin (`ScoringConfig`).

## Ranking

- Todos los usuarios registrados aparecen en la tabla de posiciones.
- El **líder actual** se muestra en el dashboard, landing y podio (top 3).
- El ranking se **recalcula automáticamente** cuando el admin carga resultados o posiciones de grupos.
- Al **terminar cada fase** (todos los partidos finalizados + tablas de grupos cuando aplica), el sistema registra la fase y actualiza puntajes.
- La página de ranking se refresca cada 60 segundos y muestra qué fases ya fueron procesadas.

## Anti-trampa

- Cada pronóstico (grupos, llave por fase, posiciones finales) se **envía una sola vez** y queda bloqueado permanentemente.
- `PredictionLock` registra cuándo cada usuario envió su pronóstico.
- `PredictionAudit` registra todos los cambios.

## Resultados en vivo (API-Football)

Al consultar `/api/catalog/matches/live`, el sistema consulta [API-Football](https://www.api-football.com/) (si `API_FOOTBALL_KEY` está configurada), sincroniza marcadores y los muestra en la página de grupos.

Variables en `.env`:
```
API_FOOTBALL_KEY=tu_key
API_FOOTBALL_LEAGUE_ID=1
API_FOOTBALL_SEASON=2026
```

Sin API key, se muestran los resultados cargados en la base de datos (admin o seed).

## Formato FIFA 2026

- 12 grupos → 24 clasificados + 8 mejores terceros = 32
- Tabla de terceros: puntos → diferencia de gol → goles a favor → fair play
- R32: 1ros de A,B,D,E,I,G,K,L vs terceros; 1ros de C,F,H,J vs segundos; 4 cruces entre segundos

## Estructura

```
├── frontend/          # React SPA (Netlify)
├── backend/
│   ├── prisma/        # Schema, migraciones, seed
│   └── src/           # API Express
├── package.json       # Monorepo workspaces
└── .env.example
```
