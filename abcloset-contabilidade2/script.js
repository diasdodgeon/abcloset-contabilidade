// script.js (modular; roda no navegador)
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

// Import modular SDK (dinâmico - carregamos via ESM no navegador)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, where, doc,
  runTransaction, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM
const tipoEl = document.getElementById('tipo');
const formArea = document.getElementById('form-area');
const enviarBtn = document.getElementById('enviar');
const limparBtn = document.getElementById('limpar');
const statusEl = document.getElementById('status');
const produtosListEl = document.getElementById('produtos-list');
const refreshBtn = document.getElementById('refreshProdutos');

let produtosCache = []; // cache local (produtos collection)
let carrinho = [];

// helpers
function ts(){ return new Date().toISOString(); }
function showStatus(txt, ok=true){ statusEl.textContent = txt; statusEl.style.color = ok? 'green' : 'crimson' }

// monta formulário dinâmico
tipoEl.addEventListener('change', () => {
  const tipo = tipoEl.value;
  formArea.innerHTML = '';
  carrinho = [];
  if(tipo === 'comprei'){
    formArea.innerHTML = `
      <div class="grid">
        <div>
          <label>Quantidade</label>
          <input id="c_quantidade" type="number" value="1" min="1">
        </div>
        <div>
          <label>Foto (URL opcional)</label>
          <input id="c_foto" type="text" placeholder="https://...">
        </div>
      </div>
      <label>Descrição (título do produto)</label>
      <input id="c_descricao" type="text" placeholder="Ex: Conjunto renda preta">
      <div class="grid">
        <div>
          <label>Preço de custo (R$)</label>
          <input id="c_preco_custo" type="number" step="0.01" min="0">
        </div>
        <div>
          <label>Preço de venda (R$)</label>
          <input id="c_preco_venda" type="number" step="0.01" min="0">
        </div>
      </div>
      <p class="small">Ao enviar, o produto será criado (ou atualizado se já existir pelo título) e o estoque será incrementado.</p>
    `;
  } else if(tipo === 'vendi'){
    formArea.innerHTML = `
      <label>Buscar produto (pelo título)</label>
      <input id="v_busca" type="text" placeholder="Digite para buscar...">
      <div id="listaProdutos"></div>
      <h4>Carrinho</h4>
      <div id="carrinho" class="carrinho">Carrinho vazio</div>
      <p id="totalVenda" class="small">Total: R$ 0.00</p>
      <p class="small">Selecione produtos da lista. Quantidade máxima = estoque disponível.</p>
    `;
    carregarProdutosParaVenda();
  } else if(tipo === 'paguei'){
    formArea.innerHTML = `
      <label>Descrição (ex: Aluguel)</label>
      <input id="d_descricao" type="text">
      <label>Valor (R$)</label>
      <input id="d_valor" type="number" step="0.01" min="0">
    `;
  }
});

// carregar lista de produtos (exibe área pública de estoque)
async function carregarProdutosPublic(){
  produtosListEl.textContent = 'Carregando...';
  try{
    const snap = await getDocs(collection(db, 'produtos'));
    produtosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if(produtosCache.length === 0){
      produtosListEl.innerHTML = '<p class="small muted">Nenhum produto cadastrado.</p>';
      return;
    }
    produtosListEl.innerHTML = '';
    produtosCache.forEach(p => {
      const el = document.createElement('div');
      el.className = 'produto-item';
      el.innerHTML = `
        <div class="produto-meta">
          <img src="${p.foto_url || ''}" alt="" onerror="this.style.display='none'">
          <div class="txt">
            <strong>${p.titulo}</strong>
            <span class="small">Qtd: ${p.quantidade || 0} — Custo: R$ ${Number(p.preco_custo||0).toFixed(2)} — Venda: R$ ${Number(p.preco_venda||0).toFixed(2)}</span>
          </div>
        </div>
        <div><button class="btn ghost" data-id="${p.id}">Editar</button></div>
      `;
      produtosListEl.appendChild(el);
    });
  }catch(e){
    console.error(e);
    produtosListEl.textContent = 'Erro ao carregar produtos';
  }
}

// carregar produtos para a tela de venda (busca)
async function carregarProdutosParaVenda(){
  const listaEl = document.getElementById('listaProdutos');
  const buscaEl = document.getElementById('v_busca');
  listaEl.innerHTML = 'Carregando...';
  try{
    const snap = await getDocs(collection(db, 'produtos'));
    produtosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaBusca('');
    buscaEl.addEventListener('input', (e) => renderListaBusca(e.target.value));
  }catch(e){
    console.error(e);
    listaEl.innerHTML = 'Erro ao carregar produtos';
  }
}

