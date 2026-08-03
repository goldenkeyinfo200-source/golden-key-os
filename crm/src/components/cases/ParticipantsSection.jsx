import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Home,
  LoaderCircle,
  Save,
  UserRound,
  WalletCards,
} from 'lucide-react';

import { apiRequest } from '../../services/api.js';

const EMPTY_PERSON = {
  fullName: '',
  phone: '',
  pinfl: '',
  passportSeries: '',
  passportNumber: '',
  birthDate: '',
  address: '',
};

function personFromClient(client) {
  return {
    fullName: client?.fullName || '',
    phone: client?.phone || '',
    pinfl: client?.pinfl || '',
    passportSeries: client?.passportSeries || '',
    passportNumber: client?.passportNumber || '',
    birthDate: client?.birthDate
      ? String(client.birthDate).slice(0, 10)
      : '',
    address: client?.address || '',
  };
}

function PersonFields({
  value,
  onChange,
  disabled,
  includeBirthDate = true,
}) {
  const set = (field, nextValue) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  return (
    <div className="participants-form-grid">
      <label className="participants-span-2">
        <span>Ф.И.Ш.</span>
        <input
          value={value.fullName}
          onChange={(event) => set('fullName', event.target.value)}
          disabled={disabled}
          required
        />
      </label>

      <label>
        <span>Телефон</span>
        <input
          value={value.phone}
          onChange={(event) => set('phone', event.target.value)}
          disabled={disabled}
        />
      </label>

      <label>
        <span>ЖШШИР</span>
        <input
          value={value.pinfl}
          onChange={(event) =>
            set('pinfl', event.target.value.replace(/\D/g, '').slice(0, 14))
          }
          inputMode="numeric"
          disabled={disabled}
        />
      </label>

      <label>
        <span>Паспорт серияси</span>
        <input
          value={value.passportSeries}
          onChange={(event) =>
            set('passportSeries', event.target.value.toUpperCase())
          }
          disabled={disabled}
        />
      </label>

      <label>
        <span>Паспорт рақами</span>
        <input
          value={value.passportNumber}
          onChange={(event) => set('passportNumber', event.target.value)}
          disabled={disabled}
        />
      </label>

      {includeBirthDate ? (
        <label>
          <span>Туғилган сана</span>
          <input
            type="date"
            value={value.birthDate}
            onChange={(event) => set('birthDate', event.target.value)}
            disabled={disabled}
          />
        </label>
      ) : null}

      <label className={includeBirthDate ? '' : 'participants-span-2'}>
        <span>Манзил</span>
        <input
          value={value.address}
          onChange={(event) => set('address', event.target.value)}
          disabled={disabled}
        />
      </label>
    </div>
  );
}

