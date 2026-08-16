import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  Phone,
  RefreshCw,
  Send,
  Target,
  UserRoundCheck,
  UserX,
  XCircle,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

const SOURCE_LABELS = {
  TELEGRAM: 'Telegram',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  DIRECT: 'Тўғридан-тўғри',
  CRM: 'CRM',
};

const STEP_LABELS = {
  STARTED: 'Ботга кирган',
  APPLICATION_STARTED: 'Мурожаатни бошлаган',
  PHONE_SENT: 'Телефонни юборган',
  PHONE_LINKED: 'Телефон боғланган',
  SERVICE_SELECTED: 'Хизмат танлаган',
  AMOUNT_ENTERED: 'Сумма киритган',
  COMMENT_DONE: 'Изоҳ босқичи',
  NAME_ENTERED: 'Ф.И.Ш. киритган',
  CONFIRMATION_REACHED: 'Тасдиқлашга етган',
  CASE_CREATED: 'Мурожаат юборган',
  CANCELLED: 'Ўзи бекор қилган',
};

function sourceLabel(value) {
  return SOURCE_LABELS[value] || value || 'Номаълум';
}

function campaignLabel(value) {
  if (!value || value === 'direct') {
    return 'Тўғридан-тўғри';
  }
  return value;
}

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <article>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={19} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {note ? (
        <small style={{ display: 'block', marginTop: 6, opacity: 0.7 }}>
          {note}
        </small>
      ) : null}
    </article>
  );
}

