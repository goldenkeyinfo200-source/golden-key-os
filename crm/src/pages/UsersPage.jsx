import React, { useCallback, useEffect, useState } from 'react';
import {
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Бош администратор',
  DIRECTOR: 'Директор',
  BRANCH_MANAGER: 'Филиал раҳбари',
  RECEPTION_MANAGER: 'Қабул менежери',
  EXECUTOR: 'Ижрочи',
  LAWYER: 'Ҳуқуқшунос',
  ACCOUNTANT: 'Ҳисобчи',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);

const HR_SETTINGS_FIELDS = [
  ['taxId','Корхона СТИРи'], ['legalAddress','Юридик манзил'],
  ['authorizedRepresentative','Иш берувчи вакили'], ['workplaceAddress','Стандарт иш жойи манзили'],
  ['probationPeriod','Синов муддати'], ['firstPayDate','Биринчи иш ҳақи санаси'],
  ['secondPayDate','Иккинчи иш ҳақи санаси'], ['paymentMethod','Тўлов усули'],
  ['workDaysPerWeek','Ҳафталик иш кунлари'], ['weeklyHours','Ҳафталик иш соатлари'],
  ['workStartTime','Иш бошланиш вақти'], ['workEndTime','Иш тугаш вақти'],
  ['breakTime','Танаффус'], ['restDays','Дам олиш кунлари'],
  ['annualLeaveDays','Асосий таътил (календарь кун)'],
  ['additionalLeave','Қўшимча таътил'], ['workConditions','Меҳнат шароитлари'],
];
const EMPTY_HR_SETTINGS = Object.fromEntries(HR_SETTINGS_FIELDS.map(([key]) => [key, '']));

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  email: '',
  login: '',
  password: '',
  role: 'RECEPTION_MANAGER',
  branchId: '',
  isActive: true,
};

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [hrSettingsOpen, setHrSettingsOpen] = useState(false);
  const [hrSettings, setHrSettings] = useState(EMPTY_HR_SETTINGS);
  const [hrSettingsError, setHrSettingsError] = useState('');
  const [hrSettingsSaving, setHrSettingsSaving] = useState(false);
  const [hrUser, setHrUser] = useState(null);
  const [hrProfile, setHrProfile] = useState(null);
  const [hrForm, setHrForm] = useState({passport:'',pinfl:'',address:'',jobTitle:'',salaryType:'FIXED',monthlySalary:'',commissionPercent:'',commissionBasis:'',certificateRequired:false,certificateNumber:''});
  const [hrNumber, setHrNumber] = useState('');
  const [hrError, setHrError] = useState('');
  const [hrSaving, setHrSaving] = useState(false);
  const openHr = async (user) => {
    setHrUser(user);setHrError('');setHrProfile(null);setHrDetails({});
    try {
      const data = await apiRequest(`/employee-contracts/${user.id}`);
      setHrProfile(data.profile);
      const p=data.profile || {};
      setHrForm({passport:p.passport||'',pinfl:p.pinfl||'',address:p.address||'',jobTitle:p.jobTitle||'',salaryType:p.salaryType||'FIXED',monthlySalary:p.monthlySalary??'',commissionPercent:p.commissionPercent??'',commissionBasis:p.commissionBasis||'',certificateRequired:!!p.certificateRequired,certificateNumber:p.certificateNumber||''});
    } catch(e){setHrError(e.message)}
  };
  const openHrSettings = async () => {
    setHrSettingsOpen(true); setHrSettingsError('');
    try {
      const data = await apiRequest('/employee-contracts/company/settings');
      setHrSettings({...EMPTY_HR_SETTINGS, ...(data.settings || {})});
    } catch(e) {setHrSettingsError(e.message || 'Созламаларни олиб бўлмади');}
  };
  const saveHrSettings = async (event) => {
    event.preventDefault(); setHrSettingsSaving(true); setHrSettingsError('');
    try {
      const body = Object.fromEntries(HR_SETTINGS_FIELDS.map(([key]) => [key,
        key === 'annualLeaveDays' ? (hrSettings[key] === '' || hrSettings[key] == null ? null : Number(hrSettings[key])) : (String(hrSettings[key] ?? '').trim() || null)
      ]));
      const data = await apiRequest('/employee-contracts/company/settings', {method:'PUT',body:JSON.stringify(body)});
      setHrSettings({...EMPTY_HR_SETTINGS,...(data.settings || {})});
      setHrSettingsOpen(false);
    } catch(e) {setHrSettingsError(e.message || 'Созламаларни сақлаб бўлмади');}
    finally {setHrSettingsSaving(false);}
  };
  const saveHr = async (event) => {
    event.preventDefault();setHrSaving(true);setHrError('');
    try {
      const body={...hrForm,pinfl:hrForm.pinfl.trim() || null,monthlySalary:hrForm.monthlySalary===''?null:Number(hrForm.monthlySalary),commissionPercent:hrForm.commissionPercent===''?null:Number(hrForm.commissionPercent)};
      const data=await apiRequest(`/employee-contracts/${hrUser.id}/profile`,{method:'PUT',body:JSON.stringify(body)});
      setHrProfile(prev=>({...prev,...data.profile}));
    }catch(e){setHrError(e.message)}finally{setHrSaving(false)}
  };
  const createHrDraft=async()=>{
    setHrSaving(true);setHrError('');
    try{
      await apiRequest(`/employee-contracts/${hrUser.id}/contracts`,{method:'POST',body:JSON.stringify({contractNumber:hrNumber,startDate:hrStartDate?new Date(hrStartDate+'T12:00:00').toISOString():null,endDate:hrEndDate?new Date(hrEndDate+'T12:00:00').toISOString():null,notes:hrNotes||null,details:hrDetails})});
      const data=await apiRequest(`/employee-contracts/${hrUser.id}`);setHrProfile(data.profile);setHrNumber('');setHrStartDate('');setHrEndDate('');setHrNotes('');setHrDetails({});
    }catch(e){setHrError(e.message)}finally{setHrSaving(false)}
  };

  const [hrStartDate, setHrStartDate] = useState('');
  const [hrEndDate, setHrEndDate] = useState('');
  const [hrNotes, setHrNotes] = useState('');
  const [hrDetails, setHrDetails] = useState({});
  const updateHrDetail = (key, value) => setHrDetails(prev => ({...prev, [key]: value}));
  const hrDetailFields = [['employerRepresentative', 'Ваколатли вакил'], ['employerTin', 'Иш берувчи СТИР'], ['employerAddress', 'Иш берувчи манзили'], ['workplaceAddress', 'Иш жойи манзили'], ['probation', 'Синов муддати'], ['payDay1', 'Биринчи иш ҳақи санаси'], ['payDay2', 'Иккинчи иш ҳақи санаси'], ['paymentMethod', 'Иш ҳақи тўлаш усули'], ['workDays', 'Иш ҳафтаси [кун]'], ['weeklyHours', 'Ҳафталик иш вақти [соат]'], ['workStart', 'Иш бошланиши'], ['workEnd', 'Иш тугаши'], ['breakTime', 'Танаффус'], ['restDays', 'Дам олиш кунлари'], ['leaveDays', 'Таътил [календарь кун]'], ['additionalLeave', 'Қўшимча таътиллар'], ['safetyConditions', 'Меҳнат шароитлари'], ['fixedTermReason', 'Муддатли шартнома асоси'], ['passport', 'Паспорт/ID'], ['pinfl', 'ЖШШИР'], ['address', 'Ходим яшаш манзили']];
  const hrOverrideFields = hrDetailFields.filter(([key]) => ['probation','workplaceAddress','workDays','weeklyHours','workStart','workEnd','breakTime','restDays','leaveDays','additionalLeave','safetyConditions','fixedTermReason'].includes(key));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const printHrDraft = (contract) => {
    const snapshot = contract.termsSnapshot || {};
    const safe = (v) => escapeHtml(v === null || v === undefined || String(v).trim() === '' ? '________________________' : v);
    const date = (v) => {
      if (!v) return '________________________';
      const parsed = new Date(v);
      return Number.isNaN(parsed.getTime()) ? '________________________' : escapeHtml(parsed.toLocaleDateString('uz-UZ'));
    };
    const pay = snapshot.salaryType === 'FIXED'
      ? `Ойлик лавозим маоши: <b>${safe(snapshot.monthlySalary)} сўм</b>.`
      : snapshot.salaryType === 'PERCENT'
        ? `Иш ҳақининг ўзгарувчан қисми: <b>${safe(snapshot.commissionPercent)}%</b>; ҳисоблаш базаси: ${safe(snapshot.commissionBasis)}. Кафолатланган тўлов миқдори ва ҳисоблаш тартиби алоҳида аниқлаштирилади.`
        : `Ойлик лавозим маоши: <b>${safe(snapshot.monthlySalary)} сўм</b>; қўшимча ўзгарувчан тўлов: <b>${safe(snapshot.commissionPercent)}%</b>; ҳисоблаш базаси: ${safe(snapshot.commissionBasis)}.`;
    const section = (number, heading, paragraphs) =>
      `<section class="clause"><h2>${number}. ${heading}</h2>${paragraphs.map((p) => `<p>${p}</p>`).join('')}</section>`;
    const sections = [
      section(1, 'Тарафлар ва шартнома предмети', [
        `Иш берувчи — «GOLDEN KEY INFO» масъулияти чекланган жамияти, унинг номидан устав ёки ишончнома асосида ҳаракат қилувчи ${safe(snapshot.employerRepresentative)}, бир томондан, ходим ${safe(hrUser?.fullName)}, иккинчи томондан, ушбу меҳнат шартномаси лойиҳасини туздилар.`,
        'Иш берувчи ходимга келишилган меҳнат вазифаси бўйича иш бериш, меҳнат шароитларини таъминлаш ва иш ҳақини тўлаш, ходим эса меҳнат вазифасини шахсан бажариш мажбуриятини олади.'
      ]),
      section(2, 'Иш жойи, лавозим ва меҳнат вазифаси', [
        `Иш жойи: «GOLDEN KEY INFO» МЧЖ, таркибий бўлинма (филиал): ${safe(hrUser?.branch?.name)}, иш жойининг тўлиқ манзили: ${safe(snapshot.workplaceAddress)}.`,
        `Лавозим (касб, мутахассислик): <b>${safe(snapshot.jobTitle)}</b>. Меҳнат вазифалари, ваколатлар ва ҳисобдорлик тасдиқланган лавозим йўриқномасида белгиланади; ходим у билан имзо қўйиб таништирилади.`
      ]),
      section(3, 'Шартнома муддати ва иш бошлаш', [
        `Иш бошлаш санаси: <b>${date(contract.startDate)}</b>.`,
        contract.endDate
          ? `Шартнома муддати: ${date(contract.startDate)} дан ${date(contract.endDate)} гача. Муддатли шартнома тузишнинг қонуний асоси ва сабаби: ${safe(snapshot.fixedTermReason)}.`
          : 'Шартнома номуайян муддатга тузилади. Муддатли меҳнат муносабатлари қўлланилса, қонуний асоси ва тугаш санаси алоҳида келишилади.',
        `Синов муддати (агар қонун йўл қўйса ва тарафлар келишса): ${safe(snapshot.probation)}. Синов шарти белгиланмаган бўлса, ходим синовсиз ишга қабул қилинган ҳисобланади.`
      ]),
      section(4, 'Иш ҳақи ва тўловлар', [
        pay,
        `Иш ҳақи тўланадиган аниқ саналар: ${safe(snapshot.payDay1)} ва ${safe(snapshot.payDay2)}; тўлаш усули: ${safe(snapshot.paymentMethod)}. Иш ҳақи қонунчиликда белгиланган энг кам кафолатлардан кам бўлмаслиги керак.`,
        'Устамалар, мукофотлар, фоизли рағбатлантириш ва уларни ҳисоблаш мезонлари ходимга олдиндан маълум қилинган ёзма қоидалар ёки келишув асосида қўлланилади. Қонуний солиқлар ва ушланмалар белгиланган тартибда амалга оширилади.'
      ]),
      section(5, 'Иш вақти ва дам олиш вақти', [
        `Иш ҳафтаси: ${safe(snapshot.workDays)} кун; ҳафталик иш вақти: ${safe(snapshot.weeklyHours)} соат; иш бошланиши: ${safe(snapshot.workStart)}; тугаши: ${safe(snapshot.workEnd)}; овқатланиш ва дам олиш танаффуси: ${safe(snapshot.breakTime)}.`,
        `Ҳафталик дам олиш кунлари: ${safe(snapshot.restDays)}. Иш вақтидан ташқари, дам олиш ёки байрам кунларида ишга жалб этиш фақат қонунчиликда назарда тутилган шартлар ва компенсациялар асосида амалга оширилади.`
      ]),
      section(6, 'Таътиллар ва ижтимоий кафолатлар', [
        `Ҳар йилги асосий меҳнат таътили давомийлиги: ${safe(snapshot.leaveDays)} календарь кун (қонунчиликдаги энг кам муддатдан кам бўлмаслиги шарт). Қўшимча таътиллар ва имтиёзлар: ${safe(snapshot.additionalLeave)}.`,
        'Вақтинча меҳнатга лаёқатсизлик, оилавий ва бошқа ижтимоий таътиллар, мажбурий ижтимоий кафолатлар амалдаги қонунчиликка мувофиқ таъминланади.'
      ]),
      section(7, 'Ходимнинг ҳуқуқ ва мажбуриятлари', [
        'Ходим хавфсиз меҳнат шароитлари, ўз вақтида ва тўлиқ иш ҳақи, дам олиш, таътил, меҳнат ҳуқуқларини ҳимоя қилиш ҳамда қонунда назарда тутилган бошқа кафолатлардан фойдаланиш ҳуқуқига эга.',
        'Ходим келишилган меҳнат вазифасини виждонан бажаради, ички меҳнат тартибига, меҳнатни муҳофаза қилиш талабларига ва қонуний топшириқларга риоя қилади; иш берувчининг қонуний манфаатларига эҳтиёткорона муносабатда бўлади.'
      ]),
      section(8, 'Иш берувчининг ҳуқуқ ва мажбуриятлари', [
        'Иш берувчи ходимдан меҳнат вазифасини бажаришни ва ички тартибга риоя этишни талаб қилиш, қонун доирасида рағбатлантириш ва интизомий чораларни қўллаш ҳуқуқига эга.',
        'Иш берувчи ходимга шартлашилган ишни беради, хавфсиз иш шароитларини яратади, иш ҳақини ўз вақтида тўлайди, зарур йўриқномалар билан таништиради ва меҳнат қонунчилигидаги кафолатларга амал қилади.'
      ]),
      section(9, 'Меҳнатни муҳофаза қилиш ва иш шароитлари', [
        `Иш жойининг меҳнат шароитлари ва зарур хавфсизлик чоралари: ${safe(snapshot.safetyConditions)}. Иш берувчи ходимни тегишли хавфсизлик қоидалари билан таништиради.`,
        'Меҳнатни муҳофаза қилиш, тиббий кўрик, шахсий ҳимоя воситалари ва махсус кафолатлар тегишли иш тури учун қонунчиликда талаб қилинган ҳолларда таъминланади.'
      ]),
      section(10, 'Шахсий маълумотлар ва махфийлик', [
        'Тарафлар ходим ва мижозларнинг шахсий маълумотларини қонунчиликда белгиланган асослар, мақсадлар ва ҳимоя талабларига мувофиқ қайта ишлайди.',
        'Ходим хизмат вазифаси доирасида маълум бўлган қонун билан муҳофаза қилинадиган маълумотларни ошкор этмаслик мажбуриятини олади. Махфийлик қоидалари ходимнинг қонуний ҳуқуқларини чеклаш учун қўлланилмайди.'
      ]),
      section(11, 'Малака ошириш ва аттестация', [
        `Лавозим учун малака сертификати талаб этилиши: ${snapshot.certificateRequired ? 'ҳа' : 'йўқ'}. Сертификат рақами (мавжуд бўлса): ${safe(snapshot.certificateNumber)}.`,
        'Малака ошириш, ўқитиш ва аттестациянинг тартиби, харажатларни қоплаш ва қўшимча мажбуриятлар қонунчилик ҳамда алоҳида ёзма келишув асосида белгиланади.'
      ]),
      section(12, 'Меҳнат шартларини ўзгартириш', [
        'Меҳнат шартларини ўзгартириш қонунчиликда назарда тутилган асослар ва тартибда амалга оширилади. Тарафлар келишувига кўра ўзгаришлар тегишли қўшимча келишув билан расмийлаштирилади.',
        'Ходимни бошқа ишга ўтказиш, иш жойи ёки иш режимига таъсир қилувчи ўзгаришларда қонун талабларига риоя этилади.'
      ]),
      section(13, 'Жавобгарлик ва меҳнат низолари', [
        'Тарафларнинг интизомий, моддий ва бошқа жавобгарлиги фақат меҳнат қонунчилигида белгиланган асослар, чегаралар ва тартибда юзага келади.',
        'Меҳнат низолари музокара, ваколатли органлар ёки суд орқали қонунчиликка мувофиқ ҳал этилади. Ходимнинг қонунда белгиланган мурожаат қилиш ҳуқуқи чекланмайди.'
      ]),
      section(14, 'Шартномани бекор қилиш ва якуний ҳисоб-китоб', [
        'Меҳнат шартномасини бекор қилиш фақат қонунчиликда белгиланган асослар ва тартибда, зарур огоҳлантириш муддатлари ва кафолатларга риоя этилган ҳолда амалга оширилади.',
        'Бекор қилишда ходимга тегишли иш ҳақи, фойдаланилмаган таътил компенсацияси ва қонунчиликда назарда тутилган бошқа тўловлар ҳисоб-китоб қилинади.'
      ]),
      section(15, 'Якуний қоидалар, реквизитлар ва имзолар', [
        'Ушбу лойиҳада белгиланмаган масалалар Ўзбекистон Республикасининг амалдаги меҳнат қонунчилиги, жамоа шартномаси (мавжуд бўлса) ва қонунга мувофиқ ички ҳужжатлар билан тартибга солинади.',
        `Қўшимча келишилган шартлар: <span class="notes">${safe(contract.notes)}</span>`,
        'Шартнома тарафлар томонидан қонун талабларига мувофиқ расмийлаштирилиб имзолангандан сўнг тегишли ҳуқуқий кучга эга бўлади. Мазкур CRM лойиҳаси имзо ёки расмий рўйхатдан ўтказиш ўрнини босмайди.'
      ])
    ];
    // This is a draft preview only. Missing legal details must be completed before signing.
    const missingFields = [];
    if (!hrUser?.fullName?.trim()) missingFields.push('Ходим Ф.И.Ш.');
    if (!snapshot.jobTitle?.trim()) missingFields.push('Лавозим');
    if (!contract.startDate) missingFields.push('Иш бошлаш санаси');
    if (snapshot.salaryType !== 'PERCENT' && (snapshot.monthlySalary === null || snapshot.monthlySalary === undefined || snapshot.monthlySalary === '')) missingFields.push('Ойлик маош');
    if (snapshot.salaryType !== 'FIXED' && (snapshot.commissionPercent === null || snapshot.commissionPercent === undefined || snapshot.commissionPercent === '')) missingFields.push('Фоиз миқдори');
    if (!hrUser?.branch?.name) missingFields.push('Иш жойи / филиал');
    const requiredDetails = [
      ['employerRepresentative','Иш берувчи вакили'], ['employerTin','СТИР'],
      ['employerAddress','Иш берувчи манзили'], ['workplaceAddress','Иш жойи манзили'],
      ['payDay1','Биринчи тўлов санаси'], ['payDay2','Иккинчи тўлов санаси'],
      ['workDays','Иш ҳафтаси'], ['weeklyHours','Ҳафталик иш вақти'],
      ['workStart','Иш бошланиши'], ['workEnd','Иш тугаши'],
      ['restDays','Дам олиш кунлари'], ['leaveDays','Таътил муддати'],
      ['passport','Паспорт/ID'], ['pinfl','ЖШШИР'], ['address','Ходим манзили']
    ];
    const missingWarning = [...missingFields, ...requiredDetails.filter(([key])=>!String(snapshot[key]??'').trim()).map(([,label])=>label)];
    const html = `<!doctype html><html lang="uz"><head><meta charset="UTF-8"><title>Меҳнат шартномаси лойиҳаси ${safe(contract.contractNumber)}</title><style>
      @page{size:A4;margin:15mm 17mm 16mm}
      *{box-sizing:border-box}
      html{background:#e9edf2}
      body{font-family:Arial,"DejaVu Sans",sans-serif;color:#17212b;background:white;max-width:210mm;margin:20px auto;padding:15mm 17mm;font-size:10pt;line-height:1.39;overflow-wrap:break-word}
      h1{text-align:center;font-size:14pt;line-height:1.25;margin:12px 0 10px}
      h2{font-size:10.2pt;margin:11px 0 5px;line-height:1.3;break-after:avoid;page-break-after:avoid}
      p{margin:5px 0;text-align:justify;orphans:3;widows:3}
      .clause{break-inside:avoid-page;page-break-inside:avoid}
      .draft{text-align:center;border:1px solid #a56d17;color:#805510;font-size:8.2pt;font-weight:bold;padding:7px;break-inside:avoid}
      .meta{display:flex;justify-content:space-between;gap:12px;margin:11px 0;break-inside:avoid;font-size:9.2pt}
      .notes{white-space:pre-wrap}
      .sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;break-inside:avoid;page-break-inside:avoid;font-size:9pt}
      .sign p{text-align:left;margin:5px 0}
      .legal{font-size:8pt;margin-top:11px;break-inside:avoid}
      .missing-warning{padding:9px 12px;border:1px solid #dfb36c;background:#fffaf0;font-size:9pt;line-height:1.5;margin:12px 0}
      .print-button{margin-top:15px;background:#182532;color:white;border:0;border-radius:6px;padding:11px 17px;cursor:pointer}
      @media print{
        html{background:white}
        body{margin:0;padding:0;max-width:none;font-size:10pt;line-height:1.39}
        .print-button,.missing-warning{display:none!important}
        .draft,.meta,.sign{break-inside:avoid;page-break-inside:avoid}
        .clause{break-inside:avoid-page;page-break-inside:avoid}
      }
    </style></head><body>
      <div class="draft">ЛОЙИҲА — ИМЗОЛАНМАГАН. МАЖБУРИЙ МАЪЛУМОТЛАРНИ ТЎЛДИРИШ ВА ЮРИДИК ТЕКШИРУВ ТАЛАБ ҚИЛИНАДИ</div>
      <h1>МЕҲНАТ ШАРТНОМАСИ ЛОЙИҲАСИ</h1>
      <div class="meta"><span>№ ${safe(contract.contractNumber)}</span><span>Қўқон шаҳри · ${date(contract.createdAt)}</span></div>
      <div class="missing-warning"><b>Имзолашдан олдин тўлдирилиши шарт:</b> ${missingWarning.map(escapeHtml).join('; ')}.</div>
      ${sections.join('\n')}
      <div class="sign">
        <div><b>ИШ БЕРУВЧИ</b><p>«GOLDEN KEY INFO» МЧЖ</p><p>СТИР: ${safe(snapshot.employerTin)}</p><p>Манзил: ${safe(snapshot.employerAddress)}</p><p>Ваколатли вакил: ${safe(snapshot.employerRepresentative)}</p><p>Имзо: ____________________</p></div>
        <div><b>ХОДИМ</b><p>${safe(hrUser?.fullName)}</p><p>Паспорт/ID: ${safe(snapshot.passport)}</p><p>ЖШШИР: ${safe(snapshot.pinfl)}</p><p>Яшаш манзили: ${safe(snapshot.address)}</p><p>Имзо: ____________________</p></div>
      </div>
      <p class="legal">Ушбу ҳужжат CRM'даги DRAFT маълумотлари асосида тайёрланган. У имзоланмаган, ишга қабул қилиш буйруғи ёки меҳнат муносабатларини расмийлаштиришнинг бошқа мажбурий жараёнлари ўрнини босмайди. Бўш майдонлар ва қонунчиликка мувофиқлик масъул мутахассис томонидан текширилиши шарт.</p>
      <button class="print-button" onclick="window.print()">Чоп этиш / PDF сифатида сақлаш</button>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [usersData, branchesData] = await Promise.all([
        apiRequest('/users'),
        apiRequest('/users/branches'),
      ]);

      setUsers(usersData.items || []);
      setBranches(branchesData.items || []);
    } catch (requestError) {
      setError(requestError.message || 'Ходимларни юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      email: user.email || '',
      login: user.login || '',
      password: '',
      role: user.role,
      branchId: user.branchId || '',
      isActive: user.isActive !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        delete payload.login;

        await apiRequest(`/users/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }

      closeModal();
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Ходимни сақлаб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user) => {
    if (
      !window.confirm(
        `"${user.fullName}" ходимини ўчиришни (тизимга киришини блоклашни) тасдиқлайсизми?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiRequest(`/users/${user.id}`, { method: 'DELETE' });
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Ходимни ўчириб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="users-admin-page">
      <style>{`
        .users-admin-page{display:grid;gap:16px}
        .users-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;border:1px solid #e1e5e9;border-radius:15px;background:#fff;padding:20px}
        .users-toolbar h2{margin:3px 0}
        .users-toolbar p{margin:0;color:#7d838b;font-size:12px}
        .users-actions{display:flex;gap:8px;flex-wrap:wrap}
        .users-primary,.users-secondary{min-height:39px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:9px;padding:0 13px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
        .users-primary{border:1px solid #e5232f;background:#e5232f;color:#fff}
        .users-secondary{border:1px solid #dfe3e8;background:#fff;color:#25282c}
        .users-state{min-height:220px;display:grid;place-items:center;align-content:center;gap:9px;border:1px solid #e1e5e9;border-radius:15px;background:#fff;color:#8c939c}
        .users-error{border-radius:10px;padding:11px 12px;background:#fff0f1;color:#c9212c;font-size:12px;font-weight:700}
        .users-list{display:grid;gap:8px;border:1px solid #e1e5e9;border-radius:15px;background:#fff;padding:14px}
        .user-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e5e8eb;border-radius:10px;padding:12px}
        .user-row-main{display:flex;align-items:center;gap:10px}
        .user-avatar{width:38px;height:38px;border-radius:10px;background:#fff1f2;color:#e5232f;display:grid;place-items:center;font-weight:800}
        .user-info{display:grid;gap:2px}
        .user-info span{color:#858b93;font-size:11px}
        .user-row-actions{display:flex;align-items:center;gap:8px}
        .users-modal-backdrop{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(10,13,17,.58)}
        .users-modal{width:min(650px,100%);max-height:calc(100vh - 40px);overflow:auto;border-radius:16px;background:#fff}
        .users-modal-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:18px 20px;border-bottom:1px solid #eceef1;background:#fff}
        .users-modal-head button{width:36px;height:36px;border:1px solid #dfe3e8;border-radius:9px;background:#fff}
        .users-form{display:grid;gap:14px;padding:20px}
        .users-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
        .users-form label{display:grid;gap:6px}
        .users-form label span{color:#555c65;font-size:12px;font-weight:700}
        .users-form input,.users-form select{width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:10px;padding:11px 12px;font:inherit}
        @media(max-width:650px){.users-form-grid{grid-template-columns:1fr}.users-toolbar{flex-direction:column}}
      `}</style>

      <section className="users-toolbar">
        <div>
          <span className="section-kicker">Жамоа</span>
          <h2>Golden Key ходимлари</h2>
          <p>Тизим ходимларини (менежер, ижрочи, ҳуқуқшунос, ҳисобчи) ва уларнинг ҳуқуқларини бошқаринг.</p>
        </div>

        <div className="users-actions">
          <button type="button" className="users-secondary" onClick={load}>
            <RefreshCw size={17} />
            Янгилаш
          </button>
          <button type="button" className="users-secondary" onClick={openHrSettings}>
            <ShieldCheck size={17} /> Корхона HR созламалари
          </button>
          <button type="button" className="users-primary" onClick={openCreate}>
            <Plus size={17} />
            Янги ходим
          </button>
        </div>
      </section>

      {error ? <div className="users-error">{error}</div> : null}

      {loading ? (
        <section className="users-state">
          <LoaderCircle className="spin" size={34} />
          <strong>Ходимлар юкланмоқда...</strong>
        </section>
      ) : users.length === 0 ? (
        <section className="users-state">
          <UserRound size={34} />
          <strong>Ҳозирча ходимлар йўқ</strong>
        </section>
      ) : (
        <section className="users-list">
          {users.map((user) => (
            <div className="user-row" key={user.id}>
              <div className="user-row-main">
                <div className="user-avatar">
                  {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="user-info">
                  <strong>{user.fullName}</strong>
                  <span>
                    {ROLE_LABELS[user.role] || user.role}
                    {user.branch ? ` · ${user.branch.name}` : ''}
                    {' · '}
                    {user.login}
                  </span>
                </div>
              </div>

              <div className="user-row-actions">
                <strong>{user.isActive ? 'Фаол' : 'Блокланган'}</strong>
                <button type="button" className="users-secondary" onClick={() => openHr(user)}>Меҳнат шартномаси</button>
                <button
                  type="button"
                  className="users-secondary"
                  onClick={() => openEdit(user)}
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  className="users-secondary"
                  onClick={() => removeUser(user)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {hrSettingsOpen ? (
        <div className="users-modal-backdrop">
          <section className="users-modal" style={{width:'min(790px,100%)'}}>
            <div className="users-modal-head"><div><h3>Корхона HR созламалари</h3><p>Бир марта сақланади ва янги шартномаларга автоматик қўшилади</p></div><button type="button" onClick={()=>setHrSettingsOpen(false)}><X size={20}/></button></div>
            <form className="users-form" onSubmit={saveHrSettings}>
              {hrSettingsError ? <div className="users-error">{hrSettingsError}</div> : null}
              <div className="users-form-grid">
                {HR_SETTINGS_FIELDS.map(([key,label]) => <label key={key}><span>{label}</span><input type={key === 'annualLeaveDays' ? 'number' : 'text'} min={key === 'annualLeaveDays' ? 0 : undefined} max={key === 'annualLeaveDays' ? 365 : undefined} value={hrSettings[key] ?? ''} onChange={e=>setHrSettings(prev=>({...prev,[key]:e.target.value}))}/></label>)}
              </div>
              <p style={{fontSize:12,color:'#777'}}>Бу маълумотлар фақат янги шартнома лойиҳаларига қўшилади. Илгари сақланган шартномалар ўзгармайди.</p>
              <button className="users-primary" disabled={hrSettingsSaving}>{hrSettingsSaving?'Сақланмоқда...':'Корхона созламаларини сақлаш'}</button>
            </form>
          </section>
        </div>
      ) : null}
      {hrUser ? (
        <div className="users-modal-backdrop">
          <section className="users-modal">
            <div className="users-modal-head"><div><h3>{hrUser.fullName} — кадрлар карточкаси</h3><p>Меҳнат шартномаси лойиҳаси</p></div><button type="button" onClick={()=>setHrUser(null)}><X size={20}/></button></div>
            <form className="users-form" onSubmit={saveHr}>
              {hrError ? <div className="users-error">{hrError}</div> : null}
              <div className="users-form-grid">
                <label><span>Паспорт / ID</span><input value={hrForm.passport} onChange={e=>setHrForm({...hrForm,passport:e.target.value})}/></label>
                <label><span>ЖШШИР (14 рақам)</span><input inputMode="numeric" maxLength={14} value={hrForm.pinfl} onChange={e=>setHrForm({...hrForm,pinfl:e.target.value})}/></label>
              </div>
              <label><span>Ходим яшаш манзили</span><input value={hrForm.address} onChange={e=>setHrForm({...hrForm,address:e.target.value})}/></label>
              <label><span>Расмий лавозим</span><input required value={hrForm.jobTitle} onChange={e=>setHrForm({...hrForm,jobTitle:e.target.value})}/></label>
              <label><span>Иш ҳақи тартиби</span><select value={hrForm.salaryType} onChange={e=>setHrForm({...hrForm,salaryType:e.target.value})}><option value="FIXED">Ойлик</option><option value="PERCENT">Фоиз</option><option value="MIXED">Ойлик + фоиз</option></select></label>
              {hrForm.salaryType!=='PERCENT' ? <label><span>Ойлик (сўм)</span><input type="number" min="0" value={hrForm.monthlySalary} onChange={e=>setHrForm({...hrForm,monthlySalary:e.target.value})}/></label> : null}
              {hrForm.salaryType!=='FIXED' ? <><label><span>Фоиз (%)</span><input type="number" min="0" max="100" step="0.001" value={hrForm.commissionPercent} onChange={e=>setHrForm({...hrForm,commissionPercent:e.target.value})}/></label><label><span>Фоиз ҳисоблаш базаси</span><input value={hrForm.commissionBasis} onChange={e=>setHrForm({...hrForm,commissionBasis:e.target.value})}/></label></> : null}
              <label><span><input type="checkbox" checked={hrForm.certificateRequired} onChange={e=>setHrForm({...hrForm,certificateRequired:e.target.checked})}/> Малака сертификати талаб қилинади</span></label>
              {hrForm.certificateRequired ? <label><span>Сертификат рақами</span><input value={hrForm.certificateNumber} onChange={e=>setHrForm({...hrForm,certificateNumber:e.target.value})}/></label> : null}
              <button className="users-primary" disabled={hrSaving}>Карточкани сақлаш</button>
            </form>
            <div className="users-form">
              <strong>Меҳнат шартномаси лойиҳаси</strong><p style={{fontSize:12,color:"#777"}}>Корхона реквизитлари ва стандарт иш шартлари автоматик олинади. Махсус шартлар бўлса қуйида ўзгартиринг.</p>
              <label><span>Шартнома рақами</span><input value={hrNumber} onChange={e=>setHrNumber(e.target.value)}/></label>
              <label><span>Иш бошлаш санаси</span><input type="date" value={hrStartDate} onChange={e=>setHrStartDate(e.target.value)}/></label>
              <label><span>Тугаш санаси (ихтиёрий)</span><input type="date" value={hrEndDate} onChange={e=>setHrEndDate(e.target.value)}/></label>
              <details style={{border:'1px solid #dfe3e8',borderRadius:10,padding:12}}>
                <summary style={{cursor:'pointer',fontWeight:700,marginBottom:12}}>Индивидуал шартлар (зарур бўлса очинг)</summary>
                <div className="users-form-grid">
                  {hrOverrideFields.map(([key,label]) => <label key={key}><span>{label}</span><input value={hrDetails[key] || ''} onChange={e=>updateHrDetail(key,e.target.value)} /></label>)}
                </div>
                <p style={{fontSize:12,color:'#777'}}>Бўш қолдирилган индивидуал майдонлар корхона созламаларидан автоматик олинади. Фақат ходим учун фарқ қилса тўлдиринг. Аввал ходим карточкасини сақланг.</p>
              </details>
              <label><span>Қўшимча шартлар (лойиҳа)</span><textarea rows={3} maxLength={4000} value={hrNotes} onChange={e=>setHrNotes(e.target.value)}/></label>
              <button type="button" className="users-secondary" disabled={hrSaving||!hrNumber.trim()||!hrProfile} onClick={createHrDraft}>Лойиҳани сақлаш</button>
              {(hrProfile?.laborContracts||[]).map(c=><div key={c.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:10}}><span>{c.contractNumber} — {c.status}</span><button type="button" className="users-secondary" onClick={()=>printHrDraft(c)}>Кўриш / PDF</button></div>)}
              <p style={{fontSize:12,color:'#777'}}>«Кўриш / PDF» босилганда босмага мос лойиҳа очилади. Браузернинг «Чоп этиш → PDF сифатида сақлаш» функциясидан фойдаланинг. Бу имзоланган ёки ҳуқуқий жиҳатдан тўлиқ тасдиқланган шартнома эмас.</p>
            </div>
          </section>
        </div>
      ) : null}
      {modalOpen ? (
        <div className="users-modal-backdrop">
          <section className="users-modal">
            <div className="users-modal-head">
              <div>
                <span>Ходим</span>
                <h3>{editingId ? 'Ходимни таҳрирлаш' : 'Янги ходим'}</h3>
              </div>
              <button type="button" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form className="users-form" onSubmit={save}>
              <div className="users-form-grid">
                <label>
                  <span>Ф.И.Ш.</span>
                  <input
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  <span>Роли</span>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value })
                    }
                  >
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Телефон</span>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Логин</span>
                  <input
                    value={form.login}
                    onChange={(e) =>
                      setForm({ ...form, login: e.target.value })
                    }
                    required={!editingId}
                    disabled={Boolean(editingId)}
                  />
                </label>

                <label>
                  <span>
                    {editingId
                      ? 'Янги пароль (ихтиёрий)'
                      : 'Пароль (ихтиёрий)'}
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Филиал</span>
                  <select
                    value={form.branchId}
                    onChange={(e) =>
                      setForm({ ...form, branchId: e.target.value })
                    }
                  >
                    <option value="">— Танланмаган —</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                        {branch.city ? ` (${branch.city})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Ҳолат</span>
                  <select
                    value={form.isActive ? '1' : '0'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isActive: e.target.value === '1',
                      })
                    }
                  >
                    <option value="1">Фаол</option>
                    <option value="0">Блокланган</option>
                  </select>
                </label>
              </div>

              <p style={{ margin: '-4px 0 4px', color: '#7d838b', fontSize: 12, lineHeight: 1.6 }}>
                Паролни бўш қолдирсангиз, ходим Golden Key OS ботида
                телефонини боғлаб, CRM логин саҳифасидаги "Паролни
                унутдингизми ёки биринчи марта кираяпсизми?" тугмаси орқали
                ўзи ўрнатади.
              </p>

              <button className="users-primary" disabled={saving}>
                <ShieldCheck size={17} />
                {saving
                  ? 'Сақланмоқда...'
                  : editingId
                  ? 'Ўзгаришларни сақлаш'
                  : 'Ходимни қўшиш'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
