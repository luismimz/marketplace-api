/**
 * tools/diagnostics/db-check.ts
 * ------------------------------------------------------------
 * Comprobador de entorno y base de datos para desarrollo.
 * - Valida que exista DATABASE_URL en .env
 * - Parsea y muestra sus componentes clave (host/puerto/bd/usuario)
 * - Verifica conectividad TCP al host:port (sin Prisma)
 * - Ejecuta SELECT 1 vía PrismaClient (conexión real)
 * - (Extra) Intenta leer el estado de migraciones de Prisma
 *
 * Uso:
 *   npx ts-node tools/diagnostics/db-check.ts
 *
 * Requisitos:
 *   - .env con DATABASE_URL
 *   - Prisma generado (npx prisma generate) cuando cambie el schema
 */

import 'dotenv/config' // Carga variables de .env automáticamente
import { PrismaClient } from '@prisma/client'
import { Socket } from 'net'
import { spawnSync } from 'child_process'

/** Emojis simples para estado visual */
const OK = '✅'
const FAIL = '❌'
const INFO = 'ℹ️'

/**
 * Imprime y formatea una línea de resultado con estado.
 */
function line(status: string, msg: string) {
  console.log(`${status} ${msg}`)
}

/**
 * Intenta establecer una conexión TCP al host:port indicado.
 * Esto detecta de forma rápida si algo está escuchando en el puerto.
 */
function checkTcp(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket()
    socket.setTimeout(timeoutMs)

    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })

    socket.connect(port, host)
  })
}

/**
 * Comprueba estado de migraciones de Prisma (si está disponible).
 * No es crítico para el check, pero ayuda a diagnosticar.
 */
function prismaMigrateStatus(): { ok: boolean; raw: string } {
  try {
    const result = spawnSync('npx', ['prisma', 'migrate', 'status', '--schema', 'prisma/schema.prisma'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const output = (result.stdout || '') + (result.stderr || '')
    const ok = result.status === 0
    return { ok, raw: output.trim() }
  } catch (e: any) {
    return { ok: false, raw: String(e?.message || e) }
  }
}

async function main() {
  console.log('\n==== Comprobador de Base de Datos (Prisma + Postgres) ====\n')

  // 1) Validar que tengamos DATABASE_URL
  const url = process.env.DATABASE_URL
  if (!url) {
    line(FAIL, 'DATABASE_URL no está definida en .env')
    process.exit(1)
  }
  line(OK, 'DATABASE_URL encontrada en .env')

  // 2) Parsear y mostrar componentes clave
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    line(FAIL, `DATABASE_URL tiene un formato inválido: "${url}"`)
    process.exit(1)
  }

  const host = parsed.hostname
  const port = Number(parsed.port || 5432)
  const db   = parsed.pathname.replace(/^\//, '') || '(sin nombre)'
  const user = decodeURIComponent(parsed.username || '')
  line(INFO, `Host: ${host}  |  Puerto: ${port}  |  BD: ${db}  |  Usuario: ${user || '(vacío)'}`)

  // 3) Probar conectividad TCP al host:port
  const tcpOk = await checkTcp(host, port)
  if (tcpOk) {
    line(OK, `Conectividad TCP a ${host}:${port} verificada`)
  } else {
    line(FAIL, `No hay conectividad TCP a ${host}:${port}. ¿Postgres está encendido y escuchando?`)
    process.exit(1)
  }

  // 4) Probar conexión real con Prisma (SELECT 1)
  const prisma = new PrismaClient()
  try {
    // $queryRaw`SELECT 1` con tagged template, pero usamos string por simplicidad aquí
    await prisma.$queryRawUnsafe('SELECT 1')
    line(OK, 'Conexión real con Prisma OK (SELECT 1)')
  } catch (e: any) {
    line(FAIL, `Prisma no pudo conectar/consultar: ${e?.message || e}`)
    await prisma.$disconnect()
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }

  // 5) (Extra) Estado de migraciones
  const mig = prismaMigrateStatus()
  if (mig.ok) {
    line(OK, 'Estado de migraciones leído correctamente')
  } else {
    line(INFO, 'No se pudo leer el estado de migraciones (no crítico en este check)')
  }
  console.log('\n--- Salida de "prisma migrate status" (informativa) ---')
  console.log(mig.raw || '(sin salida)')
  console.log('\nTodo listo. ✅\n')
}

// Ejecutar
main().catch((e) => {
  line(FAIL, `Error no controlado: ${e?.message || e}`)
  process.exit(1)
})
