
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { FIREBASE_CONFIG, GITHUB_CONFIG } from "./config.js";

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

  btnCamera.addEventListener("click", () => inputCamera.click());

  inputCamera.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewModal.classList.add("active");
    };
    reader.readAsDataURL(file);
  });

  // 📸 BOTÃO CANCELAR: fecha modal e libera nova foto
  btnCancelar.addEventListener("click", () => {
    previewModal.classList.remove("active");
    inputCamera.value = "";
  });

  // 📤 BOTÃO USAR ESTA: envia ao GitHub e grava no Firestore
  btnUsar.addEventListener("click", async () => {
    const base64Image = previewImage.src.split(",")[1];
    const nomeArquivo = `produto_${Date.now()}.jpg`;

    try {
      const githubResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_CONFIG.repoOwner}/${GITHUB_CONFIG.repoName}/contents/${nomeArquivo}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_CONFIG.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Adicionando ${nomeArquivo}`,
            content: base64Image,
          }),
        }
      );

      const data = await githubResponse.json();
      if (!data.content?.download_url) throw new Error("Erro ao enviar imagem");

      const imageUrl = data.content.download_url;

      // ✨ Grava produto no Firestore
      const nome = document.getElementById("produto-nome").value;
      const precoCusto = parseFloat(document.getElementById("produto-custo").value);
      const precoVenda = parseFloat(document.getElementById("produto-venda").value);
      const quantidade = parseInt(document.getElementById("produto-quantidade").value);

      await addDoc(collection(db, "produtos"), {
        nome,
        preco_custo: precoCusto,
        preco_venda: precoVenda,
        quantidade,
        imagem_url: imageUrl,
        data_cadastro: new Date().toISOString(),
      });

      alert("✅ Produto cadastrado com sucesso!");
      previewModal.classList.remove("active");
      inputCamera.value = "";
    } catch (err) {
      console.error("Erro:", err);
      alert("❌ Falha ao salvar produto. Verifique o console.");
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

