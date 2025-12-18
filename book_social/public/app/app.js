/* =========================
   AUTH GUARD
========================= */
const token = localStorage.getItem("token");
if (!token) {
  location.href = "/auth/login.html";
}

/* =========================
   API HELPER
========================= */
async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

/* =========================
   ELEMENTS
========================= */
const feedEl = document.querySelector(".feed");
const profileEl = document.getElementById("profile");

const postsEl = document.getElementById("posts");

const createModal = document.getElementById("createModal");
const avatarModal = document.getElementById("avatarModal");
const createForm = document.getElementById("createForm");
const avatarForm = document.getElementById("avatarForm");

const friendSearchModal = document.getElementById("friendSearchModal");
const friendSearchForm = document.getElementById("friendSearchForm");
const friendSearchInput = document.getElementById("friendSearchInput");
const friendSearchResults = document.getElementById("friendSearchResults");

/* =========================
   STATE
========================= */
let view = "feed"; // feed | saved | friends
let friendsTab = "incoming"; // all | incoming | sent | (blacklist later)

/* =========================
   PROFILE
========================= */
async function loadProfile() {
  try {
    const user = await api("/api/profile");

    profileEl.innerHTML = `
      <div class="profile">
        <img src="${user.avatar_url || "/assets/default-avatar.png"}">
        <h3>${user.username}</h3>
        <p>${user.email}</p>

        <div class="profile-actions">
          <button onclick="openAvatarModal()">Change avatar</button>
          <button class="danger" onclick="deleteAvatar()">Delete avatar</button>
        </div>
      </div>
    `;
  } catch (e) {
    console.error(e);
  }
}

/* =========================
   VIEW SWITCH
========================= */
function openFeed() {
  view = "feed";

  // вернуть твой исходный HTML-контракт
  feedEl.innerHTML = `
    <h1>Main Page</h1>
    <div id="posts"></div>
  `;

  // обновим ссылку на postsEl после перерендера
  window.postsEl = document.getElementById("posts");
  loadPosts();
}

async function loadSaved() {
  view = "saved";

  feedEl.innerHTML = `
    <h1>Saves</h1>
    <div id="posts"></div>
  `;

  window.postsEl = document.getElementById("posts");
  const posts = await api("/api/saved");
  render(posts);
}

function openFriends() {
  view = "friends";

  feedEl.innerHTML = `
    <div class="friends-page">
      <h1>Friends</h1>

      <div class="friends-topbar">
        <div class="friends-tabs">
          <button class="tab ${friendsTab === "all" ? "active" : ""}" onclick="setFriendsTab('all')">All friends</button>
          <button class="tab ${friendsTab === "incoming" ? "active" : ""}" onclick="setFriendsTab('incoming')">Incoming</button>
          <button class="tab ${friendsTab === "sent" ? "active" : ""}" onclick="setFriendsTab('sent')">Sent</button>
          <button class="tab" disabled>Blacklist</button>
        </div>

        <button onclick="openFriendSearch()">＋ Add friend</button>
      </div>

      <div id="friendsContent"></div>
    </div>
  `;

  loadFriends();
}

function setFriendsTab(tab) {
  friendsTab = tab;
  openFriends(); // проще и надёжнее: перерисовали UI и подгрузили
}

/* =========================
   POSTS
========================= */
async function loadPosts() {
  const posts = await api("/api/posts");
  render(posts);
}

