const form = document.querySelector("form");

if (form) {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const usernameInput = document.getElementById("username");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const isRegister = location.pathname.includes("register");

    const body = {
      email: emailInput.value.trim(),
      password: passwordInput.value.trim()
    };

    if (isRegister) {
      body.username = usernameInput.value.trim();
    }

    const url = isRegister
      ? "/api/auth/register"
      : "/api/auth/login";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    localStorage.setItem("token", data.token);
    location.href = "/app/index.html";
  });
}
