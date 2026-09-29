# Local Sentry (self-host)

Этот проект использует официальный self-host пакет Sentry (`getsentry/self-hosted`) как отдельный контур.

## 1) Подготовка

- Docker Desktop + Compose v2.
- Порты `9000`, `5432`, `6379` и портовый диапазон Kafka должны быть свободны.

## 2) Bootstrap

```powershell
cd observability-local/sentry
git clone https://github.com/getsentry/self-hosted.git
cd self-hosted
.\install.ps1
docker compose up -d
```

Если `install.ps1` отсутствует, выполните bootstrap через WSL:

```bash
./install.sh
docker compose up -d
```

## 3) Первичная настройка

- Открыть `http://localhost:9000`.
- Создать `Organization` и `Project` (Frontend).
- Взять DSN и добавить в `.env.local`:

```dotenv
VITE_SENTRY_DSN=<dsn_from_sentry_project>
VITE_SENTRY_ENVIRONMENT=local
VITE_SENTRY_RELEASE=local-dev
```

## 4) Эксплуатация

- `docker compose up -d` — запуск.
- `docker compose down` — остановка.
- `docker compose logs -f web worker` — диагностика.
- `docker compose down -v` — полный reset.
