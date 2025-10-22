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
        quantidade: ("quantidade" in p) ? Number(p.quantidade) : (p.qty ? Number(p.qty) : 1),
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
    cartContainer.innerHTML = "<p style='text-align:center;color:#666;'>Recibo vazio, selecione os produtos acima.</p>";
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
    if (!confirm("Limpar recibo?")) return;
    cart = [];
    renderCart();
  });

  // ✅ CÓDIGO DE FINALIZAÇÃO DE VENDA
  btnFinalizar.addEventListener("click", async () => {
    if (!cart.length) return alert("Recibo vazio!");
    statusEl.textContent = "Processando venda...";
  
    try {
      for (const item of cart) {
        const produtoRef = doc(db, "produtos", item.id);
        const produtoSnap = await getDoc(produtoRef);
  
        if (!produtoSnap.exists()) continue;
  
        const produtoData = produtoSnap.data();
        const novaQuantidade = produtoData.quantidade - item.qty;
  
        if (novaQuantidade < 0) {
          alert(`❗ Estoque insuficiente para o produto "${item.nome}".`);
          continue;
        }
  
        if (novaQuantidade > 0) {
          await updateDoc(produtoRef, { quantidade: novaQuantidade });
        } else {
          // 🔹 move produto para "arquivados"
          await addDoc(collection(db, "arquivados"), {
            ...produtoData,
            quantidade: 0,
            data_arquivado: new Date().toISOString()
          });
          await deleteDoc(produtoRef);
          console.log(`📦 Produto "${item.nome}" movido para 'arquivados'.`);
        }
  
        // 🔹 registra lançamento da venda
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
      await fetchProducts(); // atualiza a lista
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

// === Função moderna de notificação com som ===
function mostrarToast(mensagem, duracao = 4000) {
  // Remove toasts antigos
  const antigo = document.querySelector(".toast");
  if (antigo) antigo.remove();

  // Cria o elemento
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = mensagem;
  document.body.appendChild(toast);

  // Anima a entrada
  setTimeout(() => toast.classList.add("show"), 200);

  // Toca o som 🎵
  const audio = new Audio("./Cash.mp3");
  audio.volume = 0.5;
  audio.play().catch(err =>
    console.warn("Som bloqueado até interação do usuário:", err)
  );

  // Remove após alguns segundos
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, duracao);
}

  
  // verifica se veio de uma recompra
const produtoRecompra = localStorage.getItem("recompra-produto");
if (produtoRecompra) {
  const p = JSON.parse(produtoRecompra);
  document.getElementById("produto-nome").value = p.nome;
  document.getElementById("produto-custo").value = p.preco_custo;
  document.getElementById("produto-venda").value = p.preco_venda;
  previewImage.src = p.imagem_base64 || "";
  imagemBase64 = p.imagem_base64 || null;
  localStorage.removeItem("recompra-produto");
// força o modal "comprei" a abrir
  document.getElementById("tipo").value = "comprei";
  
  // ✅ Força abertura automática e mostra alerta visual com som
  if (typeof atualizarModal === "function") {
    selectTipo.value = "comprei";
    atualizarModal();
    mostrarToast("🙋 O formulário está pronto para recompra ❗");
  } else {
    window.addEventListener("load", () => {
      const tipoSel = document.getElementById("tipo");
      tipoSel.value = "comprei";
      const evt = new Event("change");
      tipoSel.dispatchEvent(evt);
      mostrarToast("🙋 O formulário está pronto para recompra ❗");
    });
  }
  
  }

  
  // 🧾 BOTÃO REGISTRAR: envia tudo para o Firestore
 const btnRegistrar = document.getElementById("btn-registrar");
  
  // === BUSCA DINÂMICA PARA COMPRAS E REPOSIÇÃO ===
  const nomeInput = document.getElementById("produto-nome");
  const chkReposicao = document.getElementById("chk-reposicao");
  const sugestoesEl = document.createElement("div");
  sugestoesEl.id = "sugestoes-arquivados";
  sugestoesEl.className = "lista-resultados";
  nomeInput.parentNode.insertBefore(sugestoesEl, nomeInput.nextSibling);
  
  let timerBusca = null;
  let modoReposicao = false;
  let produtoSelecionado = null;
  
  if (chkReposicao) {
    chkReposicao.addEventListener("change", () => {
      modoReposicao = chkReposicao.checked;
      sugestoesEl.innerHTML = "";
      produtoSelecionado = null;
    });
  }
  
  nomeInput.addEventListener("input", async () => {
    clearTimeout(timerBusca);
    const termo = nomeInput.value.trim().toLowerCase();
    if (!termo) {
      sugestoesEl.innerHTML = "";
      produtoSelecionado = null;
      return;
    }
  
    timerBusca = setTimeout(async () => {
      const colecao = modoReposicao ? "produtos" : "arquivados";
      const snapshot = await getDocs(collection(db, colecao));
      const todos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtrados = todos.filter(p =>
        (p.nome || "").toLowerCase().includes(termo)
      );
  
      if (!filtrados.length) {
        sugestoesEl.innerHTML = "";
        return;
      }
  
      sugestoesEl.innerHTML = filtrados
        .slice(0, 5)
        .map(
          p => `
          <div class="result-item" data-id="${p.id}">
            <img src="${p.imagem_base64 || ''}" class="result-thumb" />
            <div class="result-meta">
              <b>${p.nome}</b>
              <small>
                Compra: R$ ${Number(p.preco_custo).toFixed(2)} |
                Venda: R$ ${Number(p.preco_venda).toFixed(2)}
              </small>
            </div>
          </div>`
        )
        .join("");
  
      sugestoesEl.querySelectorAll(".result-item").forEach(el => {
        el.addEventListener("click", async () => {
          const id = el.dataset.id;
          const produtoSel = filtrados.find(p => p.id === id);
          if (!produtoSel) return;
  
          produtoSelecionado = { ...produtoSel, colecao };
  
          nomeInput.value = produtoSel.nome;
          document.getElementById("produto-custo").value = produtoSel.preco_custo;
          document.getElementById("produto-venda").value = produtoSel.preco_venda;
          imagemBase64 = produtoSel.imagem_base64 || null;
          previewImage.src = imagemBase64 || "";
          sugestoesEl.innerHTML = "";
        });
      });
    }, 300);
  });



  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", async () => {
      try {
        const nome = document.getElementById("produto-nome")?.value.trim() || "";
        const precoCusto = parseFloat(document.getElementById("produto-custo")?.value) || 0;
        const precoVenda = parseFloat(document.getElementById("produto-venda")?.value) || 0;
        const quantidadeNova = parseInt(document.getElementById("produto-quantidade")?.value) || 1;
  
        if (!nome) return alert("❗Informe o nome do produto antes de registrar.");
  
        // --- MODO REPOSIÇÃO ---
        if (chkReposicao && chkReposicao.checked && produtoSelecionado && produtoSelecionado.colecao === "produtos") {
          const ref = doc(db, "produtos", produtoSelecionado.id);
          const snap = await getDoc(ref);
          if (!snap.exists()) return alert("Produto não encontrado no estoque.");
  
          const antigo = snap.data();
          const qtdAntiga = parseInt(antigo.quantidade);
          const precoAntigo = parseFloat(antigo.preco_custo);
  
          const totalAntigo = qtdAntiga * precoAntigo;
          const totalNovo = quantidadeNova * precoCusto;
          const qtdTotal = qtdAntiga + quantidadeNova;
          const novoPrecoMedio = (totalAntigo + totalNovo) / qtdTotal;
  
          await updateDoc(ref, {
            quantidade: qtdTotal,
            preco_custo: parseFloat(novoPrecoMedio.toFixed(2)),
            preco_venda: precoVenda
          });
  
          alert("✅ Reposição registrada com sucesso (custo médio atualizado)!");
        }
        // --- MODO COMPRA NORMAL ---
        else {
          const arquivadosSnap = await getDocs(collection(db, "arquivados"));
          const arquivadoExistente = arquivadosSnap.docs.find(
            d => d.data().nome.toLowerCase() === nome.toLowerCase()
          );
  
          if (arquivadoExistente) {
            await deleteDoc(doc(db, "arquivados", arquivadoExistente.id));
            console.log(`♻️ Produto "${nome}" reativado a partir de 'arquivados'.`);
          }
  
          await addDoc(collection(db, "produtos"), {
            nome,
            preco_custo: precoCusto,
            preco_venda: precoVenda,
            quantidade: quantidadeNova,
            imagem_base64: imagemBase64 || "",
            data_cadastro: new Date().toISOString()
          });
  
          alert("✅ Produto registrado com sucesso!");
        }
  
        // 🔄 limpar campos
        imagemBase64 = null;
        inputCamera.value = "";
        previewImage.src = "";
        nomeInput.value = "";
        document.getElementById("produto-custo").value = "";
        document.getElementById("produto-venda").value = "";
        document.getElementById("produto-quantidade").value = "";
        sugestoesEl.innerHTML = "";
        produtoSelecionado = null;
        chkReposicao.checked = false;
  
      } catch (err) {
        console.error("Erro ao salvar produto:", err);
        alert("❌ Falha ao salvar produto. Veja o console para detalhes.");
      }
    });
  }else {
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
    if (produtoRecompra){
        selectTipo.value = "comprei";
        atualizarModal();
    }
    else{
      selectTipo.value = "vendi";
      atualizarModal();
    }
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

            // Pega os elementos do DOM
    const modal = document.getElementById("phoneModal");
    const openBtn = document.getElementById("ajuda-vendi");
    const closeBtn = document.getElementById("closeModalBtn");

    // Função para abrir o modal
    openBtn.onclick = function() {
        modal.style.display = "block";
        // Futuramente: Adicionar classe para animações
        // modal.classList.add('show');
    }

    // Função para fechar o modal ao clicar no botão 'X'
    closeBtn.onclick = function() {
        modal.style.display = "none";
        // Futuramente: Adicionar classe para animações
        // modal.classList.remove('show');
    }

    // Função para fechar o modal se o usuário clicar fora do conteúdo (no overlay)
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            // Opcional: Remover classe
            // modal.classList.remove('show');
        }
    }
     document.getElementById("ajuda-vendi").addEventListener("click", function() {
      document.getElementById("phoneModal").style.display = "flex";
      document.getElementById("video").play();
    });

    document.getElementById("closeModalBtn").addEventListener("click", function() {
      document.getElementById("phoneModal").style.display = "none";
      document.getElementById("video").pause();
    });


