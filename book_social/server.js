const express = require("express")
const pool = require("./db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const multer = require("multer")
const path = require("path")


const app = express();

app.use(express.json())
app.use("/upload", express.static("upload"))
app.use(express.static("public"))

const JWT_SECRET = "SUPER_SECRET_KEY"


// ХРАНИЛИЩЕ ДЛЯ МЕДИЯ

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/auth/login.html"));
});

const storage = multer.diskStorage({
    destination: (req,file,cb) => {
        cb(null, "upload/")
    },
    filename: (req,file,cb) =>{
        const uniqueName = Date.now() + path.extname(file.originalname)
        cb(null,uniqueName)
    }
})

const upload = multer({storage})


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
        res.status(500).json({message: "Server error"});
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
app.put("/api/profile/avatar", authMiddleware, upload.single("avatar"), async(req,res) =>{
        try{
            const userID = req.user.id

            if(!req.file){
                return res.status(400).json({message: "File is required"})
            }

            const avatarPath = "/upload/" + req.file.filename

            const result = await pool.query(`
                    UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, username,email,avatar_url,role
                `, [avatarPath, userID])

                res.json({
                    message:"Avatar updated",
                    user: result.rows[0]
                })
        }
        catch(err){
            console.error(err)
            res.status(500).json({message: "Server error"})
        }
})

