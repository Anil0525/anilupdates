import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// 🔥 YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDBCECOxYSlmL2cSXsWmD6pWx8kjNZ-Tkc",
  authDomain: "anilupdates-2c005.firebaseapp.com",
  projectId: "anilupdates-2c005",
  storageBucket: "anilupdates-2c005.firebasestorage.app",
  messagingSenderId: "180178544762",
  appId: "1:180178544762:web:e082062cf5c49cd08bf3c3",
  measurementId: "G-QZSYKK5RLL"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// DOM Elements
const postsDiv = document.getElementById("posts");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authStatus = document.getElementById("authStatus");
const adminPanel = document.getElementById("adminPanel");

const titleInput = document.getElementById("title");
const catInput = document.getElementById("category");
const summaryInput = document.getElementById("summary");
const addPostBtn = document.getElementById("addPostBtn");


// Load posts for everyone
async function loadPosts() {
  postsDiv.innerHTML = "Loading...";

  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    postsDiv.innerHTML = "<p>No posts yet.</p>";
    return;
  }

  let html = "";
  snap.forEach(doc => {
    const p = doc.data();
    html += `
      <div class="post">
        <h3>${p.title}</h3>
        <small>${p.category} • ${p.date}</small>
        <p>${p.summary}</p>
      </div>
    `;
  });

  postsDiv.innerHTML = html;
}


// Authentication check
onAuthStateChanged(auth, (user) => {
  if (user) {
    authStatus.textContent = "Logged in: " + user.email;
    adminPanel.style.display = "block";

    logoutBtn.style.display = "inline-block";
    loginBtn.style.display = "none";
    emailInput.style.display = "none";
    passwordInput.style.display = "none";
  } else {
    authStatus.textContent = "Not logged in";
    adminPanel.style.display = "none";

    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
    emailInput.style.display = "inline-block";
    passwordInput.style.display = "inline-block";
  }
});


// Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const pass = passwordInput.value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});


// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});


// Add post
addPostBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const summary = summaryInput.value.trim();
  const category = catInput.value.trim();

  if (!title || !summary) {
    alert("Title & Summary required");
    return;
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  await addDoc(collection(db, "posts"), {
    title,
    summary,
    category,
    date,
    createdAt: now
  });

  alert("Post Published!");
  titleInput.value = "";
  summaryInput.value = "";

  loadPosts();
});


// Load posts once site opens
loadPosts();
