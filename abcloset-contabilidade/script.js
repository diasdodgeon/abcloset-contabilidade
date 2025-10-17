document.addEventListener("DOMContentLoaded", () => {
  const selectTipo = document.getElementById("tipo");
  const modais = {
    vendi: document.getElementById("modal-vendi"),
    comprei: document.getElementById("modal-comprei"),
    paguei: document.getElementById("modal-paguei"),
  };

  // Cria input oculto para captura de imagem
  const inputCamera = document.createElement("input");
  inputCamera.type = "file";
  inputCamera.accept = "image/*";
  inputCamera.capture = "camera";
  inputCamera.style.display = "none";
  document.body.appendChild(inputCamera);

  const btnCamera = document.getElementById("btn-camera");
  const previewModal = document.createElement("div");
  previewModal.classList.add("preview-modal");
  previewModal.innerHTML = `
    <div class="preview-content">
      <img id="preview-img" src="" alt="Pré-visualização">
      <button id="btn-usar-foto">Usar esta</button>
    </div>
  `;
  document.body.appendChild(previewModal);

  // Clicar no botão da câmera → abre a câmera
  btnCamera.addEventListener("click", () => {
    inputCamera.click();
  });

  // Quando a foto é capturada
  inputCamera.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewImg = document.getElementById("preview-img");
        previewImg.src = e.target.result;
        previewModal.classList.add("active");
      };
      reader.readAsDataURL(file);

      const btnUsarFoto = document.getElementById("btn-usar-foto");
      btnUsarFoto.onclick = () => {
        previewModal.classList.remove("active");
        alert("📸 Foto registrada com sucesso!");
        // 🔧 Aqui depois: uploadToGitHub(file);
      };
    }
  });

  // Alterna modais conforme o tipo selecionado
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


