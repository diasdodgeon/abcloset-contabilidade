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
btnCamera.addEventListener("click", () => {
inputCamera.click();
});

inputCamera.addEventListener("change", (event) => {
const file = event.target.files[0];
if (file) {
alert(`📷 Foto capturada: ${file.name}`);

```
  // 🔧 FUTURO: upload automático para GitHub
  // uploadToGitHub(file);
}
```

};

// Exibe o modal correspondente
function atualizarModal() {
const tipoSelecionado = selectTipo.value;

```
Object.keys(modais).forEach((tipo) => {
  modais[tipo].classList.toggle("active", tipo === tipoSelecionado);
});
```

}

// Evento de troca de tipo
selectTipo.addEventListener("change", atualizarModal);

// Garante que "vendi" esteja ativo ao recarregar
selectTipo.value = "vendi";
atualizarModal();
});
