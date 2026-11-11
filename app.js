const KEY='minha-vida-financeira-v1';
const brl=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>new Date().toISOString().slice(0,10);
const initial={
  reserve:0,
  debt:{installment:0,remaining:0,total:0,paid:0},
  incomes:[],
  bills:[],
  transactions:[]
}
let state=load();
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));return s?{...initial,...s}:structuredClone(initial)}catch{return structuredClone(initial)}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function totals(){
  const tx=state.transactions;
  const inTx=tx.filter(t=>t.kind==='income').reduce((a,t)=>a+t.amount,0);
  const outTx=tx.filter(t=>t.kind==='expense').reduce((a,t)=>a+t.amount,0);
  const plannedIn=state.incomes.reduce((a,x)=>a+x.amount,0);
  const plannedOut=state.bills.reduce((a,x)=>a+x.amount,0);
  return {income:plannedIn+inTx,expense:plannedOut+outTx,balance:plannedIn+inTx-plannedOut-outTx};
}
function render(){
  const t=totals();
  document.querySelector('#balance').textContent=brl(t.balance);
  document.querySelector('#incomeTotal').textContent=brl(t.income);
  document.querySelector('#expenseTotal').textContent=brl(t.expense);
  document.querySelector('#statIncome').textContent=brl(t.income);
  document.querySelector('#statExpense').textContent=brl(t.expense);
  document.querySelector('#statReserve').textContent=brl(state.reserve);
  const debt=state.debt.installment*state.debt.remaining;
  document.querySelector('#statDebt').textContent=brl(debt);
  document.querySelector('#debtRemaining').textContent=brl(debt);
  document.querySelector('#debtProgress').style.width=(state.debt.paid/state.debt.total*100)+'%';
  const pct=Math.min(100,state.reserve/1000*100);
  document.querySelector('#reserveProgress').style.width=pct+'%';
  document.querySelector('#goalProgress').style.width=pct+'%';
  document.querySelector('#reservePercent').textContent=Math.round(pct)+'%';
  document.querySelector('#reserveProgressText').textContent=`${brl(state.reserve)} de R$ 1.000,00`;
  document.querySelector('#goalAmount').textContent=brl(state.reserve);
  document.querySelector('#billList').innerHTML=state.bills.map(b=>`<div class="list-row"><div><b>${esc(b.name)}</b><small>Vencimento: ${esc(b.day)}</small></div><strong>${brl(b.amount)}</strong></div>`).join('');
  renderTransactions();
}
function renderTransactions(filter='all'){
  const list=document.querySelector('#transactionList');
  const arr=state.transactions.filter(x=>filter==='all'||x.kind===filter).slice().reverse();
  if(!arr.length){list.innerHTML='<p class="empty">Seus lançamentos aparecerão aqui.</p>';return}
  list.innerHTML=arr.map((x)=>`<div class="list-row"><div><b>${esc(x.description||x.category)}</b><small>${esc(x.category)} · ${esc(x.date)}</small></div><strong class="${x.kind==='income'?'green':''}">${x.kind==='income'?'+':'−'} ${brl(x.amount)}</strong></div>`).join('');
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)}
function openTransaction(kind){document.querySelector('#transactionKind').value=kind;document.querySelector('#transactionTitle').textContent=kind==='income'?'Nova entrada':'Nova despesa';const cats=kind==='income'?['Salário hospital','Salário consultório','Renda extra','Outros']:['Moradia','Alimentação','Transporte','Saúde','Beleza e autocuidado','Lazer','Dívidas','Contas da casa','Outros'];document.querySelector('#transactionCategory').innerHTML=cats.map(c=>`<option>${c}</option>`).join('');document.querySelector('#transactionDate').value=today();document.querySelector('#transactionDialog').showModal()}
document.querySelectorAll('[data-open="transaction"]').forEach(b=>b.addEventListener('click',()=>openTransaction(b.dataset.kind)));
document.querySelectorAll('[data-open="reserve"]').forEach(b=>b.addEventListener('click',()=>document.querySelector('#reserveDialog').showModal()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelector('#transactionForm').addEventListener('submit',e=>{e.preventDefault();const raw=document.querySelector('#transactionAmount').value.replace(/\./g,'').replace(',','.');const amount=Number(raw);if(!Number.isFinite(amount)||amount<=0){toast('Informe um valor válido.');return}state.transactions.push({kind:document.querySelector('#transactionKind').value,amount,category:document.querySelector('#transactionCategory').value,description:document.querySelector('#transactionDescription').value.trim(),date:document.querySelector('#transactionDate').value});save();e.target.closest('dialog').close();e.target.reset();toast('Lançamento salvo neste aparelho!')});
document.querySelector('#reserveForm').addEventListener('submit',e=>{e.preventDefault();const amount=Number(document.querySelector('#reserveAmount').value.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<=0){toast('Informe um valor válido.');return}if(document.querySelector('#reserveKind').value==='remove'&&amount>state.reserve){toast('O resgate não pode ser maior que sua reserva.');return}state.reserve+=document.querySelector('#reserveKind').value==='add'?amount:-amount;save();e.target.closest('dialog').close();e.target.reset();toast('Reserva atualizada!')});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===b.dataset.tab))}));
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));renderTransactions(b.dataset.filter)}));
document.querySelector('#exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-minha-vida-financeira.json';a.click();URL.revokeObjectURL(a.href);document.querySelector('#backupStatus').textContent='Backup exportado. Guarde o arquivo em local seguro.'});
document.querySelector('#importFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.bills||!data.incomes||!Array.isArray(data.transactions))throw Error();state={...initial,...data};save();toast('Backup restaurado!')}catch{toast('Arquivo de backup inválido.')}e.target.value=''});
document.querySelector('#resetBtn').addEventListener('click',()=>{if(confirm('Isso apaga os lançamentos e restaura os dados iniciais. Você já exportou um backup?')){state=structuredClone(initial);save();toast('Dados iniciais restaurados.')}});
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;const btn=document.querySelector('#installBtn');btn.hidden=false;btn.onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;btn.hidden=true}});
if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
