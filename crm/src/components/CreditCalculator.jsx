import React, { useMemo, useState } from 'react';
import './CreditCalculator.css';

const format = n => new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 2 }).format(n);
const money = n => `${format(n)} сўм`;
const dateString = d => new Intl.DateTimeFormat('uz-UZ', {day:'2-digit',month:'2-digit',year:'numeric'}).format(d);

export function calculateSchedule({amount,rate,months,kind,graceMonths=0,firstDate}) {
  const principal=Number(amount), annual=Number(rate), count=Number(months), grace=Number(graceMonths);
  if (!Number.isFinite(principal)||principal<=0||!Number.isFinite(annual)||annual<0||annual>100||!Number.isInteger(count)||count<1||count>600||!Number.isInteger(grace)||grace<0||grace>=count) return null;
  const r=annual/1200, remaining=count-grace;
  const monthly=kind==='DIFFERENTIATED'?0:r===0?principal/remaining:principal*r/(1-Math.pow(1+r,-remaining));
  const base=new Date(`${firstDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  let balance=principal, sum=0, interestSum=0;
  const rows=[];
  for(let i=1;i<=count;i++) {
    const interest=balance*r;
    const capital=i<=grace?0:kind==='DIFFERENTIATED'?Math.min(balance,principal/remaining):Math.min(balance,Math.max(0,monthly-interest));
    const payment=capital+interest;
    balance=Math.max(0,balance-capital);
    const date=new Date(base.getFullYear(),base.getMonth()+i-1,Math.min(base.getDate(),new Date(base.getFullYear(),base.getMonth()+i,0).getDate()),12);
    rows.push({month:i,date:dateString(date),capital,interest,payment,balance});
    sum+=payment;interestSum+=interest;
  }
  return {rows,total:sum,totalInterest:interestSum,firstPayment:rows[0].payment,lastPayment:rows[rows.length-1].payment};
}

export default function CreditCalculator({caseId='',bankName=''}) {
 const [amount,setAmount]=useState('200000000');
 const [rate,setRate]=useState('26');
 const [months,setMonths]=useState('60');
 const [kind,setKind]=useState('ANNUITY');
 const [graceMonths,setGraceMonths]=useState('0');
 const [firstDate,setFirstDate]=useState(()=>{const d=new Date();d.setMonth(d.getMonth()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
 const result=useMemo(()=>calculateSchedule({amount,rate,months,kind,graceMonths,firstDate}),[amount,rate,months,kind,graceMonths,firstDate]);
 const printPdf=()=>{
   if(!result)return;
   const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const img=new URL('/golden-key-info-logo.png',window.location.origin).href;
   const html=`<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Golden Key Info — кредит графиги</title><style>@page{size:A4;margin:13mm}body{font:11px Arial,sans-serif;color:#202020}header{display:flex;align-items:center;gap:18px;border-bottom:2px solid #d71920;padding-bottom:10px}header img{width:70px;height:70px;object-fit:contain}h1{font-size:19px}p{line-height:1.6}.summary{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:15px 0}table{border-collapse:collapse;width:100%;font-size:9px}th,td{border:1px solid #ddd;padding:5px;text-align:right}th{background:#f0f0f0}td:first-child,th:first-child{text-align:center}thead{display:table-header-group}tr{break-inside:avoid}.note{margin-top:14px;color:#666}@media print{button{display:none}}</style></head><body><header><img src="${img}" alt="Golden Key Info"><div><h1>КРЕДИТ ТЎЛОВ ГРАФИГИ</h1><strong>GOLDEN KEY INFO</strong></div></header><div class="summary"><div>Мурожаат: ${esc(caseId||'—')}</div><div>Банк: ${esc(bankName||'—')}</div><div>Кредит: ${esc(money(Number(amount)))}</div><div>Йиллик ставка: ${esc(rate)}%</div><div>Муддат: ${esc(months)} ой</div><div>Тўлов: ${kind==='ANNUITY'?'Аннуитет':'Дифференциал'}</div><div>Имтиёзли давр: ${esc(graceMonths)} ой (фақат фоиз)</div><div>Биринчи тўлов: ${esc(firstDate)}</div><div>Жами фоиз: ${esc(money(result.totalInterest))}</div><div>Жами тўлов: ${esc(money(result.total))}</div></div><table><thead><tr><th>Ой</th><th>Сана</th><th>Асосий қарз</th><th>Фоиз</th><th>Жами тўлов</th><th>Қолдиқ</th></tr></thead><tbody>${result.rows.map(x=>`<tr><td>${x.month}</td><td>${x.date}</td><td>${format(x.capital)}</td><td>${format(x.interest)}</td><td>${format(x.payment)}</td><td>${format(x.balance)}</td></tr>`).join('')}</tbody></table><p class="note">Маълумот учун дастлабки ҳисоб-китоб. Банкнинг расмий графиги фарқ қилиши мумкин. Комиссия ва суғурта киритилмаган. Имтиёзли даврда фақат фоиз тўланади.</p><script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),400)});<\/script></body></html>`;
   const w=window.open('','_blank');if(!w){alert('PDF учун янги ойна очишга рухсат беринг.');return;}w.document.open();w.document.write(html.replace('<\/script>','</script>'));w.document.close();
 };
 return <section className="gk-calc"><div className="gk-calc-head"><img src="/golden-key-info-logo.png" alt="Golden Key Info"/><div><h2>Кредит калькулятори</h2><p>Аннуитет ва дифференциал тўлов графиги</p></div></div><div className="gk-calc-fields"><label>Кредит суммаси, сўм<input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Йиллик фоиз, %<input type="number" min="0" max="100" step="0.01" value={rate} onChange={e=>setRate(e.target.value)}/></label><label>Муддат, ой<input type="number" min="1" max="600" value={months} onChange={e=>setMonths(e.target.value)}/></label><label>Тўлов тури<select value={kind} onChange={e=>setKind(e.target.value)}><option value="ANNUITY">Аннуитет</option><option value="DIFFERENTIATED">Дифференциал</option></select></label><label>Имтиёзли давр, ой<input type="number" min="0" value={graceMonths} onChange={e=>setGraceMonths(e.target.value)}/></label><label>Биринчи тўлов санаси<input type="date" value={firstDate} onChange={e=>setFirstDate(e.target.value)}/></label></div>{!result?<p role="alert">Киритилган маълумотларни текширинг. Имтиёзли давр муддатдан қисқа бўлиши керак.</p>:<><div className="gk-calc-summary"><div><small>Биринчи тўлов</small><strong>{money(result.firstPayment)}</strong></div><div><small>Жами фоиз</small><strong>{money(result.totalInterest)}</strong></div><div><small>Жами тўлов</small><strong>{money(result.total)}</strong></div></div><div className="gk-calc-scroll"><table><thead><tr><th>Ой</th><th>Сана</th><th>Асосий қарз</th><th>Фоиз</th><th>Тўлов</th><th>Қолдиқ</th></tr></thead><tbody>{result.rows.map(x=><tr key={x.month}><td>{x.month}</td><td>{x.date}</td><td>{format(x.capital)}</td><td>{format(x.interest)}</td><td>{format(x.payment)}</td><td>{format(x.balance)}</td></tr>)}</tbody></table></div><button className="gk-calc-print" type="button" onClick={printPdf}>PDF графикни чиқариш</button><p className="gk-calc-note">Тугма босилганда чоп этиш ойнаси очилади. «Save as PDF / PDF сифатида сақлаш»ни танланг. Имтиёзли даврда фақат фоиз тўланади; комиссия ва суғурта ҳисобга олинмайди.</p></>}</section>;
}