function renderListaBusca(term){
  const listaEl = document.getElementById('listaProdutos');
  listaEl.innerHTML = '';
  const termo = (term||'').toLowerCase();
  const encontrados = produtosCache.filter(p => p.titulo.toLowerCase().includes(termo));
  if(encontrados.length === 0){ listaEl.innerHTML = '<p class="small muted">Nenhum produto encontrado.</p>'; return; }
  encontrados.forEach(p => {
    const item = document.createElement('div');
    item.className = 'produto-item';
    item.innerHTML = `
      <div class="produto-meta">
        <img src="${p.foto_url||''}" alt="" onerror="this.style.display='none'">
        <div class="txt">
          <strong>${p.titulo}</strong>
          <span class="small">Qtd: ${p.quantidade || 0} — Venda: R$ ${Number(p.preco_venda||0).toFixed(2)}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="number" min="1" value="1" style="width:76px" class="sel-qtd" data-id="${p.id}">
        <button class="btn" data-id="${p.id}">Adicionar</button>
      </div>
    `;
    // adicionar handler
    item.querySelector('button').addEventListener('click', () => {
      const q = Number(item.querySelector('.sel-qtd').value) || 1;
      adicionarAoCarrinho(p, q);
    });
    listaEl.appendChild(item);
  });
}

function adicionarAoCarrinho(produto, quantidade){
  // encontra existente
  const exist = carrinho.find(x => x.id === produto.id);
  const disponivel = Number(produto.quantidade || 0);
  const atualQtd = exist ? exist.quantidade : 0;
  if(atualQtd + quantidade > disponivel){
    showStatus(`Quantidade insuficiente em estoque para ${produto.titulo}`, false);
    return;
  }
  if(exist) exist.quantidade += quantidade;
  else carrinho.push({
    id: produto.id,
    titulo: produto.titulo,
    preco_custo: Number(produto.preco_custo || 0),
    preco_venda: Number(produto.preco_venda || 0),
    quantidade: quantidade
  });
  atualizarCarrinhoUI();
}

