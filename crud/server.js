const express = require("express");
const pool = require("./db");
const app = express()

app.use(express.json())
app.use(express.static("public"))

app.get("/", (req,res) =>{
    res.json({message: "API работает"})
});

// let books = [
//     {id: 1, title: "Atomic Habits", price:5000},
//     {id: 2, title: "Deep Work", price:6000},
//     {id: 3, title: "Java Basics", price: 12000}
// ]
// app.get("/books", (req, res) => {
//     res.json(books)
// })

// app.get("/books/:id", (req,res) => { 
//     const id = Number(req.params.id);
//     const book = books.find(b => b.id === id)
//     res.json(book || {})
// })

// app.post("/books", (req, res) =>{
//     const newBook = {
//         id: Date.now(),
//         title: req.body.title,
//         price: req.body.price
//     };

//     books.push(newBook);
//     res.json(newBook)
// })

// app.put("/books/:id", (req,res) =>{
//     const id = Number(req.params.id);

//     books = books.map(book => book.id === id  ?  {...book, ...req.body} : book)


// res.json({message: "Обновлено"})
// });

// app.delete("/books/:id", (req,res) =>{
//     const id = Number(req.params.id)

//     books = books.filter(book => book.id !== id)

//     res.json({message: "Удалено"})
// })

app.get("/books", async(req, res) =>{
    const result = await pool.query("SELECT * FROM books")
    res.json(result.rows)
})

app.post("/books", async(req,res) =>{
    const {title, price} = req.body;

    const result = await pool.query(
        `INSERT INTO books(title, price)
        VALUES($1, $2) RETURNING *
        `, [title, price]
    );
    res.json(result.rows[0])
})
app.delete("/books/:id", async(req,res) =>{
    const id = req.params.id;
    await pool.query("DELETE FROM books WHERE id = $1", [id])
    res.json({message:"Удалено"})
})








app.listen(3000, () =>{
    console.log("Сервер запущен: http://localhost:3000")
})