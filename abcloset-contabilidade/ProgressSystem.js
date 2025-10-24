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
// --- IMPORTA O MOCKUP ---
import { MockupSystem } from "./MockupSystem.js";

// --- SISTEMA DE PROGRESSO ---
export class ProgressSystem {
  constructor(db, userId) {
    this.db = db;
    this.userId = testeUsuario001;
    this.progressRef = doc(this.db, "progresso", this.userId);
    this.progresso = null;
  }

  // 🔹 Inicializa o progresso no Firestore, se não existir
  async init() {
    const snap = await getDoc(this.ref);
    if (!snap.exists()) {
      this.progresso = {
        primeira_visita: false,
        primeira_venda: false,
        primeira_compra: false,
        estoque_iniciado: false,
        historico_visto: false,
        ultimo_video_assistido: null,
        data_ultima_interacao: new Date().toISOString()
      };
      await setDoc(this.ref, this.progresso);
    } else {
      this.progresso = snap.data();
    }
  }

  // 🔹 Atualiza marca de progresso no Firestore
  async marcarConcluido(chave) {
    await updateDoc(this.ref, { [chave]: true });
    this.progresso[chave] = true;
  }

  // 🔹 Detecta onde o usuário está
  detectarContexto() {
    const url = window.location.pathname;
    const abaAtiva = document.querySelector(".aba-ativa")?.id || "inicio";

    if (url.includes("index.html")) return "inicio";
    if (url.includes("estoque.html")) return "estoque";
    if (abaAtiva.includes("vendi")) return "vendi";
    if (abaAtiva.includes("comprei")) return "comprei";
    if (abaAtiva.includes("paguei")) return "paguei";
    return "inicio";
  }

  // 🔹 Exibe o tutorial correspondente
  async exibirTutorialSeNecessario() {
    const contexto = this.detectarContexto();

    // garante que o progresso foi carregado
    if (!this.progresso) await this.init();

    switch (contexto) {
      case "inicio":
        if (!this.progresso.primeira_visita) {
          MockupSystem.alertaInterativo("alô.mp3", "bemVindo.mp4");
          await this.marcarConcluido("primeira_visita");
        }
        break;

      case "comprei":
        if (!this.progresso.primeira_compra) {
          MockupSystem.alertaInterativo("alô.mp3", "tutorial_comprei.mp4");
          await this.marcarConcluido("primeira_compra");
        }
        break;

      case "vendi":
        if (!this.progresso.primeira_venda) {
          MockupSystem.alertaInterativo("alô.mp3", "tutorial_vendi.mp4");
          await this.marcarConcluido("primeira_venda");
        }
        break;

      case "estoque":
        if (!this.progresso.estoque_iniciado) {
          MockupSystem.alertaInterativo("alô.mp3", "tutorial_estoque.mp4");
          await this.marcarConcluido("estoque_iniciado");
        }
        break;
    }
  }
}


