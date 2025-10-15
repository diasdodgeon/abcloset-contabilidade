async function submit(category){
const desc = document.getElementById(category + '_desc').value;
const val = document.getElementById(category + '_val').value;


if(!desc || !val){
showToast('Preencha descrição e valor.');
return;
}


const payload = { category, description: desc, value: val };
try{
const res = await fetch('/api/register', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});
const data = await res.json();
if(data.success){
showToast('✅ ' + data.msg);
// limpa campos
document.getElementById(category + '_desc').value = '';
document.getElementById(category + '_val').value = '';
} else {
showToast('❌ ' + (data.msg || 'Erro'));
}
} catch(err){
showToast('Erro ao salvar: ' + err.message);
}
}


function showToast(text){
const t = document.getElementById('toast');
t.innerText = text;
t.classList.add('show');
setTimeout(()=> t.classList.remove('show'), 3000);
}