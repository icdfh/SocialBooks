const express = require("express")
const pool = require("./db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const app = express();

app.use(express.json())
app.use(express.static("public"))

const JWT_SECRET = "SUPER_SECRET_KEY"


// ПРОМЕЖУТОЧНЫЙ ОБРАБОТЧИК ДЛЯ JWT
function authMiddleware(req,res,next){
    const authHeader = req.headers.authorization

    if(!authHeader){
        return res.status(401).json({message: "NO TOKEN"})
    }

    const token = authHeader.split(" ")[1]

    try{
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload
        next()
    }
    catch (error){
        return res.status(401).json({message: "Invalid token"})
    }

}

                                // МАРШРУТЫ

// РЕГИСТРАЦИЯ 

app.post("/api/auth/register", async(req,res) => {
    try{
        const {username, email, password} = req.body

        if(!username || !email || !password)
            return res.status(400).json({message: "All fields required"})

        const existing = await pool.query(`
            SELECT id FROM users WHERE email = $1
            `, [email])

            if(existing.rows.length > 0){
                return res.status(400).json({message: "EMAIL ALREADY IN USE"})
            }
        
            const hashed = await bcrypt.hash(password, 10)

            const result = await pool.query(`
                INSERT INTO users(username, email,password)
                VALUES($1,$2,$3)
                RETURNING id,username,email,role,create_at

                `, [username,email,hashed])
            
            res.status(201).json(result.rows[0])
    }
    catch(error){
        console.error("Register error", error)
        res.status(500).json({message:"Server error"})
    }
})

// ЛОГИН

app.post("/api/auth/login", async(req,res)=>{
    try{
        const {email, password} = req.body

        if(!email || !password){
            return res.status(400).json({message: "Email and password required"})
        }
        const result = await pool.query(`
                SELECT * FROM users WHERE email = $1
            
            `, [email])

            if(result.rows.length === 0){
                return res.status(400).json({message: "USER NOT FOUND"})
            }
            const user = result.rows[0]

            const isValid = await bcrypt.compare(password, user.password)

            if(!isValid){
                return res.status(400).json({message: "Wrong password"})
            }

            const token = jwt.sign(
                {id: user.id, email: user.email, role: user.role},
                JWT_SECRET,
                {expiresIn: "2h"}
            )
            res.json({token})
    }
    catch(error){
        console.error("Login error: ", error)
        res.json(500).json({message: "Server error"});
    }
})

// Профиль

app.get("/api/profile", authMiddleware, async(req,res)=>{
    try{
        const userID = req.user.id;

        const result = await pool.query(`
                SELECT username,email,avatar_url FROM users WHERE id = $1
            `, [userID])

        if(result.rows.length === 0){
            return res.status(404).json({message: "User not found"})
        }
        res.json(result.rows[0])
    }
    catch(error){
        console.error("Profile error: ", error)
        res.status(500).json({message: "Server error"})
        
    }

})

app.put("/api/profile", authMiddleware, async(req,res) =>{
        try{
            const userID = req.user.id
            const {username, email} = req.body;
            if(!username && !email){
                return res.status(400).json({message: "Nothing to update"})
            }

            const result = await pool.query(`
                    UPDATE users SET username = COALESCE($1, username),
                    email = COALESCE($2,email) WHERE id = $3 
                    RETURNING id, username, email, avatar_url, role, create_at
                `, [username, email,userID])
            res.json({message: "Profile was updated", 
                      user: result.rows[0]
            })
        
        }
        catch(error){
            console.error("Update profile failed", error)
            res.status(500).json({message: "Server error"})
        }
})





app.listen("5588", () =>{
    console.log("Server working, http://localhost:5588")
})