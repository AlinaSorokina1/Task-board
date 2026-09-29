# Observability Local MVP

Локальный стенд состоит из двух независимых контуров:

- `sentry/` - self-host Sentry для ошибок и инцидентов.
- `grafana-loki/` - Grafana + Loki + Alloy (Faro collector) для логов, web-vitals и event dashboards.

## Быстрый старт (15-30 минут)

1. Скопируйте переменные:
   - `copy .env.observability.example .env.local`
2. Поднимите Grafana + Loki:
   - `npm run obs:grafana-up`
3. Поднимите Sentry по инструкции:
   - `observability-local/sentry/README.md`
4. Запустите фронт:
   - `npm run server`
   - `npm run dev`

## URLs

- Grafana: `http://localhost:3000` (`admin/admin` по умолчанию)
- Loki API health: `http://localhost:3100/ready`
- Alloy UI: `http://localhost:12345`
- Faro collect endpoint: `http://localhost:12347/collect`
- Sentry UI: `http://localhost:9000`

## Проверка E2E

1. Откройте приложение в браузере.
2. Нажмите `Test runtime error`:
   - событие должно появиться в Sentry с `environment=local`, `release=local-dev`.
3. Нажмите `Test log event` и подвигайте задачи по колонкам:
   - события `action_submitted` и `action_failed` должны появиться в Loki.
4. Для web-vitals (через Faro) откройте Grafana -> Explore:
   - `{source="faro"} | json`
5. В Grafana -> Explore запрос:
   - `{environment="local"} | json`
6. Для корреляции сравните `trace_id`:
   - поле `trace_id` в Sentry event tags и Loki log payload должно совпадать.

## Базовые дашборды

Провиженятся автоматически при старте Grafana:

- `FrontendHealth`
- `FrontendPerformance`
- `UserFlow`

## Операционные команды

- Up: `npm run obs:grafana-up`
- Down: `npm run obs:grafana-down`
- Logs: `npm run obs:grafana-logs`
- Reset: `npm run obs:grafana-reset`
- Healthcheck: `curl http://localhost:3100/ready`

## Privacy и лимиты

- PII отключен (`sendDefaultPii: false`, фильтрация email/ip в Sentry `beforeSend`).
- Логи в Loki отправляются только при наличии `VITE_LOKI_PUSH_URL`.
- Web Vitals собираются через Grafana Faro `getWebInstrumentations()` и отправляются в Loki через локальный Alloy collector.
- Для локального стенда используйте ограниченный поток тестовых событий.

## Troubleshooting checklist

- Контейнеры не поднялись: проверьте `docker compose ps` и `docker compose logs`.
- DSN недоступен: перепроверьте project DSN в `.env.local`.
- Loki datasource не виден: откройте Grafana -> Connections, должен быть `Loki`.
- Faro/web-vitals не приходят: проверьте `VITE_FARO_URL=http://localhost:12347/collect` и контейнер `local-alloy`.
