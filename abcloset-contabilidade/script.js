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