// ВАЖНО: не меняем структуру, чтобы CSS не ломался
function render(posts) {
  const el = document.getElementById("posts");
  if (!el) return;

  el.innerHTML = posts
    .map(
      (p) => `
    <div class="post">
      <img src="${p.post_img || "/assets/default-avatar.png"}">

      <div>
        <h3>${p.book_title || "Untitled"}</h3>
        <p>${p.content || ""}</p>

        <div class="actions">
          <div class="action-2">
            <div class="action" onclick="toggleLike(${p.id}, this)">
              <span class="heart">${p.liked ? "❤️" : "🤍"}</span> Like
            </div>
            <div class="action" onclick="toggleComments(${p.id})">
              💬 Comment
            </div>

            <!-- OPTIONAL: add friend по автору поста (если хочешь) -->
            <div class="action" onclick="sendFriendRequest(${p.user_id})">
              👥 Add friend
            </div>
          </div>

          <div class="action" onclick="toggleSave(${p.id}, this)">
            📌 Save
          </div>
        </div>

        <div class="comments hidden" id="comments-${p.id}">
          <div class="list"></div>
          <input
            placeholder="Write comment and press Enter"
            onkeydown="sendComment(event, ${p.id})"
          />
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

/* =========================
   LIKE
========================= */
async function toggleLike(id, el) {
  const res = await api(`/api/posts/${id}/like`, { method: "POST" });
  const heart = el.querySelector(".heart");
  heart.textContent = res.liked ? "❤️" : "🤍";
}

/* =========================
   SAVE
========================= */
async function toggleSave(id, el) {
  const res = await api(`/api/posts/${id}/save`, { method: "POST" });
  el.style.color = res.saved ? "#ff8a3d" : "";
}

/* =========================
   COMMENTS
========================= */
async function toggleComments(id) {
  const box = document.getElementById(`comments-${id}`);
  box.classList.toggle("hidden");

  if (box.dataset.loaded) return;

  const comments = await api(`/api/posts/${id}/comments`);
  box.querySelector(".list").innerHTML = comments
    .map((c) => `<div><b>${c.username}</b>: ${c.content}</div>`)
    .join("");

  box.dataset.loaded = "true";
}

async function sendComment(e, id) {
  if (e.key !== "Enter") return;

  const content = e.target.value.trim();
  if (!content) return;

  const comment = await api(`/api/posts/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

  e.target.value = "";
  document
    .querySelector(`#comments-${id} .list`)
    .insertAdjacentHTML("beforeend", `<div><b>You</b>: ${comment.content}</div>`);
}

/* =========================
   CREATE POST
========================= */
function openCreate() {
  createModal.classList.remove("hidden");
}

createForm.onsubmit = async (e) => {
  e.preventDefault();
  const data = new FormData(createForm);

  await fetch("/api/posts", {
    method: "POST",
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    body: data,
  });

  createModal.classList.add("hidden");
  createForm.reset();

  if (view === "feed") loadPosts();
  if (view === "saved") loadSaved();
};

/* =========================
   AVATAR
========================= */
function openAvatarModal() {
  avatarModal.classList.remove("hidden");
}

avatarForm.onsubmit = async (e) => {
  e.preventDefault();
  const data = new FormData(avatarForm);

  await fetch("/api/profile/avatar", {
    method: "PUT",
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    body: data,
  });

  avatarModal.classList.add("hidden");
  loadProfile();
};

async function deleteAvatar() {
  if (!confirm("Delete avatar?")) return;

  // У тебя backend сейчас обновляет только username/email.
  // Поэтому этот вызов в текущем виде НЕ сработает, если backend не умеет avatar_url=null.
  // Правильнее: сделать отдельный endpoint /api/profile/avatar DELETE.
  alert("Backend endpoint for deleting avatar is not implemented yet.");
}

/* =========================
   FRIENDS (FRONT)
========================= */

// Твои текущие API:
// POST   /api/friends/request/:id
// GET    /api/friends/request         (incoming)
// POST   /api/friends/accept/:id
//
// Для будущего:
// GET    /api/friends                 (all accepted)
// GET    /api/friends/sent            (sent pending)
// GET    /api/users/search?q=         (search)

async function loadFriends() {
  const content = document.getElementById("friendsContent");
  if (!content) return;

  content.innerHTML = "Loading...";

  try {
    let data = [];
    if (friendsTab === "incoming") {
      data = await api("/api/friends/request");
      content.innerHTML = renderIncomingRequests(data);
      return;
    }

    // Эти два таба требуют backend endpoints
    if (friendsTab === "all") {
      content.innerHTML =
        "<p>Endpoint /api/friends not implemented yet. Add it on backend.</p>";
      return;
    }

    if (friendsTab === "sent") {
      content.innerHTML =
        "<p>Endpoint /api/friends/sent not implemented yet. Add it on backend.</p>";
      return;
    }
  } catch (e) {
    console.error(e);
    content.innerHTML = `<p>Error loading friends</p>`;
  }
}

function renderIncomingRequests(list) {
  if (!list.length) return "<p>No incoming requests</p>";

  return list
    .map(
      (r) => `
      <div class="post" style="grid-template-columns: 72px 1fr;">
        <img style="width:72px;height:72px" src="${r.avatar_url || "/assets/default-avatar.png"}">
        <div>
          <h3>${r.username}</h3>
          <p class="muted">Request</p>

          <div class="actions">
            <div class="action-2">
              <div class="action" onclick="acceptFriend(${r.id})">✅ Accept</div>
            </div>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

async function sendFriendRequest(userId) {
  try {
    await api(`/api/friends/request/${userId}`, { method: "POST" });
    alert("Friend request sent");

    // если ты на friends incoming — перезагрузи
    if (view === "friends" && friendsTab === "incoming") loadFriends();
  } catch (e) {
    alert(e.message || "Request failed");
  }
}

async function acceptFriend(requestId) {
  try {
    await api(`/api/friends/accept/${requestId}`, { method: "POST" });
    loadFriends();
  } catch (e) {
    alert(e.message || "Accept failed");
  }
}

/* =========================
   FRIEND SEARCH MODAL
========================= */
function openFriendSearch() {
  friendSearchModal.classList.remove("hidden");
  friendSearchResults.innerHTML = "";
  friendSearchInput.value = "";
  friendSearchInput.focus();
}

function closeFriendSearch() {
  friendSearchModal.classList.add("hidden");
}

friendSearchForm.onsubmit = (e) => {
  e.preventDefault();
};

async function searchUsers() {
  const q = friendSearchInput.value.trim();
  if (q.length < 2) {
    friendSearchResults.innerHTML = "";
    return;
  }

  // Требует backend /api/users/search?q=
  try {
    const users = await api(`/api/users/search?q=${encodeURIComponent(q)}`);
    if (!users.length) {
      friendSearchResults.innerHTML = "<p>No users</p>";
      return;
    }

    friendSearchResults.innerHTML = users
      .map(
        (u) => `
        <div class="post" style="grid-template-columns: 72px 1fr;">
          <img style="width:72px;height:72px" src="${u.avatar_url || "/assets/default-avatar.png"}">
          <div>
            <h3>${u.username}</h3>
            <p class="muted">${u.email || ""}</p>
            <div class="actions">
              <div class="action-2">
                <div class="action" onclick="sendFriendRequest(${u.id})">👥 Add</div>
              </div>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  } catch (e) {
    friendSearchResults.innerHTML =
      "<p>Search endpoint not implemented yet: /api/users/search</p>";
  }
}

/* =========================
   LOGOUT
========================= */
function logout() {
  localStorage.removeItem("token");
  location.href = "/auth/login.html";
}

/* =========================
   INIT
========================= */
loadProfile();
openFeed();
