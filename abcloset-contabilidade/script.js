// --- Firebase Core ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// --- Firestore ---
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


import { FIREBASE_CONFIG } from "./config.js";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
// IMPORTS NEEDED (certifique-se que já importou anteriormente no seu script):


function formatCurrencyBR(value) {
  return "R$ " + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

async function initVendi(db) {
  // DOM
  const searchEl = document.getElementById("vendi-search");
  const resultsEl = document.getElementById("vendi-results");
  const cartEl = document.getElementById("vendi-cart");
  const totalEl = document.getElementById("vendi-total");
  const obsEl = document.getElementById("vendi-observacao");
  const statusEl = document.getElementById("vendi-status");
  const btnFinalizar = document.getElementById("btn-finalizar-venda");
  const btnLimpar = document.getElementById("btn-limpar-carrinho");

  let allProducts = []; // cache local fetched from Firestore
  let cart = []; // items: {id, nome, preco_venda, preco_custo, quantidade, qty, imagem_base64}

  // Fetch products once (when modal becomes active, we can re-fetch if needed)
  async function fetchProducts() {
    resultsEl.innerHTML = "Carregando produtos...";
    try {
      const snapshot = await getDocs(collection(db, "produtos"));
      allProducts = snapshot.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
      // normalize fields names in case: preco_venda or precoVenda etc.
      allProducts = allProducts.map(p => ({
        id: p.id,
        nome: p.nome || p.name || "Sem nome",
        preco_venda: ("preco_venda" in p) ? Number(p.preco_venda) : (p.precoVenda ? Number(p.precoVenda) : 0),
        preco_custo: ("preco_custo" in p) ? Number(p.preco_custo) : (p.precoCusto ? Number(p.precoCusto) : 0),
        quantidade: ("quantidade" in p) ? Number(p.quantidade) : (p.qty ? Number(p.qty) : 0),
        imagem_base64: p.imagem_base64 || p.imagem || null,
        raw: p
      }));
      renderResults(allProducts.slice(0,50)); // show initial slice
      statusEl.textContent = "";
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      resultsEl.innerHTML = "Erro ao carregar produtos.";
      statusEl.textContent = "Erro ao carregar produtos. Veja console.";
    }
  }

  // Render list of results
  function renderResults(list) {
    if (!list.length) {
      resultsEl.innerHTML = "<div style='color:#666;padding:8px'>Nenhum produto encontrado</div>";
      return;
    }
    resultsEl.innerHTML = "";
    list.forEach(prod => {
      const div = document.createElement("div");
      div.className = "result-item";
      div.dataset.id = prod.id;
      div.innerHTML = `
        <img class="result-thumb" src="${prod.imagem_base64 ? prod.imagem_base64 : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABfElEQVR4Xu3WsU3DMBQG4H9kE6gS6gV6gS6gS6gS6gTqgS6gU6g3kZpRz5cXjv3s7K3VwEAAAAAAAAAIDPqzv5s2f7x7Z3l7c0gY4g9rK4b8u3m1b6p1s5r6t4s8p7u6s7r8s+v7q7r8u9r8s+v7q7r8u9r8s+v7q7r8u9r8s+v7q7r8u9r8v+v7q7r8u9r8v+v7q7r8u9r8v8v6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3oAAAAAElFTkSuQmCC'}" alt="thumb">
        <div class="result-meta">
          <b>${escapeHtml(prod.nome)}</b>
          <small>R$ ${Number(prod.preco_venda).toFixed(2)} • Qtd: ${prod.quantidade}</small>
        </div>
      `;
      // click to add to cart
      div.addEventListener("click", () => addToCart(prod.id));
      resultsEl.appendChild(div);
    });
  }

  // escape helper
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  // filter as user types
  searchEl.addEventListener("input", (e) => {
    const q = (e.target.value || "").trim().toLowerCase();
    if (!q) return renderResults(allProducts.slice(0,50));
    const filtered = allProducts.filter(p => (p.nome || "").toLowerCase().includes(q));
    renderResults(filtered.slice(0,100));
  });

  // add product to cart (qty default 1)
  function addToCart(productId) {
    const p = allProducts.find(x => x.id === productId);
    if (!p) return;
    const existing = cart.find(c => c.id === p.id);
    if (existing) {
      if (existing.qty + 1 > p.quantidade) {
        alert("Quantidade indisponível no estoque.");
        return;
      }
      existing.qty += 1;
    } else {
      if (p.quantidade <= 0) { alert("Produto sem estoque."); return; }
      cart.push({
        id: p.id,
        nome: p.nome,
        preco_venda: Number(p.preco_venda),
        preco_custo: Number(p.preco_custo),
        quantidade: Number(p.quantidade),
        qty: 1,
        imagem_base64: p.imagem_base64
      });
    }
    renderCart();
  }

  // render cart
  function renderCart() {
    cartEl.innerHTML = "";
    if (!cart.length) {
      cartEl.innerHTML = "<div style='color:#666'>Carrinho vazio</div>";
      totalEl.textContent = "R$ 0,00";
      return;
    }
    let total = 0;
    cart.forEach(item => {
      const div = document.createElement("div");
      div.className = "cart-item";
      const thumb = `<img class="cart-thumb" src="${item.imagem_base64 ? item.imagem_base64 : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABfElEQVR4Xu3WsU3DMBQG4H9kE6gS6gV6gS6gS6gS6gTqgS6gU6g3kZpRz5cXjv3s7K3VwEAAAAAAAAAIDPqzv5s2f7x7Z3l7c0gY4g9rK4b8u3m1b6p1s5r6t4s8p7u6s7r8s+v7q7r8u9r8s+v7q7r8u9r8s+v7q7r8u9r8s+v7q7r8u9r8v+v7q7r8u9r8v+v7q7r8u9r8v8v6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3oAAAAAElFTkSuQmCC'}" />`;
      div.innerHTML = `
        ${thumb}
        <div class="cart-meta">
          <div><b>${escapeHtml(item.nome)}</b></div>
          <div>R$ ${item.preco_venda.toFixed(2)}</div>
        </div>
        <div class="cart-qty">
          <button data-action="dec" data-id="${item.id}">-</button>
          <input type="number" min="1" max="${item.quantidade}" value="${item.qty}" data-id="${item.id}">
          <button data-action="inc" data-id="${item.id}">+</button>
        </div>
        <div style="width:80px;text-align:right">
          <div>R$ ${(item.preco_venda * item.qty).toFixed(2)}</div>
          <button data-action="remove" data-id="${item.id}">✖</button>
        </div>
      `;
      // attach events for buttons/inputs after append
      cartEl.appendChild(div);
    });
    // attach delegated listeners
    cartEl.querySelectorAll("button[data-action]").forEach(b => {
      b.addEventListener("click", () => {
        const action = b.dataset.action;
        const id = b.dataset.id;
        const item = cart.find(c => c.id === id);
        if (!item) return;
        if (action === "inc") {
          if (item.qty + 1 > item.quantidade) { alert("Estoque insuficiente"); return; }
          item.qty++;
        } else if (action === "dec") {
          if (item.qty > 1) item.qty--;
        } else if (action === "remove") {
          cart = cart.filter(c => c.id !== id);
        }
        renderCart();
      });
    });
    cartEl.querySelectorAll("input[type=number][data-id]").forEach(inp => {
      inp.addEventListener("change", () => {
        const id = inp.dataset.id;
        const item = cart.find(c => c.id === id);
        let val = parseInt(inp.value) || 1;
        if (val < 1) val = 1;
        if (val > item.quantidade) { alert("Quantidade maior que estoque"); val = item.quantidade; }
        item.qty = val;
        renderCart();
      });
    });

    // compute total
    total = cart.reduce((s, it) => s + it.preco_venda * it.qty, 0);
    totalEl.textContent = formatCurrencyBR(total);
  }

  // clear cart
  btnLimpar.addEventListener("click", () => {
    if (!confirm("Limpar carrinho?")) return;
    cart = [];
    renderCart();
  });

  // finalize sale: create lancamentos and decrement estoque (transactional)
  // finalize sale: create lancamentos and decrement estoque (transactional)
  btnFinalizar.addEventListener("click", async () => {
    if (!cart.length) return alert("Carrinho vazio!");
    statusEl.textContent = "Processando venda...";

    try {
      // --- Atualiza o estoque de cada produto dentro de uma transação ---
      await runTransaction(db, async (transaction) => {
        // 🔹 Primeiro: ler todos os produtos
        const produtosSnapshot = await Promise.all(
          cart.map(item => transaction.get(doc(db, "produtos", item.id)))
        );

        // 🔹 Verificar e calcular novas quantidades
        const atualizacoes = [];
        for (let i = 0; i < cart.length; i++) {
          const item = cart[i];
          const snap = produtosSnapshot[i];

          if (!snap.exists()) {
            throw new Error(`Produto não encontrado: ${item.nome}`);
          }

          const dados = snap.data();
          const novaQuantidade = dados.quantidade - item.qty;

          if (novaQuantidade < 0) {
            throw new Error(`Estoque insuficiente para ${item.nome}`);
          }

          atualizacoes.push({ ref: snap.ref, novaQuantidade });
        }

        // 🔹 Depois: aplicar todas as atualizações
        atualizacoes.forEach(u => {
          transaction.update(u.ref, { quantidade: u.novaQuantidade });
        });
      });

      // --- Cria os registros de venda (lançamentos) após atualizar o estoque ---
      for (const item of cart) {
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

      statusEl.textContent = "✅ Venda registrada com sucesso!";
      cart = [];
      renderCart();
    } catch (err) {
      console.error("Erro ao finalizar venda:", err);
      alert("Erro ao finalizar venda: " + (err.message || err));
      statusEl.textContent = "❌ Erro na finalização: " + (err.message || "");
    }
  });


  // initialize: fetch products when modal vended opened
  // If modal toggling is handled elsewhere, just fetch once now
  await fetchProducts();
  renderCart();
}

// call initVendi(db) after db exists and DOM loaded
// in your script.js (after db init) add:
initVendi(db).catch(e => console.error("initVendi erro:", e));


document.addEventListener("DOMContentLoaded", () => {
  const selectTipo = document.getElementById("tipo");
  const modais = {
    vendi: document.getElementById("modal-vendi"),
    comprei: document.getElementById("modal-comprei"),
    paguei: document.getElementById("modal-paguei"),
  };

  // 🎥 --- CAPTURA DE IMAGEM ---
  const inputCamera = document.createElement("input");
  inputCamera.type = "file";
  inputCamera.accept = "image/*";
  inputCamera.capture = "camera";
  inputCamera.style.display = "none";
  document.body.appendChild(inputCamera);

  const btnCamera = document.getElementById("btn-camera");
  const previewModal = document.getElementById("preview-modal");
  const previewImage = document.getElementById("preview-image");
  const btnUsar = document.getElementById("btn-usar");
  const btnCancelar = document.getElementById("btn-cancelar");

  let imagemBase64 = null; // 🔸 guardará a imagem comprimida

  btnCamera.addEventListener("click", () => inputCamera.click());

  inputCamera.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 🔧 Comprimir imagem antes de exibir e salvar
    const compressedBase64 = await compressImage(file, 800, 0.7);
    previewImage.src = compressedBase64;
    previewModal.classList.add("active");
  });

  // 📸 BOTÃO CANCELAR
  btnCancelar.addEventListener("click", () => {
    previewModal.classList.remove("active");
    inputCamera.value = "";
    imagemBase64 = null;
  });

  // 📤 BOTÃO USAR ESTA: apenas confirma e guarda em memória
  btnUsar.addEventListener("click", () => {
    imagemBase64 = previewImage.src; // guarda base64
    previewModal.classList.remove("active");
    alert("📸 Imagem pronta para envio!");
  });

  // 🧾 BOTÃO REGISTRAR: envia tudo para o Firestore
 const btnRegistrar = document.getElementById("btn-registrar");

  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", async () => {
      try {
        const nome = document.getElementById("produto-nome")?.value || "";
        const precoCusto = parseFloat(document.getElementById("produto-custo")?.value) || 0;
        const precoVenda = parseFloat(document.getElementById("produto-venda")?.value) || 0;
        const quantidade = parseInt(document.getElementById("produto-quantidade")?.value) || 0;

        if (!nome) return alert("❗Informe o nome do produto antes de registrar.");
        if (!imagemBase64) return alert("❗Você precisa selecionar uma imagem antes de registrar.");

        await addDoc(collection(db, "produtos"), {
          nome,
          preco_custo: precoCusto,
          preco_venda: precoVenda,
          quantidade,
          imagem_base64: imagemBase64,
          data_cadastro: new Date().toISOString(),
        });

        alert("✅ Produto registrado com sucesso!");
        imagemBase64 = null;
        inputCamera.value = "";
      } catch (err) {
        console.error("Erro ao salvar produto:", err);
        alert("❌ Falha ao salvar produto. Veja o console para detalhes.");
      }
    });
  } else {
    console.warn("⚠️ Botão 'btn-registrar' não encontrado no DOM.");
  }


  // 🧭 Alternar modais
 function atualizarModal() {
  const tipoSelecionado = selectTipo.value;
  Object.entries(modais).forEach(([tipo, modal]) => {
    if (modal) {
      modal.classList.remove("active");
      if (tipo === tipoSelecionado) modal.classList.add("active");
    }
  });
}


  selectTipo.addEventListener("change", atualizarModal);
  selectTipo.value = "vendi";
  atualizarModal();
});

// 🧠 Função utilitária para comprimir imagem
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

        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}




