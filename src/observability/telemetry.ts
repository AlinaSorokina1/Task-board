import * as Sentry from '@sentry/react'
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk'

type LogLevel = 'info' | 'warn' | 'error'

interface TelemetryContext extends Record<string, string> {
  environment: string
  release: string
  feature: string
  trace_id: string
  session_id: string
}

interface LokiLabelPayload extends TelemetryContext {
  level: LogLevel
  event: string
}

interface LokiEnv extends ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_SENTRY_RELEASE?: string
  readonly VITE_OBS_FEATURE?: string
  readonly VITE_LOKI_PUSH_URL?: string
  readonly VITE_FARO_URL?: string
}

const env = import.meta.env as LokiEnv
const environment = env.VITE_SENTRY_ENVIRONMENT ?? 'local'
const release = env.VITE_SENTRY_RELEASE ?? 'local-dev'
const feature = env.VITE_OBS_FEATURE ?? 'task-board'
const faroUrl = env.VITE_FARO_URL ?? 'http://localhost:12347/collect'
const sessionId = crypto.randomUUID()
let traceId = crypto.randomUUID()
let faroInstance: ReturnType<typeof initializeFaro> | null = null

/**
 * Возвращает единый контекст телеметрии для текущей сессии и трассировки.
 * Этот набор тегов используется во всех каналах (Sentry/Faro/Loki),
 * чтобы одно действие можно было связать между системами наблюдаемости.
 */
function getBaseContext(): TelemetryContext {
  // Единый контекст для корреляции одного события в разных системах.
  return {
    environment,
    release,
    feature,
    trace_id: traceId,
    session_id: sessionId,
  }
}

/**
 * Приводит произвольные данные события к строковым атрибутам.
 * Нужно для интеграций, где значения ожидаются строками (например Faro).
 */
function normalizeEventAttributes(data?: Record<string, unknown>): Record<string, string> {
  if (!data) return {}

  return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value == null) return acc
    acc[key] = typeof value === 'string' ? value : JSON.stringify(value)
    return acc
  }, {})
}

/**
 * Формирует payload в формате Loki `/loki/api/v1/push`.
 * В labels кладём стабильный контекст, а в values — JSON с деталями события.
 */
function buildLokiPayload(event: string, level: LogLevel, data?: Record<string, unknown>) {
  const labels: LokiLabelPayload = {
    ...getBaseContext(),
    level,
    event,
  }

  return {
    streams: [
      {
        stream: labels,
        values: [[`${Date.now()}000000`, JSON.stringify({ ...labels, ...data })]],
      },
    ],
  }
}

/**
 * Пытается отправить фронтовое событие в Loki.
 * Если URL не задан или отправка не удалась, приложение не падает:
 * ошибка логируется в консоль как предупреждение.
 */
async function pushToLoki(event: string, level: LogLevel, data?: Record<string, unknown>) {
  // Отправка в Loki опциональна для локальной/дев-среды.
  if (!env.VITE_LOKI_PUSH_URL) return

  try {
    await fetch(env.VITE_LOKI_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildLokiPayload(event, level, data)),
      keepalive: true,
    })
  } catch (error) {
    console.warn('Loki push failed', error)
  }
}

/**
 * Начинает новую логическую трассу пользователя.
 * Полезно вызывать на границе сценариев (например, новый workflow/действие),
 * чтобы события в Sentry группировались по новому `trace_id`.
 */
export function startNewTrace() {
  // Обновляем trace_id для нового пользовательского сценария и синхронизируем теги Sentry.
  traceId = crypto.randomUUID()
  const nextContext = getBaseContext()
  Sentry.setTags(nextContext)
}

/**
 * Возвращает текущий базовый контекст телеметрии.
 * Можно использовать в UI/бизнес-коде для отладки и передачи в кастомные логи.
 */
export function getTelemetryContext() {
  return getBaseContext()
}

/**
 * Инициализирует каналы наблюдаемости приложения.
 * - Sentry: ошибки, сообщения, breadcrumbs, трассировки.
 * - Faro: фронтовые события и web-vitals для Grafana-стека.
 *
 * Вызывается один раз на старте приложения.
 */
export function initObservability() {
  const dsn = env.VITE_SENTRY_DSN

  if (dsn) {
    // Инициализируем Sentry только если задан DSN.
    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate: 1.0,
      sendDefaultPii: false,
      beforeSend(event) {
        // Дополнительно удаляем PII перед отправкой в backend.
        if (event.user?.email) delete event.user.email
        if (event.user?.ip_address) delete event.user.ip_address
        return event
      },
    })
  }

  // Базовые теги добавляются ко всем следующим событиям Sentry.
  Sentry.setTags(getBaseContext())

  // Faro собирает события фронта/web-vitals и отправляет их в пайплайн Grafana.
  faroInstance = initializeFaro({
    url: faroUrl,
    app: { name: 'taskboard-frontend', version: release, environment },
    instrumentations: [...getWebInstrumentations()],
  })
}

/**
 * Унифицированная запись события фронта во все доступные бекенды:
 * - Faro (структурированное событие),
 * - Sentry breadcrumb (контекст для следующих ошибок),
 * - Sentry message при уровне `error`,
 * - Loki (если настроен push URL).
 */
export async function logFrontendEvent(
  event: string,
  level: LogLevel = 'info',
  data?: Record<string, unknown>,
) {
  const baseContext = getBaseContext()
  const payload = {
    ...baseContext,
    ...data,
  }

  // Структурированное событие для Faro (там предпочтительны строковые атрибуты).
  faroInstance?.api.pushEvent(event, {
    ...baseContext,
    ...normalizeEventAttributes(data),
  })

  // Breadcrumb добавляет контекст действия пользователя к последующим ошибкам в Sentry.
  Sentry.addBreadcrumb({
    category: 'frontend.log',
    level: level === 'warn' ? 'warning' : level,
    message: event,
    data: payload,
  })

  if (level === 'error') {
    // Логи уровня error также отправляем как отдельные message-события в Sentry.
    Sentry.captureMessage(event, {
      level: 'error',
      tags: baseContext,
      extra: payload,
    })
  }

  await pushToLoki(event, level, payload)
}

/**
 * Отправляет исключение в Sentry и дублирует факт ошибки как доменное событие.
 * Это позволяет одновременно:
 * - видеть stack trace в Sentry,
 * - коррелировать ошибку в логах/метриках по тем же тегам контекста.
 */
export async function captureFrontendException(error: unknown, featureName?: string) {
  const context = {
    ...getBaseContext(),
    feature: featureName ?? feature,
  }

  // Основной сигнал об исключении для Sentry.
  Sentry.captureException(error, {
    tags: context,
  })

  // Дублируем как доменное событие для корреляции в логах/метриках.
  await logFrontendEvent('action_failed', 'error', {
    error_message: error instanceof Error ? error.message : 'unknown_error',
    ...context,
  })
}
