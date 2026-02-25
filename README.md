# Todo Board

Kanban-доска на React + Vite с авторизацией и серверным хранением данных.

## Запуск в разработке

1. `npm install`
2. В одном терминале: `npm run server`
3. Во втором терминале: `npm run dev`
4. Открой `http://127.0.0.1:5173`

По умолчанию сервер хранит данные в `server/data/db.json`.

## Режим MySQL

Сервер поддерживает хранение в MySQL через переменную `MYSQL_URL`.

1. Установи драйвер: `npm install mysql2`
2. Создай базу в MySQL (например `todo_board`).
3. Запусти сервер:

```powershell
$env:DB_PROVIDER = "mysql"
$env:MYSQL_URL = "mysql://USER:PASSWORD@127.0.0.1:3306/todo_board"
npm run server
```

При первом запуске в MySQL-режиме сервер создаст таблицы:
`users`, `sessions`, `cards`, `board_columns`, `history_entries`.
Если рядом есть `server/data/db.json`, данные автоматически импортируются в эти таблицы.

## Docker (MySQL + Server + Adminer)

1. Скопируй переменные:

```powershell
Copy-Item .env.docker.example .env
```

2. Запусти контейнеры:

```powershell
docker compose up -d --build
```

3. Проверь API:

```powershell
curl.exe http://127.0.0.1:8787/api/health
```

4. Открой Adminer: `http://127.0.0.1:8080`

Параметры входа в Adminer:
- System: `MySQL`
- Server: `mysql`
- Username: `${MYSQL_USER}`
- Password: `${MYSQL_PASSWORD}`
- Database: `${MYSQL_DATABASE}`

5. Логи:

```powershell
docker compose logs -f app
```

6. Остановка:

```powershell
docker compose down
```

Данные MySQL сохраняются в volume `mysql_data`.

## Продакшн

1. `npm run build`
2. `npm run server`

Сервер также раздает содержимое `dist/`.
