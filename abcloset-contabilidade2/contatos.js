const STORAGE_KEY = "contactsApp.v3"

const list = document.getElementById("contacts-list")
const search = document.getElementById("contacts-search-input")

const modal = document.getElementById("contacts-modal")

const nameInput = document.getElementById("contact-name")
const numberInput = document.getElementById("contact-number")

const saveBtn = document.getElementById("modal-save")
const cancelBtn = document.getElementById("modal-cancel")

const addBtn = document.getElementById("contacts-add")

let contacts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []

function saveStorage(){
localStorage.setItem(STORAGE_KEY,JSON.stringify(contacts))
}

function renderList(filter=""){

list.innerHTML=""

contacts
.filter(c => c.name.toLowerCase().includes(filter))
.forEach(c=>{

const el=document.createElement("div")
el.className="contact-item"

el.innerHTML=`

<div class="contact-thumb">${c.name[0]}</div>

<div class="contact-info">

<div class="contact-name">${c.name}</div>

<div class="contact-number">${c.number}</div>

</div>

`

el.onclick=()=>openChat(c)

list.appendChild(el)

})

}

function openModal(){

modal.classList.remove("hidden")

nameInput.value=""
numberInput.value=""

}

function closeModal(){

modal.classList.add("hidden")

}

function addContact(){

const name=nameInput.value.trim()
const number=numberInput.value.trim()

if(!name)return

contacts.push({name,number})

saveStorage()

renderList()

closeModal()

}

addBtn.onclick=openModal

cancelBtn.onclick=closeModal

saveBtn.onclick=addContact

search.oninput=()=>renderList(search.value.toLowerCase())

renderList()



/* CHAT */

const chatScreen=document.getElementById("chat-screen")
const chatMessages=document.getElementById("chat-messages")
const chatInput=document.getElementById("chat-input")
const chatSend=document.getElementById("chat-send")

function openChat(contact){

chatScreen.classList.remove("hidden")

chatMessages.innerHTML=""

}

chatSend.onclick=()=>{

const txt=chatInput.value.trim()

if(!txt)return

const msg=document.createElement("div")

msg.className="msg msg-user"

msg.textContent=txt

chatMessages.appendChild(msg)

chatInput.value=""

chatMessages.scrollTop=chatMessages.scrollHeight

}