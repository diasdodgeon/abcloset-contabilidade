// --- Firebase Core ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// --- Firestore ---
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { FIREBASE_CONFIG } from "./config.js";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// 🔹 Variáveis globais
let imagemBase64 = null;
let inputCamera;
let previewImage;

// 🧹 Limpa produtos arquivados com mais de 1 ano
async function limparArquivadosAntigosLocal() {
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  const snap = await getDocs(collection(db, "arquivados"));
  for (const docu of snap.docs) {
    const data = docu.data();
    if (data.data_arquivado && new Date(data.data_arquivado) < umAnoAtras) {
      await deleteDoc(doc(db, "arquivados", docu.id));
      console.log(`🗑️ Produto antigo removido: ${data.nome}`);
    }
  }
}
limparArquivadosAntigosLocal().catch(console.error);

// 🧠 Comprime imagem
async function compressImage(file, maxSize = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// 💰 Formata moeda
function formatCurrencyBR(value) {
  return "R$ " + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

// ===================================================
// 🧾 INICIALIZA VENDAS
// ===================================================
async function initVendi(db) {
  const searchEl = document.getElementById("vendi-search");
  const resultsEl = document.getElementById("vendi-results");
  const totalEl = document.getElementById("vendi-total");
  const obsEl = document.getElementById("vendi-observacao");
  const statusEl = document.getElementById("vendi-status");
  const btnFinalizar = document.getElementById("btn-finalizar-venda");
  const btnLimpar = document.getElementById("btn-limpar-carrinho");

  let allProducts = [];
  let cart = [];

  async function fetchProducts() {
    resultsEl.innerHTML = "Carregando produtos...";
    const snapshot = await getDocs(collection(db, "produtos"));
    allProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderResults(allProducts.slice(0, 50));
    statusEl.textContent = "";
  }

  function renderResults(list) {
    resultsEl.innerHTML = list.map(p => `
      <div class="result-item" data-id="${p.id}">
        <img class="result-thumb" src="${p.imagem_base64 || ''}" alt="thumb">
        <div class="result-meta">
          <b>${p.nome}</b>
          <small>R$ ${Number(p.preco_venda).toFixed(2)} • Qtd: ${p.quantidade}</small>
        </div>
      </div>`).join("");
    resultsEl.querySelectorAll(".result-item").forEach(el => {
      el.addEventListener("click", () => addToCart(el.dataset.id));
    });
  }

  function addToCart(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    const existing = cart.find(c => c.id === id);
    if (existing) existing.qty++;
    else cart.push({ ...p, qty: 1 });
    renderCart();
  }

  function renderCart() {
    const cartEl = document.getElementById("vendi-cart");
    if (!cart.length) {
      cartEl.innerHTML = "<p>Recibo vazio</p>";
      totalEl.textContent = "R$ 0,00";
      return;
    }
    let total = 0;
    cartEl.innerHTML = "";
    cart.forEach((item, i) => {
      total += item.preco_venda * item.qty;
      const li = document.createElement("div");
      li.className = "cart-item";
      li.innerHTML = `
        <b>${item.nome}</b>
        <div>Qtd: ${item.qty}</div>
        <div>R$ ${(item.preco_venda * item.qty).toFixed(2)}</div>`;
      cartEl.appendChild(li);
    });
    totalEl.textContent = formatCurrencyBR(total);
  }

  btnLimpar.addEventListener("click", () => {
    if (confirm("Limpar recibo?")) {
      cart = [];
      renderCart();
    }
  });

  btnFinalizar.addEventListener("click", async () => {
    if (!cart.length) return alert("Carrinho vazio");
    for (const item of cart) {
      const ref = doc(db, "produtos", item.id);
      const snap = await getDoc(ref);
      const data = snap.data();
      const novaQtd = data.quantidade - item.qty;
      if (novaQtd > 0) {
        await updateDoc(ref, { quantidade: novaQtd });
      } else {
        await addDoc(collection(db, "arquivados"), {
          ...data,
          quantidade: 0,
          data_arquivado: new Date().toISOString()
        });
        await deleteDoc(ref);
      }
      await addDoc(collection(db, "lancamentos"), {
        tipo: "vendi",
        produto_id: item.id,
        descricao: item.nome,
        quantidade: item.qty,
        valor_unitario: item.preco_venda,
        valor_total: item.preco_venda * item.qty,
        observacao: obsEl.value || "",
        timestamp: serverTimestamp()
      });
    }
    cart = [];
    renderCart();
    fetchProducts();
    alert("✅ Venda registrada!");
  });

  fetchProducts();
}
initVendi(db);

// ===================================================
// 🎥 CAPTURA DE IMAGEM + MODAIS
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  const selectTipo = document.getElementById("tipo");
  const modais = {
    vendi: document.getElementById("modal-vendi"),
    comprei: document.getElementById("modal-comprei"),
    paguei: document.getElementById("modal-paguei")
  };

  inputCamera = document.createElement("input");
  inputCamera.type = "file";
  inputCamera.accept = "image/*";
  inputCamera.capture = "camera";
  inputCamera.style.display = "none";
  document.body.appendChild(inputCamera);

  previewImage = document.getElementById("preview-image");

  // 🔄 Função global de troca de modal
  function atualizarModal() {
    const tipoSel = selectTipo.value;
    Object.entries(modais).forEach(([tipo, el]) => {
      el.classList.toggle("active", tipo === tipoSel);
    });
  }
  selectTipo.addEventListener("change", atualizarModal);
  selectTipo.value = "vendi";
  atualizarModal();
  window.atualizarModal = atualizarModal;
});
