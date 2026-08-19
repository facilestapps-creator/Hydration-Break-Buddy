# Estado de validación técnica — preparación para Vercel

**Fecha:** 2026-04-13
**Propósito:** informar a Claude del estado comprobado de la preparación para desplegar Break Buddy en Vercel. Este documento no confirma que la migración esté lista para producción: deja claro qué se verificó y qué falta.

## Resumen

La estructura inicial de Vercel está presente y el backend pasa su chequeo estático de TypeScript. Aún falta validar el build completo del frontend, las Functions de Vercel durante un deploy real y la experiencia visual en el dominio de prueba. Por lo tanto, **no conviene cambiar todavía el dominio público ni el webhook de Mercado Pago a Vercel**.

## Archivos incorporados para Vercel

Se detectaron como nuevos, todavía sin confirmar en Git:

- `.env.vercel.example`
- `vercel.json`
- `api/_handler.ts`
- `api/analytics.ts` y `api/analytics/[...path].ts`
- `api/breaks.ts`
- `api/config.ts`
- `api/dev.ts` y `api/dev/[...path].ts`
- `api/feedback.ts`
- `api/health.ts`
- `api/payments.ts` y `api/payments/[...path].ts`
- `api/teams.ts` y `api/teams/[...path].ts`
- `api/users.ts` y `api/users/[...path].ts`
- `api/webhooks.ts` y `api/webhooks/[...path].ts`

La intención de esta capa es que Vercel atienda las rutas `/api/*` reutilizando el backend existente de `artifacts/api-server/src/`, sin reemplazar de inmediato el servidor legacy.

## Configuración detectada

El archivo `vercel.json` contiene:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm --filter @workspace/break-buddy build",
  "outputDirectory": "artifacts/break-buddy/dist/public",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

El archivo `.env.vercel.example` lista estas variables, sin valores reales:

- `DATABASE_URL`
- `ALLOWED_ORIGIN`
- `APP_PUBLIC_URL`
- `CANONICAL_URL`
- `BASE_PATH`
- `MP_ACCESS_TOKEN_PROD`
- `MP_WEBHOOK_SECRET`
- `MP_PREAPPROVAL_PLAN_ID_TEAM_PROD`
- `MP_PREAPPROVAL_PLAN_ID_COMPANY_PROD`
- `MP_PUBLIC_KEY`
- `GMAIL_APP_PASSWORD`
- `ADMIN_ANALYTICS_KEY`

**Seguridad:** los valores reales deben configurarse exclusivamente en **Vercel → Project Settings → Environment Variables**. No deben guardarse en Git, Replit, frontend ni mensajes de error/logs.

## Verificaciones realizadas

### Dependencias

Comando ejecutado:

```text
corepack pnpm install --frozen-lockfile --ignore-scripts
```

Resultado relevante:

```text
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 22.6s using pnpm v11.22.0
```

### Chequeo de TypeScript del backend

Comando ejecutado:

```text
corepack pnpm --filter @workspace/api-server typecheck
```

Resultado:

```text
$ tsc -p tsconfig.json --noEmit
```

Finalizó con código `0`: **el backend existente compila sin errores de TypeScript**.

### Consistencia básica del diff

Comando ejecutado:

```text
git diff --check
```

Resultado: código `0`, sin errores de espacios ni marcadores de conflicto en el diff visible.

## Pendiente antes de producción

1. Ejecutar el build completo del frontend:

   ```text
   corepack pnpm --filter @workspace/break-buddy build
   ```

2. Ejecutar, si corresponde, el build global del workspace:

   ```text
   corepack pnpm build
   ```

3. Revisar que las Functions `api/*` sean compatibles con el runtime de Vercel y que resuelvan correctamente los imports del backend compartido durante `vercel build`/deploy.

4. Crear un proyecto de Vercel conectado al repositorio, usando como **Root Directory** la carpeta que contiene `package.json`, `api/` y `vercel.json`.

5. Cargar las variables de entorno de producción en Vercel. Confirmar específicamente que `DATABASE_URL` apunte a la base Neon de producción y que `ALLOWED_ORIGIN`, `APP_PUBLIC_URL` y `CANONICAL_URL` usen el dominio final correcto.

6. Hacer un deploy de preview, sin cambiar el dominio principal. Probar al menos:
   - carga de frontend;
   - rutas públicas necesarias (`/api/health`, configuración);
   - sesión/cookies y CORS desde el dominio preview;
   - rutas autenticadas;
   - creación/consulta de pagos sin exponer secretos;
   - endpoint de webhook con firma válida e inválida.

7. Abrir la preview en navegador y revisar visualmente la app, consola y requests fallidas.

8. Solo tras pasar lo anterior, conectar el dominio de producción y actualizar en Mercado Pago:
   - URL de webhook: `https://DOMINIO/api/webhooks/mercadopago`
   - `back_url`/URLs de retorno de los planes de suscripción.

## Cambio adicional detectado

`pnpm-workspace.yaml` tiene una modificación local no relacionada directamente con Vercel:

```yaml
allowBuilds:
  esbuild: set this to true or false
```

Debe revisarse antes de confirmar: el valor parece un texto literal de configuración pendiente, no una decisión final. No asumir que habilita correctamente el build de `esbuild` hasta verificar la sintaxis/documentación usada por la versión de pnpm del proyecto.

## Estado de Git

Al momento de esta nota, siguen sin confirmar en Git los archivos de Vercel y existe la modificación mencionada en `pnpm-workspace.yaml`.

## Decisión recomendada

Mantener Replit como producción temporal. Usar Vercel primero con un deploy de preview y pruebas focalizadas. No mover DNS ni webhooks de Mercado Pago hasta que el build completo y esas pruebas hayan pasado.
