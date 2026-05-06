# HubSpot Reports — Distriflash

Dashboard visual de reportes CRM construido con React + Vite, conectado a tu cuenta de HubSpot.

## Qué muestra

- **KPIs**: total deals, valor total del pipeline, contactos creados, deals cerrados
- **Pipeline por etapa**: barras con el valor y cantidad de deals por etapa
- **Fuentes de contactos**: torta con la distribución por fuente
- **Pipeline por propietario**: tarjetas individuales con barras de progreso por etapa
- **Últimos deals**: tabla con nombre, propietario, etapa, valor y fecha

Rango de fechas configurable: últimos 30 días, 90 días, mes actual, trimestre, año.

---

## Requisitos

- **Node.js** 18 o superior
- **Token de HubSpot Private App** con los siguientes scopes:
  - `crm.objects.deals.read`
  - `crm.objects.contacts.read`
  - `crm.objects.owners.read`

### Crear el token en HubSpot

1. Ir a **Settings → Integrations → Private Apps**
2. Crear una nueva app o editar la existente
3. En la pestaña **Scopes**, activar los tres scopes listados arriba
4. Copiar el token (`pat-na1-...`)

---

## Instalación local

```bash
# Clonar el repo
git clone https://github.com/lucasdi24/report-hubspot-distriflash.git
cd report-hubspot-distriflash

# Instalar dependencias
npm install

# Crear el archivo de entorno local (NO se sube a git)
echo "VITE_HUBSPOT_TOKEN=pat-na1-TU_TOKEN_AQUI" > .env.local

# Levantar el servidor de desarrollo
npm run dev
```

La app queda disponible en **http://localhost:5173** (o el próximo puerto libre).

El proxy de Vite redirige automáticamente las llamadas de `/api/hs/*` a `https://api.hubapi.com/*`, evitando el error de CORS en desarrollo.

---

## Estructura del proyecto

```
├── api/
│   └── hs/
│       └── [...slug].js      # Serverless function de Vercel (proxy a HubSpot)
├── src/
│   ├── lib/
│   │   └── hubspot.ts        # Cliente HubSpot (fetch + paginación)
│   ├── pages/
│   │   └── HubSpotReports.tsx # Dashboard principal
│   ├── styles/
│   │   └── index.css
│   └── main.tsx
├── .env.local                 # Token (gitignored, crear manualmente)
├── vercel.json                # Routing: SPA rewrite sin interceptar /api/
├── vite.config.ts             # Dev proxy hacia api.hubapi.com
└── package.json
```

---

## Deploy en Vercel

1. En el dashboard de Vercel, crear un nuevo proyecto conectado al repo de GitHub
2. En **Settings → Environment Variables**, agregar:
   ```
   VITE_HUBSPOT_TOKEN = pat-na1-TU_TOKEN_AQUI
   ```
3. Deploy. Vercel detecta automáticamente el proyecto Vite.

La función serverless en `api/hs/[...slug].js` actúa como proxy en producción, igual que el proxy de Vite en desarrollo.

> **Importante**: el `vercel.json` usa un rewrite con negative lookahead `/((?!api/).*) → /index.html` para que las rutas `/api/hs/*` lleguen a la serverless function y no sean interceptadas por el SPA.

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_HUBSPOT_TOKEN` | Token de HubSpot Private App (`pat-na1-...`) |

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Build de producción (output en `dist/`) |
| `npm run preview` | Preview del build de producción localmente |
