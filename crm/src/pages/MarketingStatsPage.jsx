import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  Send,
  Target,
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest('/cases/marketing-stats');

      setData({
        summary: response.summary || {},
        campaigns: Array.isArray(response.campaigns)
          ? response.campaigns
          : [],
      });
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

  const sourceRows = useMemo(() => {
    const bySource = data.summary?.bySource || {};

    return Object.entries(bySource)
      .map(([source, total]) => ({
        source,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [data.summary]);

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

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Манбалар кесимида</h2>
            <p>Қайси канал орқали кўпроқ мурожаат келаётгани.</p>
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

        {sourceRows.length === 0 ? (
          <div className="empty">
            <Send size={40} />
            <strong>Ҳозирча реклама манбаси йўқ</strong>
            <span>
              Tracking ҳаволаси орқали янги мурожаат келганда статистика
              шу ерда чиқади.
            </span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>Манба</th>
                  <th>Мурожаатлар</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((row) => (
                  <tr key={row.source}>
                    <td>
                      <strong>{sourceLabel(row.source)}</strong>
                    </td>
                    <td>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Кампаниялар самарадорлиги</h2>
            <p>
              Ҳар бир реклама кампаниясидан нечта мурожаат, шартнома ва
              якунланган иш келгани.
            </p>
          </div>
        </div>

        {data.campaigns.length === 0 ? (
          <div className="empty">
            <BarChart3 size={40} />
            <strong>Кампаниялар ҳали йўқ</strong>
            <span>
              Масалан: telegram_ipoteka_01 орқали мурожаат келганда бу ерда
              кўринади.
            </span>
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
                  <tr key={`${row.source}-${row.campaign}`}>
                    <td>
                      <strong>{sourceLabel(row.source)}</strong>
                    </td>

                    <td>
                      <div className="client-cell">
                        <strong>{campaignLabel(row.campaign)}</strong>
                        <span>{row.startParameter || '—'}</span>
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
                          Шартнома: {row.contractConversion || 0}%
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
