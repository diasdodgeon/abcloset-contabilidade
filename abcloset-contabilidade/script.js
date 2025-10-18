import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./config.js";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

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
  inputCamera.capture = "environment"; // usa câmera traseira no celular
  inputCamera.style.display = "none";
  document.body.appendChild(inputCamera);

  const btnCamera = document.getElementById("btn-camera");
  const previewModal = document.getElementById("preview-modal");
  const previewImage = document.getElementById("preview-image");
  const btnUsar = document.getElementById("btn-usar");
  const btnCancelar = document.getElementById("btn-cancelar");

  let imagemBase64 = null;

  // Função para comprimir imagem
  async function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => (img.src = e.target.result);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", quality);
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
  }

  // 📸 Ao clicar em tirar foto
  btnCamera.addEventListener("click", () => inputCamera.click());

  // 📷 Após selecionar foto
  inputCamera.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Comprime e converte em Base64
    imagemBase64 = await compressImage(file, 800, 0.7);

    // Mostra preview no modal
    previewImage.src = imagemBase64;
    previewModal.classList.add("active");
  });

  // ❌ BOTÃO CANCELAR
  btnCancelar.addEventListener("click", () => {
    previewModal.classList.remove("active");
    inputCamera.value = "";
    imagemBase64 = null;
  });

  // ✅ BOTÃO USAR ESTA
  btnUsar.addEventListener("click", async () => {
    if (!imagemBase64) {
      alert("Tire uma foto antes de continuar!");
      return;
    }

    try {
      // Coleta os dados do formulário "comprei"
      const nome = document.getElementById("produto-nome").value.trim();
      const precoCusto = parseFloat(document.getElementById("produto-custo").value);
      const precoVenda = parseFloat(document.getElementById("produto-venda").value);
      const quantidade = parseInt(document.getElementById("produto-quantidade").value);

      if (!nome || isNaN(precoCusto) || isNaN(precoVenda) || isNaN(quantidade)) {
        alert("Preencha todos os campos antes de salvar!");
        return;
      }

      // Grava no Firestore
      await addDoc(collection(db, "produtos"), {
        nome,
        preco_custo: precoCusto,
        preco_venda: precoVenda,
        quantidade,
        imagem_base64: imagemBase64,
        data_cadastro: new Date().toISOString(),
      });

      alert("✅ Produto salvo com sucesso!");
      previewModal.classList.remove("active");
      inputCamera.value = "";
      imagemBase64 = null;
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      alert("❌ Ocorreu um erro ao salvar o produto. Verifique o console.");
    }
  });

  // 🧭 Alternar modais (vendi/comprei/paguei)
  function atualizarModal() {
    const tipoSelecionado = selectTipo.value;
    Object.keys(modais).forEach((tipo) => {
      modais[tipo].classList.toggle("active", tipo === tipoSelecionado);
    });
  }

  selectTipo.addEventListener("change", atualizarModal);
  selectTipo.value = "vendi";
  atualizarModal();
});
