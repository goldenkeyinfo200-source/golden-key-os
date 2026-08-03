const htmlEscapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    return htmlEscapeMap[character];
  });
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return escapeHtml(value);
  }

  return `${new Intl.NumberFormat('uz-UZ').format(amount)} сўм`;
}

export function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Tashkent',
  }).format(date);
}

export function defaultContractHtml() {
  return `
    <article class="contract-document">
      <header>
        <h1>РИЭЛТОРЛИК ВА ИПОТЕКА ХИЗМАТЛАРИНИ КЎРСАТИШ ТЎҒРИСИДА ЭЛЕКТРОН ШАРТНОМА</h1>
        <p><strong>Шартнома рақами:</strong> {{contractDisplayId}}</p>
        <p><strong>Мурожаат рақами:</strong> {{caseDisplayId}}</p>
        <p><strong>Тузилган жой:</strong> Қўқон шаҳри</p>
        <p><strong>Сана:</strong> {{contractDate}}</p>
      </header>

      <section>
        <h2>1. ТАРАФЛАР</h2>
        <p>
          Бир томондан «GOLDEN KEY INFO» масъулияти чекланган жамияти,
          кейинги ўринларда «Ижрочи» деб аталувчи, жамият раҳбари
          Таджибаев Азим Иркинджанович номидан, иккинчи томондан
          {{clientFullName}}, кейинги ўринларда «Мижоз» деб аталувчи шахс,
          биргаликда «Тарафлар» деб аталиб, ушбу шартномани туздилар.
        </p>
        <p>
          Ижрочи «KAFOLAT» Суғурта компанияси АЖ томонидан 29.08.2025 куни
          берилган фуқаролик жавобгарлиги тўғрисидаги 0077162-сонли
          суғурта полисига эга.
        </p>
      </section>

      <section>
        <h2>2. ШАРТНОМА ПРЕДМЕТИ</h2>
        <p>
          2.1. Ижрочи Мижозга кўчмас мулк, ипотека, микрозайм, банк
          таклифларини танлаш, ҳужжатларни тайёрлаш ва жараённи
          мувофиқлаштириш бўйича ахборот, маслаҳат ҳамда ташкилий хизматлар
          кўрсатади.
        </p>
        <p>
          2.2. Ушбу шартнома бўйича хизмат тури: <strong>{{serviceType}}</strong>.
        </p>
        <p>
          2.3. Сўралган сумма: <strong>{{requestedAmount}}</strong>.
          Тасдиқланган сумма: <strong>{{approvedAmount}}</strong>.
          Танланган банк: <strong>{{bankName}}</strong>.
        </p>
        <p>
          2.4. Банк ёки бошқа молия ташкилотининг кредит бериш, рад этиш,
          шартларни ўзгартириш ёки қўшимча ҳужжат талаб қилиш тўғрисидаги
          қарори Ижрочининг кафолати ҳисобланмайди.
        </p>
      </section>

      <section>
        <h2>3. ИЖРОЧИНИНГ ҲУҚУҚ ВА МАЖБУРИЯТЛАРИ</h2>
        <p>3.1. Ижрочи қуйидагиларни бажариши шарт:</p>
        <p>
          — Мижоз тақдим этган маълумот ва ҳужжатларни қабул қилиш;<br/>
          — ҳужжатларни дастлабки текшириш ва камчиликлар ҳақида хабар бериш;<br/>
          — банк ёки ҳамкор ташкилотларга тақдим этиш учун зарур ҳужжатларни тайёрлаш;<br/>
          — банк таклифларини Мижозга етказиш ва танланган таклиф бўйича жараённи мувофиқлаштириш;<br/>
          — хизмат жараёнининг ҳолати ҳақида Мижозни хабардор қилиб бориш;<br/>
          — шахсга доир маълумотларни махфий сақлаш ва фақат хизмат мақсадида қайта ишлаш.
        </p>
        <p>3.2. Ижрочи қуйидаги ҳуқуқларга эга:</p>
        <p>
          — қўшимча маълумот ва ҳужжатларни талаб қилиш;<br/>
          — нотўғри, тўлиқ бўлмаган ёки шубҳали маълумот берилганда хизматни вақтинча тўхтатиш;<br/>
          — хизмат ҳақи тўланмаган ҳолда кейинги босқичларни тўхтатиб туриш;<br/>
          — Мижознинг розилиги асосида маълумотларни банк ва ҳамкор ташкилотларга тақдим этиш.
        </p>
      </section>

      <section>
        <h2>4. МИЖОЗНИНГ ҲУҚУҚ ВА МАЖБУРИЯТЛАРИ</h2>
        <p>4.1. Мижоз қуйидагиларни бажариши шарт:</p>
        <p>
          — ҳаққоний, тўлиқ ва амалдаги маълумотларни тақдим этиш;<br/>
          — талаб қилинган ҳужжатларни ўз вақтида бериш;<br/>
          — паспорт, ЖШШИР, телефон ва манзил маълумотлари ўзгарганда Ижрочига хабар бериш;<br/>
          — танланган хизмат ва тариф бўйича хизмат ҳақини белгиланган тартибда тўлаш;<br/>
          — шартномани шахсан ўқиб чиқиш ва бир марталик QR ҳаволаси орқали тасдиқлаш.
        </p>
        <p>4.2. Мижоз қуйидаги ҳуқуқларга эга:</p>
        <p>
          — хизмат жараёни ва банк таклифлари ҳақида маълумот олиш;<br/>
          — таклифларни қабул қилиш ёки рад этиш;<br/>
          — иш бажарилиши бошланишидан олдин хизматдан воз кечиш;<br/>
          — тасдиқланган шартноманинг PDF нусхасини олиш.
        </p>
      </section>

      <section>
        <h2>5. ХИЗМАТ ҲАҚИ ВА ҲИСОБ-КИТОБ</h2>
        <p>
          5.1. Ижрочининг хизмат ҳақи тасдиқланган кредит суммасининг
          <strong>{{serviceFeePercent}} фоизини</strong> ташкил этади.
        </p>
        <p>
          5.2. Тасдиқланган кредит суммаси:
          <strong>{{approvedAmount}}</strong>.
          Автоматик ҳисобланган хизмат ҳақи:
          <strong>{{serviceFeeAutoAmount}}</strong>.
          Мазкур шартнома бўйича якуний хизмат ҳақи:
          <strong>{{serviceFee}}</strong>.
        </p>
        <p>
          5.3. Хизмат ҳақи Мижозга олдиндан маълум қилинади ва CRM тизимида
          қайд этилади. Тўлов нақд, банк ўтказмаси ёки қонунчиликда рухсат
          этилган бошқа усулда амалга оширилиши мумкин.
        </p>
        <p>
          5.4. Банк, нотариус, баҳоловчи, суғурта ташкилоти ва бошқа учинчи
          шахсларнинг алоҳида харажатлари, агар бошқача келишилмаган бўлса,
          хизмат ҳақига кирмайди.
        </p>
      </section>


      <section>
        <h2>6. ГАРОВГА ОЛИНАЁТГАН МУЛК МАЪЛУМОТЛАРИ</h2>
        <p><strong>Мулк тури:</strong> {{collateralType}}</p>
        <p><strong>Манзили:</strong> {{collateralAddress}}</p>
        <p><strong>Кадастр рақами:</strong> {{collateralCadastreNumber}}</p>
        <p><strong>Мулкдор Ф.И.Ш.:</strong> {{collateralOwnerFullName}}</p>
        <p><strong>Мулкдор ЖШШИРи:</strong> {{collateralOwnerPinfl}}</p>
        <p><strong>Умумий майдони:</strong> {{collateralArea}}</p>
        <p><strong>Баҳоланган қиймати:</strong> {{collateralEstimatedValue}}</p>
        <p><strong>Қўшимча маълумот:</strong> {{collateralNotes}}</p>
        <p>
          6.1. Мижоз гаров мулкига оид тақдим этилган маълумот ва
          ҳужжатларнинг ҳаққонийлиги учун жавоб беради.
        </p>
        <p>
          6.2. Мулкнинг якуний гаров қиймати банк, лицензияга эга баҳоловчи
          ташкилот ва тегишли ваколатли органлар хулосаси асосида белгиланади.
        </p>
      </section>

      <section>
        <h2>6. ШАХСГА ДОИР МАЪЛУМОТЛАР ВА МАХФИЙЛИК</h2>
        <p>
          6.1. Мижоз ушбу шартномани бажариш мақсадида ўзининг Ф.И.Ш.,
          паспорт маълумотлари, ЖШШИР, телефон рақами, манзили, Telegram ID,
          ҳужжатлари ва мурожаатга оид бошқа маълумотларига ишлов беришга
          розилик беради.
        </p>
        <p>
          6.2. Маълумотлар хизмат кўрсатиш, банк ва ҳамкор ташкилотларга
          мурожаат юбориш, шартнома ва PDF ҳужжат тайёрлаш, ҳолат ҳақида
          хабар бериш ҳамда қонунчилик талабларини бажариш мақсадида
          ишлатилади.
        </p>
        <p>
          6.3. Ижрочи маълумотларни учинчи шахсларга хизмат мақсадидан ташқари
          тарқатмаслик чораларини кўради.
        </p>
      </section>

      <section>
        <h2>7. ТАРАФЛАРНИНГ ЖАВОБГАРЛИГИ</h2>
        <p>
          7.1. Тарафлар шартнома мажбуриятларини бажармаганлиги ёки лозим
          даражада бажармаганлиги учун қонунчилик ва ушбу шартнома доирасида
          жавобгар бўладилар.
        </p>
        <p>
          7.2. Мижоз тақдим этган нотўғри, сохта ёки муддати ўтган ҳужжатлар
          оқибати учун Мижоз жавоб беради.
        </p>
        <p>
          7.3. Ижрочи банк, давлат органи ёки учинчи шахснинг мустақил қарори,
          ахборот тизимларидаги вақтинчалик техник носозлик ёки Мижозга боғлиқ
          кечикиш учун жавобгар эмас.
        </p>
      </section>

      <section>
        <h2>8. ФОРС-МАЖОР</h2>
        <p>
          Тарафлар табиий офат, ёнғин, уруш, давлат органлари чекловлари,
          алоқа ва ахборот тизимларидаги кенг кўламли узилишлар каби
          олдиндан кўриб бўлмайдиган ва Тарафлар иродасига боғлиқ бўлмаган
          ҳолатлар туфайли мажбуриятларни бажара олмаганлик учун жавобгар
          бўлмайдилар.
        </p>
      </section>

      <section>
        <h2>9. НИЗОЛАРНИ ҲАЛ ҚИЛИШ</h2>
        <p>
          9.1. Низолар, аввало, музокара ва ёзма мурожаат орқали ҳал қилинади.
        </p>
        <p>
          9.2. Келишувга эришилмаган тақдирда низо Ўзбекистон Республикаси
          қонунчилигида белгиланган тартибда кўриб чиқилади.
        </p>
      </section>

      <section>
        <h2>10. ЭЛЕКТРОН ТАСДИҚЛАШ ТАРТИБИ</h2>
        <p>
          10.1. Мижоз шартнома матнини шахсий қурилмасида очиб, мазмуни билан
          танишади ва «Тасдиқлайман» тугмасини босиш орқали розилигини
          электрон тарзда қайд этади.
        </p>
        <p>
          10.2. Тизим тасдиқланган сана ва вақт, бир марталик таклиф
          идентификатори, IP манзил ва қурилма/браузер маълумотларини аудит
          журналида сақлайди.
        </p>
        <p>
          10.3. Бир марталик тасдиқлаш ҳаволаси ишлатилганидан кейин қайта
          ишламайди.
        </p>
        <p>
          10.4. Мазкур QR орқали тасдиқ электрон розиликни қайд этиш усули
          ҳисобланади. Қонунчилик ёки муайян битим учун малакавий электрон
          рақамли имзо талаб этилса, алоҳида E-IMZO ёки бошқа ваколатли имзо
          воситаси қўлланилади.
        </p>
      </section>

      <section>
        <h2>11. ЯКУНИЙ ҚОИДАЛАР</h2>
        <p>
          11.1. Шартнома Мижоз электрон тасдиқ берган вақтдан кучга киради.
        </p>
        <p>
          11.2. Шартноманинг PDF нусхаси Golden Key OS тизимида ва электрон
          архивда сақланади ҳамда Мижозга Telegram ёки бошқа келишилган
          алоқа канали орқали юборилиши мумкин.
        </p>
        <p>
          11.3. Шартномага киритилган ўзгартишлар янги таҳрир ёки қўшимча
          келишув билан расмийлаштирилади.
        </p>
      </section>

      <section>
        <h2>12. МИЖОЗ МАЪЛУМОТЛАРИ</h2>
        <p><strong>Ф.И.Ш.:</strong> {{clientFullName}}</p>
        <p><strong>Телефон:</strong> {{clientPhone}}</p>
        <p><strong>ЖШШИР:</strong> {{clientPinfl}}</p>
        <p><strong>Паспорт:</strong> {{clientPassport}}</p>
        <p><strong>Манзил:</strong> {{clientAddress}}</p>
      </section>

      <section>
        <h2>13. ИЖРОЧИ РЕКВИЗИТЛАРИ</h2>
        <p><strong>Ташкилот:</strong> «GOLDEN KEY INFO» масъулияти чекланган жамияти</p>
        <p><strong>Манзил:</strong> Фарғона вилояти, Қўқон шаҳри, А. Т. Ҳўқандий мавзеси, 132-О</p>
        <p><strong>Банк:</strong> «Hamkorbank» АТБ Қўқон бўлими</p>
        <p><strong>Ҳисоб рақами:</strong> 2020 8000 8007 3423 9001</p>
        <p><strong>МФО:</strong> 00083</p>
        <p><strong>СТИР:</strong> 304692047</p>
        <p><strong>Телефон:</strong> +998 99 999 79 73</p>
        <p><strong>E-mail:</strong> goldenkeyinfo200@gmail.com</p>
        <p><strong>Саҳифа:</strong> www.taplink.cc/goldenkey</p>
        <p><strong>Раҳбар:</strong> Таджибаев Азим Иркинджанович</p>
        <p><strong>Суғурта:</strong> «KAFOLAT» Суғурта компанияси АЖ, 0077162-сонли полис, 29.08.2025</p>
        <p><strong>М.Ў.</strong> __________________ А. И. Таджибаев</p>
      </section>
    </article>
  `.trim();
}

