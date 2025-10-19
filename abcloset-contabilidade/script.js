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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { FIREBASE_CONFIG } from "./config.js";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

function formatCurrencyBR(value) {
  return "R$ " + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

async function initVendi(db) {
  const searchEl = document.getElementById("vendi-search");
  const resultsEl = document.getElementById("vendi-results");
  const cartEl = document.getElementById("vendi-cart");
  const totalEl = document.getElementById("vendi-total");
  const obsEl = document.getElementById("vendi-observacao");
  const statusEl = document.getElementById("vendi-status");
  const btnFinalizar = document.getElementById("btn-finalizar-venda");
  const btnLimpar = document.getElementById("btn-limpar-carrinho");

  let allProducts = [];
  let cart = [];

  async function fetchProducts() {
    resultsEl.innerHTML = "Carregando produtos...";
    try {
      const snapshot = await getDocs(collection(db, "produtos"));
      allProducts = snapshot.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
      allProducts = allProducts.map(p => ({
        id: p.id,
        nome: p.nome || p.name || "Sem nome",
        preco_venda: ("preco_venda" in p) ? Number(p.preco_venda) : (p.precoVenda ? Number(p.precoVenda) : 0),
        preco_custo: ("preco_custo" in p) ? Number(p.preco_custo) : (p.precoCusto ? Number(p.precoCusto) : 0),
        quantidade: ("quantidade" in p) ? Number(p.quantidade) : (p.qty ? Number(p.qty) : 0),
        imagem_base64: p.imagem_base64 || p.imagem || null,
        raw: p
      }));
      renderResults(allProducts.slice(0,50));
      statusEl.textContent = "";
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      resultsEl.innerHTML = "Erro ao carregar produtos.";
      statusEl.textContent = "Erro ao carregar produtos. Veja console.";
    }
  }

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
      div.addEventListener("click", () => addToCart(prod.id));
      resultsEl.appendChild(div);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  searchEl.addEventListener("input", (e) => {
    const q = (e.target.value || "").trim().toLowerCase();
    if (!q) return renderResults(allProducts.slice(0,50));
    const filtered = allProducts.filter(p => (p.nome || "").toLowerCase().includes(q));
    renderResults(filtered.slice(0,100));
  });

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

  // 🔹 Modal de visualização de imagem ampliada
  const modalView = document.getElementById("modal-view-image");
  const viewImage = document.getElementById("view-image");
  const btnFecharView = document.getElementById("btn-fechar-view");
  
  function abrirImagemProduto(src) {
    viewImage.src = src;
    modalView.classList.add("active");
  }
  
  btnFecharView.addEventListener("click", () => {
    modalView.classList.remove("active");
  });
  
  // Fecha o modal clicando fora da imagem
  modalView.addEventListener("click", e => {
    if (e.target === modalView) {
      modalView.classList.remove("active");
    }
  });

  
  function renderCart() {
  const cartContainer = document.getElementById("vendi-cart");
  const totalEl = document.getElementById("vendi-total");
  cartContainer.innerHTML = "";

  if (!cart.length) {
    cartContainer.innerHTML = "<p style='text-align:center;color:#666;'>Carrinho vazio</p>";
    totalEl.textContent = "R$ 0,00";
    return;
  }

  let total = 0;

  cart.forEach((item, index) => {
    const li = document.createElement("div");
    li.className = "cart-item";
    li.innerHTML = `
      <img src="${item.imagem_base64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABfElEQVR4Xu3WsU3DMBQG4H9kE6gS6gV6gS6gS6gS6gTqgS6gU6g3kZpRz5cXjv3s7K3VwEAAAAAAAAAIDPqzv5s2f7x7Z3l7c0gY4g9rK4b8u3m1b6p1s5r6t4s8p7u6s7r8s+v7q7r8u9r8s+v7q7r8u9r8s+v7q7r8u9r8s+v7q7r8u9r8v+v7q7r8u9r8v+v7q7r8u9r8v8v6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3o+8u6w3oAAAAAElFTkSuQmCC'}"
           alt="${item.nome}"
           class="cart-thumb"
           style="width:50px;height:50px;border-radius:6px;cursor:pointer;">
      <div class="cart-meta">
        <b class="nome-produto">${item.nome}</b>
        <div class="cart-controls">
          <button class="btn-menor" data-index="${index}">–</button>
          <span>${item.qty}</span>
          <button class="btn-maior" data-index="${index}">+</button>
        </div>
      </div>
      <div class="cart-price">
        R$ ${(item.preco_venda * item.qty).toFixed(2)}
      </div>
    `;

    total += item.preco_venda * item.qty;
    cartContainer.appendChild(li);
  });

  totalEl.textContent = `R$ ${total.toFixed(2)}`;

  // botões + e -
  document.querySelectorAll(".btn-maior").forEach(btn => {
    btn.addEventListener("click", e => {
      const index = e.target.dataset.index;
      if (cart[index].qty < cart[index].quantidade) {
        cart[index].qty++;
        renderCart();
      } else {
        alert("Quantidade máxima em estoque atingida.");
      }
    });
  });

  document.querySelectorAll(".btn-menor").forEach(btn => {
    btn.addEventListener("click", e => {
      const index = e.target.dataset.index;
      if (cart[index].qty > 1) {
        cart[index].qty--;
      } else {
        cart.splice(index, 1);
      }
      renderCart();
    });
  });

  // abre imagem no modal
  document.querySelectorAll(".cart-thumb").forEach(img => {
    img.addEventListener("click", e => {
      abrirImagemProduto(e.target.src);
    });
  });
}

  

    totalEl.textContent = formatCurrencyBR(cart.reduce((s, it) => s + it.preco_venda * it.qty, 0));
  

  btnLimpar.addEventListener("click", () => {
    if (!confirm("Limpar carrinho?")) return;
    cart = [];
    renderCart();
  });

  // ✅ NOVO CÓDIGO DE FINALIZAÇÃO DE VENDA
  btnFinalizar.addEventListener("click", async () => {
    if (!cart.length) return alert("Carrinho vazio!");
    statusEl.textContent = "Processando venda...";

    try {
      for (const item of cart) {
        const produtoRef = doc(db, "produtos", item.id);
        const produtoSnap = await getDoc(produtoRef);

        if (!produtoSnap.exists()) {
          console.error(`Produto ${item.nome} não encontrado no banco de dados.`);
          continue;
        }

        const produtoData = produtoSnap.data();
        const novaQuantidade = produtoData.quantidade - item.qty;

        if (novaQuantidade < 0) {
          alert(`❗ Estoque insuficiente para o produto "${item.nome}".`);
          continue;
        }

        await updateDoc(produtoRef, { quantidade: novaQuantidade });

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
      statusEl.textContent = "";
      alert("✅ Venda registrada com sucesso!");

    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      alert("❌ Ocorreu um erro ao registrar a venda. Veja o console.");
    }
  });
  
  await fetchProducts();
  renderCart();
}

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


