const app = window.Telegram?.WebApp;
app?.ready(); app?.expand();
const status = document.getElementById('status');
const container = document.getElementById('offers');
const caseId = new URLSearchParams(location.search).get('caseId');
const API = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const initData = app?.initData;
const money = v => v == null ? '—' : `${new Intl.NumberFormat('uz-UZ').format(Number(v))} сўм`;
const label = (s) => { const el=document.createElement('div');el.textContent=s;return el; };
async function request(path, method='GET') {
  const response=await fetch(`${API}/client-miniapp${path}`, {method, headers:{'X-Telegram-Init-Data':initData},cache:'no-store'});
  const result=await response.json().catch(()=>({}));
  if(!response.ok || !result.ok) throw new Error(result.error || 'Сервер хатолиги');
  return result;
}
function row(grid, title, value) {
  const div=document.createElement('div');const small=document.createElement('small');small.textContent=title;const strong=document.createElement('strong');strong.textContent=value;div.append(small,strong);grid.append(div);
}
function cleanConditions(raw) {
  const match=String(raw||'').match(/\[?GK_GRACE_V1\]?\s*(\{[^\r\n]*\})/);
  if(!match) return String(raw||'');
  let detail='';try{const d=JSON.parse(match[1]);detail=`Тўлов тури: ${d.paymentType==='DIFFERENTIATED'?'Дифференциал':'Аннуитет'}\nИмтиёзли давр: ${d.enabled?`${d.months} ой`:'йўқ'}`;}catch{}
  return [String(raw).replace(match[0],'').trim(),detail].filter(Boolean).join('\n');
}
function render(data) {
  status.textContent=`Мурожаат: ${data.case.displayId}. Таклифни танлаш кредит шартномасини имзолаш ҳисобланмайди.`;
  container.replaceChildren();
  if(!data.offers.length){container.append(label('Ҳозирча таклифлар йўқ.'));return;}
  const alreadySelected=data.offers.some(x=>x.status==='SELECTED');
  for(const offer of data.offers){
    const card=document.createElement('article');card.className='offer'+(offer.status==='SELECTED'?' selected':'');
    const h=document.createElement('h2');h.textContent=offer.bankName;card.append(h);
    const grid=document.createElement('div');grid.className='grid';
    row(grid,'Кредит суммаси',money(offer.approvedAmount));row(grid,'Йиллик фоиз',offer.interestRate==null?'—':`${offer.interestRate}%`);
    row(grid,'Муддат',offer.termMonths==null?'—':`${offer.termMonths} ой`);row(grid,'Ойлик тўлов (банк таклифи)',money(offer.monthlyPayment));
    row(grid,'Бошланғич тўлов',money(offer.initialPayment));row(grid,'Комиссия',money(offer.commissionAmount));
    row(grid,'Суғурта',money(offer.insuranceAmount));row(grid,'Амал қилиш санаси',offer.validUntil?new Date(offer.validUntil).toLocaleDateString('uz-UZ'):'—');
    card.append(grid);
    const c=cleanConditions(offer.conditions);if(c){const p=document.createElement('p');p.className='conditions';p.textContent=c;card.append(p);}
    const button=document.createElement('button');button.textContent=offer.status==='SELECTED'?'✓ Танланган':alreadySelected?'Бошқа таклиф танланган':'Ушбу таклифни танлаш';button.disabled=alreadySelected;
    button.addEventListener('click',async()=>{
      if(!window.confirm(`${offer.bankName} таклифини танлашни тасдиқлайсизми?`))return;
      button.disabled=true;button.textContent='Юборилмоқда...';
      try{await request(`/cases/${encodeURIComponent(caseId)}/offers/${encodeURIComponent(offer.id)}/select`,'POST');await load();}
      catch(e){status.textContent=e.message;button.disabled=false;button.textContent='Қайта уриниш';}
    });card.append(button);container.append(card);
  }
}
async function load(){try{const data=await request(`/cases/${encodeURIComponent(caseId)}/offers`);render(data);}catch(e){status.textContent=e.message;container.replaceChildren();}}
if(!API || !caseId || !initData){status.textContent='Mini App фақат Telegram ботидаги тугма орқали очилади. Сервер манзили ҳам созланган бўлиши керак.';}else load();
