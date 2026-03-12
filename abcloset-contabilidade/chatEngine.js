const ChatEngine = {

dadosTreinamento: null,
funcionalidades: null,

init: async function(){

await this.carregarDados()

console.log("ChatEngine iniciado")

},

carregarDados: async function(){

const treino = await fetch("data/treinamentoChat.json")
this.dadosTreinamento = await treino.json()

const func = await fetch("data/funcionalidades.json")
this.funcionalidades = await func.json()

},

processar: function(pergunta){

pergunta = pergunta.toLowerCase()

let resposta

resposta = this.interpretarFuncionalidade(pergunta)

if(resposta) return resposta

resposta = this.buscarIntent(pergunta)

if(resposta) return resposta

this.registrarNaoEntendido(pergunta)

return this.menuAjuda()

},
interpretarFuncionalidade: function(pergunta){

for(const chave in this.funcionalidades){

let item = this.funcionalidades[chave]

for(let palavra of item.palavras){

if(pergunta.includes(palavra)){

return `
📌 <b>${item.titulo}</b>

${item.descricao}

Você pode:

${item.acoes.map(a=>"• "+a).join("<br>")}
`

}

}

}

return null

},
buscarIntent: function(pergunta){

let docs = this.dadosTreinamento.documentos

for(let item of docs){

if(pergunta.includes(item.frase)){

let intent = item.intent

let resposta = this.dadosTreinamento.respostas.find(r=>r.intent===intent)

if(resposta) return resposta.resposta

}

}

return null

},
registrarNaoEntendido: function(pergunta){

let lista = JSON.parse(localStorage.getItem("perguntasNaoEntendidas") || "[]")

lista.push(pergunta)

localStorage.setItem("perguntasNaoEntendidas", JSON.stringify(lista))

},
menuAjuda: function(){

return `
Ainda estou aprendendo 🤖

Talvez eu possa ajudar com:

1️⃣ Ver agendamentos
2️⃣ Criar agenda
3️⃣ Personalizar página
4️⃣ Compartilhar link
5️⃣ Cancelar agendamento
`

}

}
function enviarMensagem(){

let input = document.getElementById("mensagem")

let texto = input.value

if(!texto) return

adicionarMensagem(texto,"usuario")

let resposta = ChatEngine.processar(texto)

setTimeout(()=>{

adicionarMensagem(resposta,"bot")

},500)

input.value=""

}
function adicionarMensagem(texto, tipo){

let chat = document.getElementById("chat")

let div = document.createElement("div")

div.className = tipo

div.innerHTML = texto

chat.appendChild(div)

chat.scrollTop = chat.scrollHeight

}
window.ChatEngine = ChatEngine