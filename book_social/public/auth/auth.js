const form = document.querySelector("form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const isLogin = location.pathname.includes("login");

  const body = {
    email: email.value,
    password: password.value
  };

  if (!isLogin) body.username = username.value;

  const res = await fetch(
    isLogin ? "/api/auth/login" : "/api/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    location.href = "/app/index.html";
  } else {
    alert(data.message);
  }
});
