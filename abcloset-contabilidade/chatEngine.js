const menuAjuda = {

1: "Você pode verificar todos os seus agendamentos no painel da agenda dentro do dashboard.",

2: "Para redefinir seus horários de atendimento, acesse as configurações da agenda e altere os dias e horários disponíveis.",

3: "Para modificar o estilo da página de agendamento você pode alterar cores, banner e título nas opções de personalização.",

4: "Você pode compartilhar sua agenda enviando o link exclusivo para seus clientes.",

5: "Para cancelar um agendamento basta acessar a lista de clientes e remover o horário desejado."

};



const ChatEngine = {

dadosTreinamento: null,
funcionalidades: null,

init: async function(){

await this.carregarDados()

await this.carregarMensagensAdmin()

console.log("ChatEngine iniciado")

},

carregarDados: async function(){

const treino = await fetch("./treinamentoChat.json")
this.dadosTreinamento = await treino.json()

const func = await fetch("./funcionalidades.json")
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
Ainda estou aprendendo 🤖. Vou registrar sua pergunta para melhorar minhas respostas.

Enquanto isso, talvez eu possa ajudar com uma dessas opções:
<br>
1️⃣ Checar agendamentos
<br>  
2️⃣ Redefinir horários
<br>  
3️⃣ Modificar estilo da página
<br>  
4️⃣ Compartilhar link de agendamento
<br>  
5️⃣ Cancelar agendamento
<br>  
6️⃣ Nenhuma das anteriores
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

carregarMensagensAdmin(){

    try{

        const resposta = await fetch("./adminMensagens.json")
        const dados = await resposta.json()

        this.processarMensagensAdmin(dados.mensagens)

    }catch(erro){

        console.log("Erro ao carregar mensagens do admin", erro)

    }

}

processarMensagensAdmin(mensagens){

    const cache = JSON.parse(localStorage.getItem("adminMensagensVistas")) || []

    mensagens.forEach(msg => {

        if(!cache.includes(msg.id)){

            this.adicionarMensagemAdmin(msg.texto)

            cache.push(msg.id)

        }

    })

    localStorage.setItem("adminMensagensVistas", JSON.stringify(cache))

}
adicionarMensagemAdmin(texto){

    const chat = document.querySelector("#chatMensagens")

    const mensagem = document.createElement("div")

    mensagem.className = "mensagem admin"

    mensagem.innerHTML = `
        <b>📢 Mensagem do Admin</b><br>
        ${texto}
    `

    chat.appendChild(mensagem)

}


window.ChatEngine = ChatEngine




