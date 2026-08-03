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
  }).format(date);
}

export function defaultContractHtml() {
  return `
    <article class="contract-document">
      <header>
        <h1>РИЭЛТОРЛИК ВА ИПОТЕКА ХИЗМАТЛАРИ ШАРТНОМАСИ</h1>
        <p><strong>Шартнома рақами:</strong> {{contractDisplayId}}</p>
        <p><strong>Мурожаат рақами:</strong> {{caseDisplayId}}</p>
        <p><strong>Сана:</strong> {{contractDate}}</p>
      </header>

      <section>
        <h2>1. Тарафлар</h2>
        <p>
          “GOLDEN KEY INFO” МЧЖ кейинги ўринларда “Ижрочи” деб аталади.
          {{clientFullName}} кейинги ўринларда “Мижоз” деб аталади.
        </p>
      </section>

      <section>
        <h2>2. Мижоз маълумотлари</h2>
        <p><strong>Ф.И.Ш.:</strong> {{clientFullName}}</p>
        <p><strong>Телефон:</strong> {{clientPhone}}</p>
        <p><strong>ЖШШИР:</strong> {{clientPinfl}}</p>
        <p><strong>Паспорт:</strong> {{clientPassport}}</p>
        <p><strong>Манзил:</strong> {{clientAddress}}</p>
      </section>

      <section>
        <h2>3. Хизмат маълумотлари</h2>
        <p><strong>Хизмат тури:</strong> {{serviceType}}</p>
        <p><strong>Сўралган сумма:</strong> {{requestedAmount}}</p>
        <p><strong>Тасдиқланган сумма:</strong> {{approvedAmount}}</p>
        <p><strong>Танланган банк:</strong> {{bankName}}</p>
        <p><strong>Хизмат ҳақи:</strong> {{serviceFee}}</p>
      </section>

      <section>
        <h2>4. Тасдиқлаш</h2>
        <p>
          Мижоз шартнома матни билан танишганини ва ундаги шартларни
          тушунганини тасдиқлайди.
        </p>
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
    serviceFee: formatMoney(caseItem.serviceFee),
  };
}
