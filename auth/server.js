const express = require("express");
const pool = require("./dj");
const app = express()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
app.use(express.static("public"))

app.use(express.json())


app.get("/", (req,res) =>{
    res.json({message: "API работает"})
});
// app.get("/allusers", async(req, res) =>{
//     const result = await pool.query("SELECT * FROM customer")
//     res.json(result.rows)
// })

app.post("/auth/register",async (req, res) =>{
    const {email, password} = req.body

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(`
            INSERT INTO customer (email, password) VALUES ($1, $2) RETURNING id, email
        `, [email, hashed])
    
        res.json(result.rows[0])
})

app.post("/auth/login", async (req, res) => {
    try {
        // 1. Забираем email и password из тела запроса
        const { email, password } = req.body;

        // 2. Проверяем, что данные вообще пришли
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // 3. Ищем пользователя в базе
        const result = await pool.query(
            "SELECT * FROM customer WHERE email = $1",
            [email]
        );

        // 4. Если такого email нет → ошибка
        if (result.rows.length === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        // 5. Достаём пользователя
        const user = result.rows[0];

        // 6. Сравниваем введённый пароль с хешом из БД
        const isValid = await bcrypt.compare(password, user.password);

        // 7. Если пароль неверный → ошибка
        if (!isValid) {
            return res.status(400).json({ message: "Wrong password" });
        }

        // 8. Генерируем токен
        const token = jwt.sign(
            { id: user.id, email: user.email }, // полезная нагрузка
            "SECRET_KEY",                       // секретный ключ (в проде — .env)
            { expiresIn: "1h" }                 // срок жизни токена
        );

        // 9. Отправляем токен клиенту
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
}); 

function authMiddleware(req,res,next){
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(401).json({message: "No token"})
    }
    const token = authHeader.split(" ")[1];

    try{
        const payload = jwt.verify(token, "SECRET_KEY");
        req.user = payload
        next();
    }
    catch(error){
        return res.status(401).json({message: "Invalid token"})
    }
}

app.get("/profile", authMiddleware, (req,res) =>{
    res.json({
        message: "Private data",
        user: req.user
    })
})
app.listen(5000, () =>{
    console.log("Сервер запущен: http://localhost:5000")
})