🚀 О проекте

Это простой backend на Express.js, который включает:

Регистрацию и авторизацию пользователей (JWT)

Загрузку аватаров через multer

CRUD операции профиля

Проверку роли admin

PostgreSQL как база данных

Хранение аватаров локально в папке /upload

📁 Структура проекта
/
├── server.js
├── db.js
├── upload/         # сюда сохраняются аватарки
├── public/         # статика (HTML/CSS/JS)
└── package.json

📥 Установка
1. Клонировать проект
git clone <repo-url>
cd <project-folder>

2. Установить зависимости
npm install

3. Создать базу данных PostgreSQL
CREATE DATABASE bookforpeople;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

⚙️ Конфигурация PostgreSQL — db.js
const {Pool} = require("pg");

const pool = new Pool({
    user: "postgres",
    password: "1234",
    host: "localhost",
    port: 5432,
    database: "bookforpeople"
});

module.exports = pool;

🧠 Запуск сервера
node server.js


Сервер запустится:

Server working, http://localhost:5588

🔐 Маршруты API
1️⃣ Регистрация

POST /api/auth/register

Body (JSON)
{
  "username": "dias",
  "email": "dias@test.com",
  "password": "123456"
}

2️⃣ Логин

POST /api/auth/login

Body
{
  "email": "dias@test.com",
  "password": "123456"
}


Ответ:

{
  "token": "JWT_TOKEN_HERE"
}

🛡 Как использовать токен в Postman

В Headers:

KEY	VALUE
Authorization	Bearer ТВОЙ_ТОКЕН
👤 3️⃣ Получение профиля

GET /api/profile

Headers:

Authorization: Bearer <token>

✏️ 4️⃣ Обновление данных профиля

PUT /api/profile

Body:

{
  "username": "NewName",
  "email": "new@email.com"
}

🖼 5️⃣ Загрузка аватарки

PUT /api/profile/avatar

В Postman:

Body → form-data:

KEY	TYPE	VALUE
avatar	File	выбрать файл

Headers:

Authorization: Bearer <token>

❌ 6️⃣ Удаление профиля

DELETE /api/profile

👑 7️⃣ Маршрут только для админа

GET /api/users

Если роль не admin → 403 Forbidden.

📦 server.js (полный код)
const express = require("express");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(express.json());
app.use("/upload", express.static("upload"));
app.use(express.static("public"));

const JWT_SECRET = "SUPER_SECRET_KEY";

// Хранилище для файлов (multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "upload/"),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// JWT middleware
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "NO TOKEN" });

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}

// Регистрация
app.post("/api/auth/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password)
            return res.status(400).json({ message: "All fields required" });

        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );
        if (existing.rows.length > 0)
            return res.status(400).json({ message: "EMAIL ALREADY IN USE" });

        const hashed = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users(username, email, password)
             VALUES($1, $2, $3)
             RETURNING id, username, email, role, created_at`,
            [username, email, hashed]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Register error", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Логин
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query("SELECT * FROM users WHERE email = $1", [
            email
        ]);

        if (result.rows.length === 0)
            return res.status(400).json({ message: "USER NOT FOUND" });

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid)
            return res.status(400).json({ message: "Wrong password" });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.json({ token });
    } catch (e) {
        console.error("Login error", e);
        res.status(500).json({ message: "Server error" });
    }
});

// Профиль
app.get("/api/profile", authMiddleware, async (req, res) => {
    const userID = req.user.id;

    const result = await pool.query(
        "SELECT username, email, avatar_url FROM users WHERE id = $1",
        [userID]
    );

    res.json(result.rows[0]);
});

// Аватар
app.put("/api/profile/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ message: "File is required" });

    const avatarPath = "/upload/" + req.file.filename;

    const result = await pool.query(
        `UPDATE users SET avatar_url = $1 WHERE id = $2
         RETURNING id, username, email, avatar_url, role`,
        [avatarPath, req.user.id]
    );

    res.json({ message: "Avatar updated", user: result.rows[0] });
});

// Обновление профиля
app.put("/api/profile", authMiddleware, async (req, res) => {
    const { username, email } = req.body;

    const result = await pool.query(
        `UPDATE users SET
         username = COALESCE($1, username),
         email = COALESCE($2, email)
         WHERE id = $3
         RETURNING id, username, email, avatar_url, role, created_at`,
        [username, email, req.user.id]
    );

    res.json({ message: "Profile was updated", user: result.rows[0] });
});

// Удаление профиля
app.delete("/api/profile", authMiddleware, async (req, res) => {
    const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING id, username, email",
        [req.user.id]
    );

    res.json({ message: "Profile deleted", deleted: result.rows[0] });
});

// Миддлвар только для админа
function adminOnly(req, res, next) {
    if (req.user.role !== "admin")
        return res.status(403).json({ message: "Forbidden" });
    next();
}

// Список всех пользователей (admin)
app.get("/api/users", authMiddleware, adminOnly, async (req, res) => {
    const result = await pool.query(
        "SELECT id, username, email, avatar_url, role, created_at FROM users ORDER BY id"
    );
    res.json(result.rows);
});

app.listen(5588, () => {
    console.log("Server working, http://localhost:5588");
});
