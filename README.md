# Hydration Break Buddy

App de recordatorios de hidratación/pausas, parte del portfolio **Facilest**.

🔗 Producción: [breakbuddy.facilest.com](https://breakbuddy.facilest.com)

## Stack

- **Frontend**: React, deployado en Vercel
- **Backend**: Vercel Serverless Function (catch-all `api/[...path].js` con dynamic import para compatibilidad ESM/CommonJS)
- **Base de datos**: Neon PostgreSQL (producción)
- **Pagos**: Mercado Pago
- **Generación de código**: Bullet (Replit se usa solo como workspace de generación, no como hosting)

## Arquitectura

Este repo consolida todas las rutas de backend en una única Serverless Function debido al límite de 12 funciones del plan Vercel Hobby. Ver `DECISIONES_ARQUITECTURA.md` para el detalle completo de decisiones técnicas y sus razones.

## Estado del proyecto

Para el estado actual, bugs pendientes y accesos, ver `BREAK_BUDDY_ESTADO_ACTUAL.md`.

### Pendientes conocidos
- Bug en Modo Equipo: se intenta insertar un usuario antes de obtener un `team_id` válido (viola constraint de foreign key)
- Migrar webhook y `back_urls` de Mercado Pago de `sipwell.app` → `breakbuddy.facilest.com`

## Variables de entorno

Este proyecto requiere variables de entorno (conexión a Neon, credenciales de Mercado Pago, etc.) que **no** están versionadas en este repo. Configuralas en el dashboard de Vercel.

## Licencia

Propietaria — ver `LICENSE.md`.
