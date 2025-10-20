import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,       
  doc,
  updateDoc,
  deleteDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { FIREBASE_CONFIG } from "./config.js";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const searchInput = document.getElementById("search-estoque");
const listaEl = document.getElementById("lista-estoque");

// Modal de imagem
const modalView = document.getElementById("modal-view-image");
const viewImage = document.getElementById("view-image");
document.getElementById("btn-fechar-view").addEventListener("click", () => modalView.classList.remove("active"));
modalView.addEventListener("click", e => { if (e.target === modalView) modalView.classList.remove("active"); });

// Renderização do estoque
async function carregarEstoque() {
  const snap = await getDocs(collection(db, "produtos"));
  let produtos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderLista(produtos);

  searchInput.addEventListener("input", e => {
    const termo = e.target.value.toLowerCase();
    const filtrados = produtos.filter(p => (p.nome || "").toLowerCase().includes(termo));
    renderLista(filtrados);
  });
}

function renderLista(lista) {
  listaEl.innerHTML = "";

  if (!lista.length) {
    listaEl.innerHTML = "<p style='color:#666;text-align:center;'>Nenhum produto encontrado</p>";
    return;
  }

  lista.forEach(prod => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <img src="${prod.imagem_base64 || ''}" class="result-thumb" alt="${prod.nome}">
      <div class="result-meta">
        <b>${prod.nome}</b>
        <small>Compra: R$ ${Number(prod.preco_custo).toFixed(2)}</small>
        <div>
          Venda: <input type="number" step="0.01" value="${prod.preco_venda}" class="preco-input" data-id="${prod.id}">
        </div>
      </div>
      <div>
        <button class="btn-remover" data-id="${prod.id}">🗑️</button>
      </div>
    `;
    listaEl.appendChild(div);
  });

  // abrir imagem
  document.querySelectorAll(".result-thumb").forEach(img => {
    img.addEventListener("click", e => {
      viewImage.src = e.target.src;
      modalView.classList.add("active");
    });
  });

  // editar preço
  document.querySelectorAll(".preco-input").forEach(input => {
    input.addEventListener("change", async e => {
      const id = e.target.dataset.id;
      const novoPreco = parseFloat(e.target.value);
      await updateDoc(doc(db, "produtos", id), { preco_venda: novoPreco });
      alert("💲 Preço atualizado!");
    });
  });

  // remover produto (mover para arquivados)
  document.querySelectorAll(".btn-remover").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.target.dataset.id;
      if (!confirm("Remover este produto do estoque?")) return;
      const ref = doc(db, "produtos", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      await addDoc(collection(db, "arquivados"), { ...data, data_arquivado: new Date().toISOString() });
      await deleteDoc(ref);
      alert("🗂️ Produto movido para seu historico!");
      carregarEstoque();
    });
  });
}

carregarEstoque();

const modalHistorico = document.getElementById("modal-historico");
const listaArquivados = document.getElementById("lista-arquivados");
const btnHistorico = document.getElementById("btn-historico");
const btnFecharHistorico = document.getElementById("btn-fechar-historico");
const btnLimparHistorico = document.getElementById("btn-limpar-historico");

btnHistorico.addEventListener("click", async () => {
  modalHistorico.classList.add("active");
  await carregarHistorico();
});

btnFecharHistorico.addEventListener("click", () => {
  modalHistorico.classList.remove("active");
});

async function carregarHistorico() {
  listaArquivados.innerHTML = "<p style='text-align:center;color:#666;'>Carregando histórico...</p>";
  const snap = await getDocs(collection(db, "arquivados"));
  const itens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!itens.length) {
    listaArquivados.innerHTML = "<p style='text-align:center;color:#999;'>Nenhum produto arquivado.</p>";
    return;
  }

  listaArquivados.innerHTML = itens.map(p => `
    <div class="result-item" data-id="${p.id}">
      <img src="${p.imagem_base64 || ''}" class="result-thumb">
      <div class="result-meta">
        <b>${p.nome}</b>
        <small>Compra: R$ ${p.preco_custo?.toFixed(2)} | Venda: R$ ${p.preco_venda?.toFixed(2)}</small><br>
        <small>Arquivado em: ${new Date(p.data_arquivado).toLocaleDateString()}</small>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn-editar" data-id="${p.id}">✏️</button>
        <button class="btn-remover" data-id="${p.id}">🗑️</button>
      </div>
    </div>
  `).join("");

  // deletar individualmente
  document.querySelectorAll(".btn-remover").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.target.dataset.id;
      if (!confirm("Excluir este produto arquivado?")) return;
      await deleteDoc(doc(db, "arquivados", id));
      carregarHistorico();
    });
  });

  // editar (recompra)
  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.target.dataset.id;
      const ref = doc(db, "arquivados", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const p = snap.data();

      // salva dados no localStorage para preencher o modal "Comprei"
      localStorage.setItem("recompra-produto", JSON.stringify({ ...p, id }));

      // redireciona para a página principal e abre o modal de compra
      window.location.href = "index.html#comprei";
    });
  });
}

// botão limpar histórico (todos)
btnLimparHistorico.addEventListener("click", async () => {
  if (!confirm("Tem certeza que deseja limpar todo o histórico de produtos arquivados?")) return;
  const snap = await getDocs(collection(db, "arquivados"));
  for (const docu of snap.docs) {
    await deleteDoc(doc(db, "arquivados", docu.id));
  }
  alert("🧹 Histórico limpo com sucesso!");
  listaArquivados.innerHTML = "";
});




