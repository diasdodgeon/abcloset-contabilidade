// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

// 🔧 CONFIGURAÇÃO DO FIREBASE (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: "AIzaSyBE7Swcwkx_B7IAROPuC6sIdWpxyEC3r_Q",
  authDomain: "contabilidade-abcloset.firebaseapp.com",
  projectId: "contabilidade-abcloset",
  storageBucket: "contabilidade-abcloset.firebasestorage.app",
  messagingSenderId: "69860840165",
  appId: "1:69860840165:web:cb4694c4d73da77b55fa0c",
  measurementId: "G-YFSDS23CMY"
};

// 🔥 Inicializa Firebase e Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🎯 Captura o formulário
const form = document.getElementById("form-conta");
const statusEl = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const tipo = document.getElementById("tipo").value;
  const descricao = document.getElementById("descricao").value;
  const valor = parseFloat(document.getElementById("valor").value);

  try {
    await addDoc(collection(db, "lancamentos"), {
      tipo,
      descricao,
      valor,
      timestamp: serverTimestamp()
    });

    statusEl.textContent = "✅ Lançamento salvo com sucesso!";
    form.reset();
    setTimeout(() => statusEl.textContent = "", 3000);
  } catch (error) {
    console.error("Erro ao salvar:", error);
    statusEl.textContent = "❌ Erro ao salvar. Tente novamente.";
  }
});
