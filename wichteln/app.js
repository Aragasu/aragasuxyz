import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const select = document.getElementById("nameSelect");
const rollBtn = document.getElementById("rollBtn");
const rollingName = document.getElementById("rollingName");
const result = document.getElementById("result");
const adminPanel = document.getElementById("adminPanel");
const disabledMessage = document.getElementById("disabledMessage");
const toggleBtn = document.getElementById("toggleBtn");

let persons = [];
let globalEnabled = true;

/* ❄️ Schnee */
const canvas = document.getElementById("snow");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.onresize = resize;

let flakes = Array.from({ length: 100 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 3 + 1,
  speed: Math.random() * 0.8 + 0.3
}));

function snow() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  flakes.forEach(f => {
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    f.y += f.speed;
    if (f.y > canvas.height) {
      f.y = 0;
      f.x = Math.random() * canvas.width;
    }
  });
  requestAnimationFrame(snow);
}
snow();

/* 🔥 Daten */
async function loadData() {
  const snap = await getDocs(collection(db, "persons"));
  persons = [];
  snap.forEach(d => persons.push({ id: d.id, ...d.data() }));
  updateSelect();
}

function updateSelect() {
  select.innerHTML = "";
  persons.filter(p => !p.hasDrawn).forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
}

/* 🎯 Ziehen */
rollBtn.onclick = async () => {
  if (!globalEnabled) return;
  
  const drawer = persons.find(p => p.id === select.value);
  if (!drawer) return;
  
  rollBtn.disabled = true;
  result.classList.remove("show");
  
  const available = persons.filter(p => !p.isTaken && p.id !== drawer.id);
  if (!available.length) {
    rollBtn.disabled = false;
    return alert("Niemand verfügbar.");
  }
  
  const chosen = available[Math.floor(Math.random() * available.length)];
  
  let count = 0;
  const interval = setInterval(() => {
    const r = persons[Math.floor(Math.random() * persons.length)];
    rollingName.textContent = r.name;
    count++;
    if (count > 25) {
      clearInterval(interval);
      finalize(drawer, chosen);
    }
  }, 70);
};

async function finalize(drawer, chosen) {
  rollingName.textContent = "";
  result.textContent = "Du hast " + chosen.name;
  result.classList.add("show");
  
  await updateDoc(doc(db, "persons", drawer.id), {
    hasDrawn: true,
    drewId: chosen.id
  });
  
  await updateDoc(doc(db, "persons", chosen.id), {
    isTaken: true
  });
  
  rollBtn.disabled = false;
  loadData();
}

/* 🔐 Global Enable / Disable */
function listenGlobal() {
  const ref = doc(db, "settings", "global");
  
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    
    globalEnabled = snap.data().enabled;
    
    if (!globalEnabled) {
      rollBtn.disabled = true;
      select.disabled = true;
      disabledMessage.classList.remove("hidden");
    } else {
      rollBtn.disabled = false;
      select.disabled = false;
      disabledMessage.classList.add("hidden");
    }
    
    if (toggleBtn)
      toggleBtn.textContent = globalEnabled ?
      "Disable Ziehung" :
      "Enable Ziehung";
  });
}

window.toggleGlobal = async function() {
  const ref = doc(db, "settings", "global");
  await updateDoc(ref, { enabled: !globalEnabled });
};

/* 🔐 Admin */
function checkAdmin() {
  if (window.location.search.includes("admin")) {
    const pass = prompt("Passwort:");
    if (pass === "_jxstShadow") {
      adminPanel.classList.remove("hidden");
      
      onSnapshot(collection(db, "persons"), snap => {
        let html = "";
        snap.forEach(d => {
          const data = d.data();
          html += `<div>${data.name} ➜ ${data.drewId || "-"}</div>`;
        });
        document.getElementById("pairs").innerHTML = html;
      });
    }
  }
}

window.addPerson = async function() {
  const name = document.getElementById("newPerson").value;
  if (!name) return;
  await setDoc(doc(collection(db, "persons")), {
    name,
    hasDrawn: false,
    isTaken: false,
    drewId: null
  });
  loadData();
};

window.resetAll = async function() {
  const snap = await getDocs(collection(db, "persons"));
  snap.forEach(async d => {
    await updateDoc(doc(db, "persons", d.id), {
      hasDrawn: false,
      isTaken: false,
      drewId: null
    });
  });
};

checkAdmin();
loadData();
listenGlobal();