// ОБНОВЛЕНИЕ ПРОФИЛЯ
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
// УДАЛЕНИЕ ПРОФИЛЯ
app.delete("/api/profile", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            "DELETE FROM users WHERE id = $1 RETURNING id, username, email",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            message: "Profile deleted",
            deleted: result.rows[0]
        });
    } catch (error) {
        console.error("Delete profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// ПРОВЕРКА АДМИНА

function adminOnly(req,res,next){
    if(req.user.role !== "admin"){
        return res.status(403).json({message: "Forbidden"})
    }
    next()
}

// СПИСОК ВСЕХ ЮЗЕРОВ ДЛЯ АДМИНА
app.get("/api/users", authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, username, email, avatar_url, role, created_at FROM users ORDER BY id"
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Users list error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------POSTS-----------------

// CREATE POST
app.post("/api/posts", authMiddleware, upload.single("post_img"), async(req,res)=>{
    try{
        const userId = req.user.id
        const {book_title, content} = req.body

        let imgPath = null;
        if(req.file) imgPath = "/upload/" + req.file.filename;

        const result = await pool.query(`
            INSERT INTO posts (user_id, book_title,content,post_img)
            VALUES ($1,$2,$3,$4) RETURNING * 
            `, [userId, book_title,content,imgPath])

        res.status(201).json({message: "Post was created", post: result.rows[0]})
    }
    catch(err){
        console.error("Create post error:", err);
        res.status(500).json({message: "Server error"})
    }
})

// GET ALL POSTS получить список всех постов

app.get("/api/posts", async(req,res) =>{
    try{
        const result = await pool.query(`
            SELECT p.*, u.username 
            FROM posts p
            JOIN users u ON u.id = p.user_id
            ORDER BY created_at DESC
            `)
        res.json(result.rows)
    }
    catch (err){
        console.error("Get posts error", err)
        res.status(500).json({message: "Server error"})
    }
})

// UPDATE POST
app.put("/api/posts/:id", authMiddleware, upload.single("post_img"), async (req, res) => {
    try {
        const userId = req.user.id
        const postId = req.params.id
        const { book_title, content } = req.body

        // Проверяем, что пост существует и принадлежит пользователю
        const postCheck = await pool.query(
            `SELECT * FROM posts WHERE id = $1`,
            [postId]
        )

        if (postCheck.rows.length === 0) {
            return res.status(404).json({ message: "Post not found" })
        }

        const post = postCheck.rows[0]

        if (post.user_id !== userId) {
            return res.status(403).json({ message: "You are not the owner of this post" })
        }

        let imgPath = post.post_img
        if (req.file) {
            imgPath = "/upload/" + req.file.filename
        }

        const result = await pool.query(
            `
            UPDATE posts
            SET 
                book_title = COALESCE($1, book_title),
                content = COALESCE($2, content),
                post_img = $3
            WHERE id = $4
            RETURNING *
            `,
            [book_title, content, imgPath, postId]
        )

        res.json({
            message: "Post updated",
            post: result.rows[0]
        })

    } catch (error) {
        console.error("Update post error:", error)
        res.status(500).json({ message: "Server error" })
    }
})

// DELETE POST
app.delete("/api/posts/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id
        const postId = req.params.id

        const postCheck = await pool.query(
            `SELECT * FROM posts WHERE id = $1`,
            [postId]
        )

        if (postCheck.rows.length === 0) {
            return res.status(404).json({ message: "Post not found" })
        }

        const post = postCheck.rows[0]

        if (post.user_id !== userId) {
            return res.status(403).json({ message: "You are not the owner of this post" })
        }

        await pool.query(
            `DELETE FROM posts WHERE id = $1`,
            [postId]
        )

        res.json({ message: "Post deleted" })

    } catch (error) {
        console.error("Delete post error:", error)
        res.status(500).json({ message: "Server error" })
    }
})

// --------------- POSTS LIKE, COMMENT, SAVED -----------------

// toogle like
app.post("/api/posts/:id/like", authMiddleware, async(req,res) =>{
    try{
        const userId = req.user.id
        const postId = req.params.id

        const exist = await pool.query(
            `SELECT id FROM post_likes WHERE user_id = $1 AND post_id = $2`,[userId,postId]
        )

        if(exist.rows.length > 0){
            await pool.query(`DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2`, [userId, postId])
            return res.json({liked: false})
        }

        await pool.query(
            `INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)`, [userId, postId]
        )
        res.json({liked:true})
    }
    catch(err){
        console.error("Like error", err)
        res.status(500).json({message: "Server error"})
    }
})

// ADD comment

app.post("/api/posts/:id/comments", authMiddleware, async(req,res) =>{
    try{
        const userId = req.user.id
        const postId = req.params.id
        const {content} = req.body

        if(!content){
            return res.status(400).json({message: "Content required"})
        }

        const result = await pool.query(`
                INSERT INTO comments (user_id, post_id, content)
                VALUES($1,$2,$3)
                RETURNING *
            `,[userId, postId, content])
        
            res.status(201).json(result.rows[0])
    }
    catch(err){
        console.error("Comment error", err)
        res.status(500).json({message: "Server error"})
    }
})

// GET COMMENT

app.get("/api/posts/:id/comments", async(req,res)=>{
    try{
        const postId = req.params.id
        
        const result = await pool.query(`
            SELECT c.*, u.username, u.avatar_url
            FROM comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
            `, [postId])
            res.json(result.rows)
    }
    catch(err){
        console.error("Get comments error", err)
        res.status(500).json({message: "Server error"})
    }
})
// SAVED POSTS

app.post("/api/posts/:id/save", authMiddleware, async(req,res) =>{
    try{
        const userId = req.user.id
        const postId = req.params.id
        
        const exists = await pool.query(`
                SELECT id FROM saved_posts WHERE user_id = $1 AND post_id = $2 
            `, [userId, postId])

        if(exists.rows.length > 0){
            await pool.query(`
                DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2
                `,[userId, postId])
                return res.json({saved: false})
        }
        await pool.query(

            `INSERT INTO saved_posts (user_id, post_id) VALUES ($1,$2)`,
            [userId, postId]
        )
        res.json({saved:true})
    }
    catch(err){
        console.error("Save error", err)
        res.status(500).json({message: "Server error"})
    }
})

// GET SAVED POSTS

app.get("/api/saved", authMiddleware, async(req,res)=>{
    try{
        const userId = req.user.id

        const result =  await pool.query(`
            
            SELECT p.*, u.username 
            FROM saved_posts s
            JOIN posts p ON p.id = s.post_id
            JOIN users u ON u.id = p.user_id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC

            `,[userId])
        
        res.json(result.rows)
    }
    catch(err){
        console.log("Saved posts error", err)
        res.status(500).json({message: "Server error"})
    }
})
// ============== FRIENDS ===============

// Сама заявка в друзья
app.post("/api/friends/request/:id", authMiddleware, async(req,res) =>{
    try{
        const requestId = req.user.id
        const receiverId = req.params.id

        if( requestId == receiverId){
            return res.status(400).json({message: "Cannot add yourself"})
        }

        const exists = await pool.query(`
                SELECT * FROM friends 
                WHERE (requester_id = $1 AND receiver_id = $2) 
                OR (requester_id = $2 AND receiver_id = $1)
            `, [requestId, receiverId])

        if(exists.rows.length > 0){
            return res.status(400).json({message: "Request already exist"})
        }
        await pool.query(
            `INSERT INTO friends (requester_id, receiver_id, status)
            VALUES ($1, $2, 'pending')
            `, [requestId, receiverId])

        res.json({message: "Friend request send"})
    }
catch(err){
    console.error("Friend request error", err)
    res.status(500).json({message: "Server error"})
}
})

// Отображение самой заявки
app.get("/api/friends/request/", authMiddleware, async(req,res) =>{
    try{
        const userId = req.user.id

        const result = await pool.query(`
                SELECT f.id, u.id as user_id, u.username,u.avatar_url, f.created_at
                FROM friends f 
                JOIN users u ON u.id = f.requester_id
                WHERE f.receiver_id = $1 AND f.status = 'pending' 
            `, [userId])
            res.json(result.rows)
    }
    catch(err){
        console.error("Get request error",err)
        res.status(500).json({message: "Server error"})
    }
})
// Принятие заявки
app.post("/api/friends/accept/:id", authMiddleware, async(req,res) =>{
    try{
        const userId = req.user.id
        const requestId = req.params.id
        
        const result = await pool.query(`
            
            UPDATE friends
            SET status = 'accepted'
            WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
            RETURNING *
            `, [requestId, userId])

            if(result.rows.length === 0 ){
                return res.status(404).json({message: "Request not found"})
            }
            
            res.json({message: "Friend request accepted"})
    }
    catch(err){
        console.error("Accept friend error", err)
        res.status(500).json({message:"Server error"})
    }
})





app.listen(5588, () =>{
    console.log("Server working, http://localhost:5588")
})