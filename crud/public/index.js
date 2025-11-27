const titleInput = document.getElementById("title");
const priceInput = document.getElementById("price");
const list = document.getElementById("list");
const addBtn = document.getElementById("addBtn");

// Загрузка книг
async function loadBooks() {
    const res = await fetch("/books");
    const data = await res.json();

    list.innerHTML = "";

    data.forEach(book => {
        const div = document.createElement("div");
        div.className = "book";

        div.innerHTML = `
            <div class="book-title">${book.title}</div>
            <div class="book-price">${book.price} ₸</div>
            <button class="delete-btn" onclick="removeBook(${book.id})">🗑</button>
        `;

        list.appendChild(div);
    });
}

// Добавление книги
addBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const price = Number(priceInput.value);

    if (!title || !price) {
        alert("Введите название и цену!");
        return;
    }

    const res = await fetch("/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, price })
    });

    await res.json();

    titleInput.value = "";
    priceInput.value = "";

    loadBooks();
});

// Удаление книги
async function removeBook(id) {
    await fetch(`/books/${id}`, {
        method: "DELETE"
    });

    loadBooks();
}

// Загрузка при старте
loadBooks();