export function renderContractHtml(templateHtml, context) {
  return String(templateHtml || defaultContractHtml()).replace(
    /\{\{([a-zA-Z0-9_]+)\}\}/g,
    (_match, key) => escapeHtml(context[key] ?? '—')
  );
}

export function buildContractContext({ contract, caseItem, selectedOffer }) {
  const applicant = caseItem.applicant || {};

  return {
    contractDisplayId: contract.displayId,
    caseDisplayId: caseItem.displayId,
    contractDate: formatDate(contract.createdAt),
    clientFullName: applicant.fullName || '—',
    clientPhone: applicant.phone || '—',
    clientPinfl: applicant.pinfl || '—',
    clientPassport:
      [applicant.passportSeries, applicant.passportNumber]
        .filter(Boolean)
        .join(' ') || '—',
    clientAddress: applicant.address || '—',
    serviceType: caseItem.serviceType || '—',
    requestedAmount: formatMoney(caseItem.requestedAmount),
    approvedAmount: formatMoney(
      selectedOffer?.approvedAmount ?? caseItem.approvedAmount
    ),
    bankName: selectedOffer?.bankName || caseItem.bankName || '—',
    serviceFeePercent:
      caseItem.serviceFeePercent !== null &&
      caseItem.serviceFeePercent !== undefined
        ? new Intl.NumberFormat('uz-UZ', {
            maximumFractionDigits: 3,
          }).format(Number(caseItem.serviceFeePercent))
        : '4,5',
    serviceFeeAutoAmount: formatMoney(caseItem.serviceFeeAutoAmount),
    serviceFee: formatMoney(caseItem.serviceFee),

    collateralType: caseItem.collateralType || '—',
    collateralAddress: caseItem.collateralAddress || '—',
    collateralCadastreNumber:
      caseItem.collateralCadastreNumber || '—',
    collateralOwnerFullName:
      caseItem.collateralOwnerFullName || '—',
    collateralOwnerPinfl:
      caseItem.collateralOwnerPinfl || '—',
    collateralArea:
      caseItem.collateralArea !== null &&
      caseItem.collateralArea !== undefined
        ? `${new Intl.NumberFormat('uz-UZ', {
            maximumFractionDigits: 2,
          }).format(Number(caseItem.collateralArea))} м²`
        : '—',
    collateralEstimatedValue: formatMoney(
      caseItem.collateralEstimatedValue
    ),
    collateralNotes: caseItem.collateralNotes || '—',
  };
}
