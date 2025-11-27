const API_URL = "http://localhost:5000";

// ===== REGISTER =====
async function registerUser() {
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const msgEl = document.getElementById("regMessage");

    msgEl.className = "message";
    msgEl.innerText = "";

    if (!email || !password) {
        msgEl.classList.add("error");
        msgEl.innerText = "Введите email и пароль";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            msgEl.classList.add("success");
            msgEl.innerText = "Регистрация успешна! Теперь можете войти.";
        } else {
            msgEl.classList.add("error");
            msgEl.innerText = data.message || "Ошибка регистрации";
        }
    } catch (e) {
        msgEl.classList.add("error");
        msgEl.innerText = "Ошибка соединения с сервером";
    }
}


// ===== LOGIN =====
async function loginUser() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const msgEl = document.getElementById("loginMessage");

    msgEl.className = "message";
    msgEl.innerText = "";

    if (!email || !password) {
        msgEl.classList.add("error");
        msgEl.innerText = "Введите email и пароль";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.token) {
            localStorage.setItem("token", data.token);
            window.location.href = "index.html";
        } else {
            msgEl.classList.add("error");
            msgEl.innerText = data.message || "Ошибка авторизации";
        }
    } catch (e) {
        msgEl.classList.add("error");
        msgEl.innerText = "Ошибка соединения с сервером";
    }
}


// ===== PROFILE =====
async function loadProfile() {
    const token = localStorage.getItem("token");
    const msgEl = document.getElementById("profileMessage");
    const dataEl = document.getElementById("profileData");

    msgEl.className = "message";
    dataEl.innerText = "";

    if (!token) {
        msgEl.classList.add("error");
        msgEl.innerText = "Вы не авторизованы. Перейдите на страницу входа.";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/profile`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok) {
            msgEl.classList.add("success");
            msgEl.innerText = data.message || "Данные профиля загружены";
            dataEl.innerText = JSON.stringify(data.user || data, null, 2);
        } else {
            msgEl.classList.add("error");
            msgEl.innerText = data.message || "Ошибка получения профиля";
        }
    } catch (e) {
        msgEl.classList.add("error");
        msgEl.innerText = "Ошибка соединения с сервером";
    }
}


// ===== LOGOUT =====
function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}