function atualizarCarrinhoUI(){
  const carrinhoEl = document.getElementById('carrinho');
  const totalEl = document.getElementById('totalVenda');
  if(!carrinhoEl) return;
  carrinhoEl.innerHTML = '';
  if(carrinho.length===0){ carrinhoEl.textContent = 'Carrinho vazio'; totalEl.textContent = 'Total: R$ 0.00'; return; }
  let total = 0;
  carrinho.forEach(item => {
    total += item.preco_venda * item.quantidade;
    const row = document.createElement('div');
    row.className = 'carrinho-item';
    row.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center">
        <input type="number" min="1" value="${item.quantidade}" style="width:72px">
        <div><strong>${item.titulo}</strong><div class="small">R$ ${item.preco_venda.toFixed(2)} (vend.) | custo R$ ${item.preco_custo.toFixed(2)}</div></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="small">Subtotal R$ ${(item.preco_venda*item.quantidade).toFixed(2)}</div>
        <button class="btn ghost">Remover</button>
      </div>
    `;
    // handlers
    row.querySelector('input').addEventListener('input', (e) => {
      const v = Number(e.target.value) || 1;
      if(v < 1) { e.target.value = 1; return; }
      // verificar limite estoque
      const produtoEstoque = produtosCache.find(p => p.id === item.id);
      if(produtoEstoque && v > (produtoEstoque.quantidade || 0)){
        showStatus('Quantidade solicitada maior que estoque disponível', false);
        e.target.value = produtoEstoque.quantidade || 0;
        item.quantidade = produtoEstoque.quantidade || 0;
      } else {
        item.quantidade = v;
      }
      atualizarCarrinhoUI();
    });
    row.querySelector('button').addEventListener('click', () => {
      carrinho = carrinho.filter(c => c.id !== item.id);
      atualizarCarrinhoUI();
    });
    carrinhoEl.appendChild(row);
  });
  totalEl.textContent = `Total: R$ ${total.toFixed(2)}`;
}

// ENVIAR dados
enviarBtn.addEventListener('click', async () => {
  const tipo = tipoEl.value;
  if(!tipo){ showStatus('Escolha o tipo de lançamento', false); return; }
  showStatus('Processando...', true);

  try{
    if(tipo === 'comprei'){
      const quantidade = Number(document.getElementById('c_quantidade').value) || 1;
      const descricao = (document.getElementById('c_descricao').value || '').trim();
      const foto = (document.getElementById('c_foto').value || '').trim();
      const preco_custo = Number(document.getElementById('c_preco_custo').value) || 0;
      const preco_venda = Number(document.getElementById('c_preco_venda').value) || 0;
      if(!descricao || preco_custo <= 0){ showStatus('Descrição e preço de custo são obrigatórios', false); return; }

      // Procurar produto pelo título
      const q = query(collection(db, 'produtos'), where('titulo', '==', descricao));
      const snap = await getDocs(q);
      if(snap.empty){
        // cria novo produto
        const prodDoc = {
          titulo: descricao,
          preco_custo,
          preco_venda,
          quantidade,
          foto_url: foto || ''
        };
        await addDoc(collection(db, 'produtos'), prodDoc);
      } else {
        // atualiza primeiro documento encontrado -> incrementa quantidade e atualiza preços (assumimos apenas 1 com este titulo)
        const docRef = snap.docs[0].ref;
        const prev = snap.docs[0].data();
        const novaQtd = (prev.quantidade || 0) + quantidade;
        await updateDoc(docRef, {
          quantidade: novaQtd,
          preco_custo,
          preco_venda,
          foto_url: foto || prev.foto_url || ''
        });
      }

      // registra lançamento de compra
      await addDoc(collection(db, 'lancamentos'), {
        tipo: 'comprei',
        descricao,
        quantidade,
        preco_custo,
        preco_venda,
        total_custo: preco_custo * quantidade,
        timestamp: new Date().toISOString()
      });

      showStatus('Compra registrada com sucesso ✅', true);
      formArea.innerHTML = '';
      tipoEl.value = '';
      await carregarProdutosPublic();

    } else if(tipo === 'vendi'){
      if(carrinho.length === 0){ showStatus('Carrinho vazio', false); return; }

      // Para cada item do carrinho, executar transação: checar estoque e decrementar
      for(const item of carrinho){
        const prodRef = doc(db, 'produtos', item.id);
        await runTransaction(db, async (t) => {
          const prodSnap = await t.get(prodRef);
          if(!prodSnap.exists()) throw new Error('Produto inexistente: ' + item.titulo);
          const dados = prodSnap.data();
          const estoqueAtual = Number(dados.quantidade || 0);
          if(estoqueAtual < item.quantidade) throw new Error(`Estoque insuficiente para ${item.titulo}`);
          const novaQuantidade = estoqueAtual - item.quantidade;
          t.update(prodRef, { quantidade: novaQuantidade });
        });

        // registra lançamento de venda (por item)
        await addDoc(collection(db, 'lancamentos'), {
          tipo: 'vendi',
          descricao: item.titulo,
          produtoId: item.id,
          quantidade: item.quantidade,
          preco_custo: item.preco_custo,
          preco_venda: item.preco_venda,
          total_custo: item.preco_custo * item.quantidade,
          total_venda: item.preco_venda * item.quantidade,
          lucro: (item.preco_venda - item.preco_custo) * item.quantidade,
          timestamp: new Date().toISOString()
        });
      }

      // limpar carrinho e UI
      carrinho = [];
      atualizarCarrinhoUI();
      showStatus('Venda registrada com sucesso ✅', true);
      formArea.innerHTML = '';
      tipoEl.value = '';
      await carregarProdutosPublic();

    } else if(tipo === 'paguei'){
      const desc = (document.getElementById('d_descricao').value || '').trim();
      const valor = Number(document.getElementById('d_valor').value) || 0;
      if(!desc || valor <= 0){ showStatus('Descrição e valor são obrigatórios', false); return; }
      await addDoc(collection(db, 'lancamentos'), {
        tipo: 'paguei',
        descricao: desc,
        valor,
        timestamp: new Date().toISOString()
      });
      showStatus('Despesa registrada ✅', true);
      formArea.innerHTML = '';
      tipoEl.value = '';
    }

  }catch(err){
    console.error(err);
    showStatus('Erro: ' + (err.message || err), false);
  }
});

// atualizar lista pública
refreshBtn.addEventListener('click', carregarProdutosPublic);

// init
carregarProdutosPublic();
showStatus('Pronto ✅', true);