export function MarketingStatsPage() {
  const [data, setData] = useState({
    summary: {
      total: 0,
      signedContracts: 0,
      completed: 0,
      rejected: 0,
      contractConversion: 0,
      completedConversion: 0,
      bySource: {},
    },
    campaigns: [],
  });

  const [funnel, setFunnel] = useState([]);
  const [abandoned, setAbandoned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [caseStats, funnelStats] = await Promise.all([
        apiRequest('/cases/marketing-stats'),
        apiRequest('/cases/marketing-funnel'),
      ]);

      setData({
        summary: caseStats.summary || {},
        campaigns: Array.isArray(caseStats.campaigns)
          ? caseStats.campaigns
          : [],
      });

      setFunnel(
        Array.isArray(funnelStats.items)
          ? funnelStats.items
          : []
      );

      setAbandoned(
        Array.isArray(funnelStats.abandoned)
          ? funnelStats.abandoned
          : []
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          'Реклама статистикасини юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const funnelSummary = useMemo(
    () =>
      funnel.reduce(
        (acc, row) => {
          acc.botStarts += Number(row.botStarts || 0);
          acc.applicationStarted += Number(
            row.applicationStarted || 0
          );
          acc.phoneLinked += Number(row.phoneLinked || 0);
          acc.serviceSelected += Number(
            row.serviceSelected || 0
          );
          acc.confirmationReached += Number(
            row.confirmationReached || 0
          );
          acc.casesCreated += Number(
            row.casesCreated || 0
          );
          acc.abandoned += Number(row.abandoned || 0);
          acc.completed += Number(row.completed || 0);
          return acc;
        },
        {
          botStarts: 0,
          applicationStarted: 0,
          phoneLinked: 0,
          serviceSelected: 0,
          confirmationReached: 0,
          casesCreated: 0,
          abandoned: 0,
          completed: 0,
        }
      ),
    [funnel]
  );

  if (loading) {
    return (
      <section className="panel">
        <div className="table-loader">
          <LoaderCircle className="spin" size={34} />
          <strong>Реклама статистикаси юкланмоқда...</strong>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <div className="page-error">
          <strong>Маълумотларни олиб бўлмади</strong>
          <span>{error}</span>
          <button type="button" onClick={loadStats}>
            Қайта уриниш
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Telegram бот воронкаси</h2>
            <p>
              Ботга киришдан мурожаат якунлангунгача бўлган ҳаракатлар.
            </p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={loadStats}
            title="Янгилаш"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <section className="cards" style={{ padding: 0 }}>
          <StatCard
            icon={Send}
            label="Ботга кирган"
            value={funnelSummary.botStarts}
            note="Start босган уникал tracking"
          />
          <StatCard
            icon={Target}
            label="Мурожаатни бошлаган"
            value={funnelSummary.applicationStarted}
            note="Янги мурожаат тугмасини босган"
          />
          <StatCard
            icon={Phone}
            label="Телефон"
            value={funnelSummary.phoneLinked}
            note="Телефон маълумоти олинган"
          />
          <StatCard
            icon={UserRoundCheck}
            label="Хизмат танлаган"
            value={funnelSummary.serviceSelected}
            note="Ипотека/микроқарз ва ҳ.к."
          />
          <StatCard
            icon={FileCheck2}
            label="Тасдиқлашга етган"
            value={funnelSummary.confirmationReached}
            note="Юбориш тугмасигача етган"
          />
          <StatCard
            icon={CheckCircle2}
            label="Мурожаат юборган"
            value={funnelSummary.casesCreated}
            note={
              funnelSummary.botStarts
                ? `${Math.round(
                    (funnelSummary.casesCreated /
                      funnelSummary.botStarts) *
                      1000
                  ) / 10}% конверсия`
                : '0% конверсия'
            }
          />
          <StatCard
            icon={UserX}
            label="Ташлаб кетган"
            value={funnelSummary.abandoned}
            note="30+ дақиқа давом эттирмаган"
          />
        </section>

        {funnel.length > 0 ? (
          <div className="table-scroll" style={{ marginTop: 18 }}>
            <table className="cases-table">
              <thead>
                <tr>
                  <th>Манба</th>
                  <th>Кампания</th>
                  <th>Start</th>
                  <th>Бошлади</th>
                  <th>Телефон</th>
                  <th>Хизмат</th>
                  <th>Тасдиқ</th>
                  <th>Мурожаат</th>
                  <th>Ташлаб кетди</th>
                  <th>Конверсия</th>
                </tr>
              </thead>

              <tbody>
                {funnel.map((row) => (
                  <tr
                    key={`${row.source}-${row.campaign}-${row.startParameter}`}
                  >
                    <td>
                      <strong>{sourceLabel(row.source)}</strong>
                    </td>
                    <td>
                      <div className="client-cell">
                        <strong>
                          {campaignLabel(row.campaign)}
                        </strong>
                        <span>
                          {row.startParameter || '—'}
                        </span>
                      </div>
                    </td>
                    <td>{row.botStarts || 0}</td>
                    <td>{row.applicationStarted || 0}</td>
                    <td>{row.phoneLinked || 0}</td>
                    <td>{row.serviceSelected || 0}</td>
                    <td>{row.confirmationReached || 0}</td>
                    <td>{row.casesCreated || 0}</td>
                    <td>{row.abandoned || 0}</td>
                    <td>
                      <strong>{row.caseConversion || 0}%</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Ботни охиригача тўлдирмаганлар</h2>
            <p>
              30 дақиқадан ортиқ фаол бўлмаган ва CRM мурожаати яратилмаган
              фойдаланувчилар.
            </p>
          </div>
        </div>

        {abandoned.length === 0 ? (
          <div className="empty">
            <UserX size={40} />
            <strong>Ҳозирча ташлаб кетганлар йўқ</strong>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>Telegram</th>
                  <th>Манба</th>
                  <th>Кампания</th>
                  <th>Қаерда тўхтаган</th>
                  <th>Хизмат</th>
                  <th>Фаол эмас</th>
                  <th>Эслатма</th>
                </tr>
              </thead>

              <tbody>
                {abandoned.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="client-cell">
                        <strong>
                          {item.fullName ||
                            item.username ||
                            `ID ${item.telegramId}`}
                        </strong>
                        <span>
                          {item.username
                            ? `@${item.username}`
                            : `TG: ${item.telegramId}`}
                        </span>
                      </div>
                    </td>
                    <td>{sourceLabel(item.source)}</td>
                    <td>
                      <div className="client-cell">
                        <strong>
                          {campaignLabel(item.campaign)}
                        </strong>
                        <span>{item.startParameter || '—'}</span>
                      </div>
                    </td>
                    <td>
                      {STEP_LABELS[item.funnelStep] ||
                        item.funnelStep ||
                        'Ботга кириш'}
                    </td>
                    <td>{item.serviceType || '—'}</td>
                    <td>{item.minutesIdle || 0} дақиқа</td>
                    <td>
                      {item.reminderSentAt
                        ? 'Юборилган'
                        : 'Кутилмоқда'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="cards">
        <StatCard
          icon={Target}
          label="Реклама мурожаатлари"
          value={data.summary?.total || 0}
          note="Манбаси аниқланган мурожаатлар"
        />
        <StatCard
          icon={FileCheck2}
          label="Шартнома имзоланган"
          value={data.summary?.signedContracts || 0}
          note={`${data.summary?.contractConversion || 0}% конверсия`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Якунланган"
          value={data.summary?.completed || 0}
          note={`${data.summary?.completedConversion || 0}% конверсия`}
        />
        <StatCard
          icon={XCircle}
          label="Рад этилган"
          value={data.summary?.rejected || 0}
          note="Реклама орқали келган мурожаатлардан"
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Кампаниялар самарадорлиги</h2>
            <p>
              Ҳар бир реклама кампаниясидан келган мурожаат ва натижа.
            </p>
          </div>
        </div>

        {data.campaigns.length === 0 ? (
          <div className="empty">
            <BarChart3 size={40} />
            <strong>Кампаниялар ҳали йўқ</strong>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>Манба</th>
                  <th>Кампания</th>
                  <th>Мурожаат</th>
                  <th>Шартнома</th>
                  <th>Якунланган</th>
                  <th>Рад этилган</th>
                  <th>Конверсия</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((row) => (
                  <tr
                    key={`${row.source}-${row.campaign}`}
                  >
                    <td>
                      <strong>
                        {sourceLabel(row.source)}
                      </strong>
                    </td>
                    <td>
                      <div className="client-cell">
                        <strong>
                          {campaignLabel(row.campaign)}
                        </strong>
                        <span>
                          {row.startParameter || '—'}
                        </span>
                      </div>
                    </td>
                    <td>{row.total || 0}</td>
                    <td>{row.signedContracts || 0}</td>
                    <td>{row.completed || 0}</td>
                    <td>{row.rejected || 0}</td>
                    <td>
                      <div className="client-cell">
                        <strong>
                          {row.completedConversion || 0}%
                        </strong>
                        <span>
                          Шартнома:{' '}
                          {row.contractConversion || 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
