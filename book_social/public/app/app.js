/* AUTH */
if (!localStorage.getItem("token")) {
  location.href = "/auth/login.html";
}

const postsEl = document.getElementById("posts");
const profileEl = document.getElementById("profile");
const modal = document.getElementById("createModal");
const avatarModal = document.getElementById("avatarModal");
const createForm = document.getElementById("createForm");
const avatarForm = document.getElementById("avatarForm");

/* PROFILE */
async function loadProfile() {
  const user = await api("/api/profile");
  profileEl.innerHTML = `
    <div class="profile">
      <img src="${user.avatar_url || '/assets/default-avatar.png'}">
      <h3>${user.username}</h3>
      <p>${user.email}</p>

      <div class="profile-actions">
        <button onclick="openAvatarModal()">Change avatar</button>
        <button class="danger" onclick="deleteAvatar()">Delete avatar</button>
      </div>
    </div>
  `;
}

/* POSTS */
async function loadPosts() {
  const posts = await api("/api/posts");
  render(posts);
}

async function loadSaved() {
  const posts = await api("/api/saved");
  render(posts);
}

function render(posts) {
  postsEl.innerHTML = posts.map(p => `
    <div class="post">
      <img src="${p.post_img || '/assets/default-avatar.png'}">
      <div>
        <h3>${p.book_title || "Untitled"}</h3>
        <p>${p.content || ""}</p>

        <div class="actions">
          <div class="action-2">
            <div class="action" onclick="toggleLike(${p.id}, this)">
              <span class="heart">🤍</span> Like
            </div>
            <div class="action" onclick="toggleComments(${p.id})">💬 Comment</div>
          </div>
          <div class="action" onclick="toggleSave(${p.id}, this)">📌 Save</div>
        </div>

        <div class="comments hidden" id="comments-${p.id}">
          <div class="list"></div>
          <input onkeydown="sendComment(event, ${p.id})"
                 placeholder="Write comment and press Enter">
        </div>
      </div>
    </div>
  `).join("");
}

/* LIKE */
async function toggleLike(id, el) {
  const res = await api(`/api/posts/${id}/like`, { method: "POST" });
  const heart = el.querySelector(".heart");
  heart.textContent = res.liked ? "❤️" : "🤍";
  heart.classList.toggle("active", res.liked);
}

/* SAVE */
async function toggleSave(id, el) {
  const res = await api(`/api/posts/${id}/save`, { method: "POST" });
  el.style.color = res.saved ? "#ff8a3d" : "";
}

/* COMMENTS */
async function toggleComments(id) {
  const box = document.getElementById(`comments-${id}`);
  box.classList.toggle("hidden");

  if (box.dataset.loaded) return;

  const comments = await api(`/api/posts/${id}/comments`);
  box.querySelector(".list").innerHTML =
    comments.map(c => `<div><b>${c.username}</b>: ${c.content}</div>`).join("");

  box.dataset.loaded = "true";
}

async function sendComment(e, id) {
  if (e.key !== "Enter") return;
  const content = e.target.value.trim();
  if (!content) return;

  const comment = await api(`/api/posts/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ content })
  });

  e.target.value = "";
  document.querySelector(`#comments-${id} .list`)
    .insertAdjacentHTML("beforeend",
      `<div><b>You</b>: ${comment.content}</div>`);
}

/* CREATE POST */
function openCreate() {
  modal.classList.remove("hidden");
}

createForm.onsubmit = async e => {
  e.preventDefault();
  const data = new FormData(createForm);

  await fetch("/api/posts", {
    method: "POST",
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    body: data
  });

  modal.classList.add("hidden");
  createForm.reset();
  loadPosts();
};

/* AVATAR */
function openAvatarModal() {
  avatarModal.classList.remove("hidden");
}

avatarForm.onsubmit = async e => {
  e.preventDefault();
  const data = new FormData(avatarForm);

  await fetch("/api/profile/avatar", {
    method: "PUT",
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    body: data
  });

  avatarModal.classList.add("hidden");
  loadProfile();
};

async function deleteAvatar() {
  if (!confirm("Delete avatar?")) return;
  await api("/api/profile", {
    method: "PUT",
    body: JSON.stringify({ avatar_url: null })
  });
  loadProfile();
}

/* LOGOUT */
function logout() {
  localStorage.removeItem("token");
  location.href = "/auth/login.html";
}

/* INIT */
loadProfile();
loadPosts();
