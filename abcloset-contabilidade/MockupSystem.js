// --- MockupSystem.js ---
// Sistema modular do Mockup de Celular + Botão flutuante + Sons + Vídeo tutorial + Animações

class MockupSystem {
  constructor(config = {}) {
    this.toneIn = config.toneIn || "./tone.mp3";
    this.toneOut = config.toneOut || "./enot.mp3";
    this.defaultVideo = config.defaultVideo || "./bemVindo.mp4";

    // Garante que o HTML já esteja carregado antes de iniciar
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.createHTML();
    this.injectCSS();
    this.addEvents();
  }

  // 🎨 Cria toda a estrutura HTML
  createHTML() {
    const body = document.body;
    if (!body) return console.error("❌ document.body não disponível.");

    // Botão flutuante
    this.btn = document.createElement("button");
    this.btn.id = "btn-ajuda";
    this.btn.className = "btn-ajuda pulse";
    this.btn.textContent = "🙋";
    body.appendChild(this.btn);

    // Modal + Mockup
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
    body.appendChild(this.modal);

    // Referências
    this.video = this.modal.querySelector("#mockup-video");
    this.closeBtn = this.modal.querySelector("#closeModalBtn");
    this.phoneMockup = this.modal.querySelector(".phone-mockup");
  }

  // 🎧 Sons
  playSound(file) {
    const audio = new Audio(file);
    audio.volume = 0.4;
    audio.currentTime = 0;
    audio.play();
  }

  // 📱 Abrir mockup com animação
  open(videoSrc) {
    this.modal.style.display = "flex";
    requestAnimationFrame(() => {
      this.phoneMockup.classList.add("fade-in");
      this.phoneMockup.classList.remove("fade-out");
    });
    this.playSound(this.toneIn);
    if (navigator.vibrate) navigator.vibrate(80);
    if (videoSrc) this.video.src = videoSrc;
    this.video.play();
  }

  // ❌ Fechar mockup com fade-out suave
  close() {
    this.phoneMockup.classList.remove("fade-in");
    this.phoneMockup.classList.add("fade-out");
    this.playSound(this.toneOut);
    if (navigator.vibrate) navigator.vibrate([40, 50, 30]);
    this.video.pause();

    // Aguarda o fade-out antes de ocultar
    setTimeout(() => {
      this.modal.style.display = "none";
    }, 400);
  }

  // ⚙️ Eventos principais
  addEvents() {
    this.btn.addEventListener("click", () => this.open());
    this.closeBtn.addEventListener("click", () => this.close());
    window.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close();
    });
     setTimeout(() => {
    const openBtn = document.getElementById("btn-ajuda");
    const closeBtn = document.getElementById("closeModalBtn");
    if (openBtn && closeBtn) {
      openBtn.onclick = () => AppMockup.open();
      closeBtn.onclick = () => AppMockup.close();
    }
  }, 200);

  }
 
  // 🌀 CSS Animations e estilo moderno
  injectCSS() {
    const style = document.createElement("style");
    style.textContent = `
      /* Fade In / Fade Out */
      .fade-in {
        opacity: 0;
        transform: scale(0.9);
        animation: fadeInMockup 0.5s forwards ease;
      }
      .fade-out {
        opacity: 1;
        transform: scale(1);
        animation: fadeOutMockup 0.4s forwards ease;
      }

      @keyframes fadeInMockup {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes fadeOutMockup {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
      }

      /* Botão flutuante com animação de pulsar */
      .btn-ajuda {
        position: fixed;
        bottom: 80px;
        right: 20px;
        font-size: 26px;
        background: #0a3d91;
        color: white;
        border: none;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        cursor: pointer;
        z-index: 1000;
        transition: transform 0.2s ease;
      }
      .btn-ajuda:hover {
        transform: scale(1.1);
      }
      .pulse {
        animation: pulseGlow 2.5s infinite ease-in-out;
      }
      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 0px rgba(10,61,145,0.8);
          transform: scale(1);
        }
        50% {
          box-shadow: 0 0 25px rgba(10,61,145,0.9);
          transform: scale(1.05);
        }
      }

      /* Modal e Mockup */
      .modal-mockup {
        display: none;
        position: fixed;
        z-index: 999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.6);
        backdrop-filter: blur(5px);
        justify-content: center;
        align-items: center;
      }
      .modal-content {
        background: transparent;
        border: none;
      }
      .phone-mockup {
        border: 10px solid #222;
        border-radius: 40px;
        box-shadow: 0 0 0 1px #444, 0 0 30px rgba(0,0,0,0.5);
        background-color: #333;
        padding: 5px;
        width: 320px;
        max-width: 90%;
      }
      .phone-screen {
        background-color: white;
        width: 100%;
        height: 640px;
        border-radius: 30px;
        overflow: hidden;
        position: relative;
      }
      .close-btn {
        color: #aaa;
        position: absolute;
        top: 10px;
        right: 15px;
        font-size: 34px;
        font-weight: bold;
        cursor: pointer;
        z-index: 2;
      }
      .close-btn:hover {
        color: black;
      }
    `;
    document.head.appendChild(style);
  }
}

// ✅ Inicializa automaticamente
document.addEventListener("DOMContentLoaded", () => {
  window.AppMockup = new MockupSystem();
});



