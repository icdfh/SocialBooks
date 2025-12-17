async function api(url, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(url, {
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token && { Authorization: "Bearer " + token })
    },
    ...options
  });

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}
