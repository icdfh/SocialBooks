1️⃣ Установить Node.js

Скачать:
https://nodejs.org/

Проверить:

node -v
npm -v

2️⃣ Скачать зависимости

В папке проекта выполнить:

npm install


Пакеты установятся автоматически из package.json.

3️⃣ Настройка PostgreSQL
3.1. Создать базу данных

Открыть pgAdmin или терминал PostgreSQL и выполнить:

CREATE DATABASE bookforpeople;

3.2. Создать таблицу users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

4️⃣ Настроить подключение к базе (db.js)

Проверить, чтобы файл выглядел так:

const {Pool} = require("pg")

const pool = new Pool({
    user: "postgres",
    password: "1234",
    host: "localhost",
    port: 5432,
    database: "bookforpeople"
})

module.exports = pool


Если твой пароль PostgreSQL другой — поменяй "1234" на свой.

5️⃣ Создать папки upload/ и public/

Backend сохраняет файлы в /upload.

Создать две папки:

mkdir upload
mkdir public

6️⃣ Запустить сервер

Выполнить:

node server.js


Если всё ок — появится:

Server working, http://localhost:5588

7️⃣ Проверка API через Postman
🔐 ВАЖНО

Для всех защищённых маршрутов нужно добавлять заголовок:

Authorization: Bearer <токен>

7.1 — Регистрация

POST

http://localhost:5588/api/auth/register

Body → raw → JSON:
{
  "username": "test",
  "email": "test@mail.com",
  "password": "123456"
}

7.2 — Логин

POST

http://localhost:5588/api/auth/login


Body:

{
  "email": "test@mail.com",
  "password": "123456"
}


Ответ:

{
  "token": "..."
}


Скопировать токен!

7.3 — Получить профиль

GET

http://localhost:5588/api/profile


Headers:

KEY	VALUE
Authorization	Bearer ТВОЙ_ТОКЕН
7.4 — Обновить профиль

PUT

http://localhost:5588/api/profile


Body:

{
  "username": "NewName"
}

7.5 — Загрузить аватарку

PUT

http://localhost:5588/api/profile/avatar


Body → form-data:

KEY	TYPE	VALUE
avatar	File	выбрать файл
7.6 — Удалить профиль

DELETE

http://localhost:5588/api/profile

7.7 — Список пользователей (admin)

GET

http://localhost:5588/api/users


(работает только если user.role = "admin")

8️⃣ Частые ошибки и как исправить
Ошибка	Причина	Решение
NO TOKEN	не передан токен	Добавить заголовок Authorization
Invalid token	токен протух или неверный	Перелогиниться
EMAIL ALREADY IN USE	email уже зарегистрирован	Использовать новый email
User not found	такой email отсутствует	Зарегистрироваться
multer error	папки upload нет	Создать папку upload
ECONNREFUSED 5432	PostgreSQL не запущен	Запустить PostgreSQL через pgAdmin/службы
9️⃣ Запуск без node (hot reload)

Можно установить nodemon:

npm install -g nodemon


Запуск:

nodemon server.js