export function ParticipantsSection({ caseItem, onChanged }) {
  const applicant = caseItem?.applicant || {};
  const savedBorrower = caseItem?.borrowers?.[0]?.client || null;

  const [borrowerSame, setBorrowerSame] = useState(
    !savedBorrower || savedBorrower.id === applicant.id
  );
  const [borrower, setBorrower] = useState(
    personFromClient(savedBorrower || applicant)
  );

  const [ownerSame, setOwnerSame] = useState(
    !caseItem?.collateralOwnerFullName ||
      caseItem.collateralOwnerFullName ===
        (savedBorrower || applicant)?.fullName
  );

  const [owner, setOwner] = useState(EMPTY_PERSON);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const nextBorrower = caseItem?.borrowers?.[0]?.client || applicant;

    setBorrowerSame(
      !caseItem?.borrowers?.[0] || nextBorrower?.id === applicant?.id
    );
    setBorrower(personFromClient(nextBorrower));

    setOwner({
      fullName: caseItem?.collateralOwnerFullName || '',
      phone: caseItem?.collateralOwnerPhone || '',
      pinfl: caseItem?.collateralOwnerPinfl || '',
      passportSeries:
        caseItem?.collateralOwnerPassportSeries || '',
      passportNumber:
        caseItem?.collateralOwnerPassportNumber || '',
      birthDate: '',
      address: caseItem?.collateralOwnerAddress || '',
    });
  }, [caseItem]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiRequest(
        `/cases/${caseItem.id}/participants`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            borrowerSameAsApplicant: borrowerSame,
            borrower: borrowerSame ? null : borrower,
            collateralOwnerSameAsBorrower: ownerSame,
            collateralOwner: ownerSame ? null : owner,
          }),
        }
      );

      setSuccess('Учала иштирокчи маълумотлари сақланди.');
      await onChanged?.(data.item);
    } catch (requestError) {
      setError(
        requestError.message ||
          'Иштирокчилар маълумотларини сақлаб бўлмади.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel details-section participants-section">
      <style>{`
        .participants-section{overflow:visible}
        .participants-intro{margin:0;color:#7b818a;font-size:12px}
        .participants-role-card{display:grid;gap:14px;margin-top:15px;border:1px solid #e2e5e9;border-radius:13px;background:#fff;padding:15px}
        .participants-role-head{display:flex;align-items:center;gap:11px}
        .participants-role-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:11px;background:#fff1f2;color:#e5232f}
        .participants-role-head>div:nth-child(2){display:grid;gap:3px;flex:1}
        .participants-role-head span{color:#858b93;font-size:11px}
        .participants-applicant-grid,.participants-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .participants-applicant-grid>div{display:grid;gap:4px;border-radius:10px;background:#f7f8fa;padding:11px}
        .participants-applicant-grid span,.participants-form-grid label>span{color:#777e87;font-size:11px;font-weight:700}
        .participants-applicant-grid strong{font-size:13px;overflow-wrap:anywhere}
        .participants-form-grid label{display:grid;gap:7px;min-width:0}
        .participants-form-grid input{width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:10px;padding:11px 12px;font:inherit;outline:none}
        .participants-form-grid input:focus{border-color:#e5232f;box-shadow:0 0 0 3px rgba(229,35,47,.1)}
        .participants-span-2{grid-column:span 2}
        .participants-check{display:flex;align-items:center;gap:8px;color:#31353a;font-size:12px;font-weight:800;cursor:pointer}
        .participants-check input{width:17px;height:17px;accent-color:#e5232f}
        .participants-actions{display:flex;justify-content:flex-end;margin-top:16px}
        .participants-save{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:10px;padding:0 18px;background:#e5232f;color:#fff;font:inherit;font-size:13px;font-weight:900;cursor:pointer}
        .participants-message{margin-top:12px;border-radius:10px;padding:11px 12px;font-size:12px;font-weight:700}
        .participants-message.error{background:#fff0f1;color:#c9212c}
        .participants-message.success{background:#effbf4;color:#087742}
        @media(max-width:650px){.participants-applicant-grid,.participants-form-grid{grid-template-columns:1fr}.participants-span-2{grid-column:span 1}.participants-save{width:100%}}
      `}</style>

      <div className="details-section-head">
        <div>
          <span className="section-kicker">Иштирокчилар</span>
          <h3>Мурожаатчи, қарз олувчи ва гаров эгаси</h3>
          <p className="participants-intro">
            Учала шахс бир киши бўлиши ҳам, алоҳида шахслар бўлиши ҳам мумкин.
          </p>
        </div>
        <UserRound size={21} />
      </div>

      <form onSubmit={save}>
        <article className="participants-role-card">
          <div className="participants-role-head">
            <div className="participants-role-icon">
              <UserRound size={21} />
            </div>
            <div>
              <strong>1. Мурожаатчи</strong>
              <span>Golden Key’га мурожаат қилган шахс</span>
            </div>
            <CheckCircle2 size={20} color="#087742" />
          </div>

          <div className="participants-applicant-grid">
            <div><span>Ф.И.Ш.</span><strong>{applicant.fullName || '—'}</strong></div>
            <div><span>Телефон</span><strong>{applicant.phone || '—'}</strong></div>
            <div><span>ЖШШИР</span><strong>{applicant.pinfl || '—'}</strong></div>
            <div>
              <span>Паспорт</span>
              <strong>
                {[applicant.passportSeries, applicant.passportNumber]
                  .filter(Boolean)
                  .join(' ') || '—'}
              </strong>
            </div>
          </div>
        </article>

        <article className="participants-role-card">
          <div className="participants-role-head">
            <div className="participants-role-icon">
              <WalletCards size={21} />
            </div>
            <div>
              <strong>2. Қарз олувчи</strong>
              <span>Кредитни расман оладиган шахс</span>
            </div>
          </div>

          <label className="participants-check">
            <input
              type="checkbox"
              checked={borrowerSame}
              onChange={(event) => {
                setBorrowerSame(event.target.checked);
                if (event.target.checked) {
                  setBorrower(personFromClient(applicant));
                }
              }}
            />
            Мурожаатчининг ўзи қарз олувчи
          </label>

          {!borrowerSame ? (
            <PersonFields
              value={borrower}
              onChange={setBorrower}
              disabled={saving}
            />
          ) : null}
        </article>

        <article className="participants-role-card">
          <div className="participants-role-head">
            <div className="participants-role-icon">
              <Home size={21} />
            </div>
            <div>
              <strong>3. Гаров эгаси</strong>
              <span>Кадастрда мулк эгаси сифатида кўрсатилган шахс</span>
            </div>
          </div>

          <label className="participants-check">
            <input
              type="checkbox"
              checked={ownerSame}
              onChange={(event) => {
                setOwnerSame(event.target.checked);
                if (event.target.checked) {
                  setOwner(borrowerSame ? borrower : borrower);
                }
              }}
            />
            Қарз олувчининг ўзи гаров эгаси
          </label>

          {!ownerSame ? (
            <PersonFields
              value={owner}
              onChange={setOwner}
              disabled={saving}
              includeBirthDate={false}
            />
          ) : null}
        </article>

        {error ? (
          <div className="participants-message error">{error}</div>
        ) : null}

        {success ? (
          <div className="participants-message success">{success}</div>
        ) : null}

        <div className="participants-actions">
          <button
            type="submit"
            className="participants-save"
            disabled={saving}
          >
            {saving ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            {saving ? 'Сақланмоқда...' : 'Иштирокчиларни сақлаш'}
          </button>
        </div>
      </form>
    </section>
  );
}
