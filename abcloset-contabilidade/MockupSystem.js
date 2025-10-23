// --- MockupSystem.js ---
// Sistema modular do Mockup de Celular + Botão flutuante + Sons + Vídeo tutorial

class MockupSystem {
  constructor(config = {}) {
    // Caminhos de áudio e vídeo (padrões)
    this.toneIn = config.toneIn || "./tone.mp3";
    this.toneOut = config.toneOut || "./enot.mp3";
    this.defaultVideo = config.defaultVideo || "./bemVindo.mp4";

    // Criação automática dos elementos
    this.createHTML();
    this.addEvents();
  }

  // 🎨 Cria o HTML do mockup e do botão flutuante
  createHTML() {
    // Botão flutuante
    this.btn = document.createElement("button");
    this.btn.id = "btn-ajuda";
    this.btn.className = "btn-ajuda";
    this.btn.textContent = "🙋";
    document.body.appendChild(this.btn);

    // Estrutura do modal + mockup
    this.modal = document.createElement("div");
    this.modal.id = "phoneModal";
    this.modal.className = "modal-mockup";
    this.modal.innerHTML = `
      <div class="modal-content">
        <div class="phone-mockup">
          <div class="phone-top-bar"></div>
          <div class="phone-screen">
            <span class="close-btn" id="closeModalBtn">&times;</span>
            <video id="mockup-video" width="100%" height="100%" controls>
              <source src="${this.defaultVideo}" type="video/mp4">
              Seu navegador não suporta o elemento de vídeo.
            </video>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);

    // Referências
    this.video = this.modal.querySelector("#mockup-video");
    this.closeBtn = this.modal.querySelector("#closeModalBtn");
  }

  // 🎧 Gerenciador de som
  playSound(file) {
    const audio = new Audio(file);
    audio.volume = 0.4;
    audio.currentTime = 0;
    audio.play();
  }

  // 📱 Abre o mockup com animação e som
  open(videoSrc) {
    this.modal.style.display = "flex";
    this.playSound(this.toneIn);
    if (navigator.vibrate) navigator.vibrate(80);

    if (videoSrc) {
      this.video.src = videoSrc;
    }
    this.video.play();
  }

  // ❌ Fecha o mockup com som e pausa o vídeo
  close() {
    this.modal.style.display = "none";
    this.playSound(this.toneOut);
    if (navigator.vibrate) navigator.vibrate([40, 50, 30]);
    this.video.pause();
  }

  // ⚙️ Configura todos os eventos
  addEvents() {
    // Abrir
    this.btn.addEventListener("click", () => this.open());

    // Fechar pelo X
    this.closeBtn.addEventListener("click", () => this.close());

    // Fechar clicando fora
    window.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }
}

// Cria uma instância global
window.AppMockup = new MockupSystem();
