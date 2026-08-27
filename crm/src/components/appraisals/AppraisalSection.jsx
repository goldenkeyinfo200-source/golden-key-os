import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Image,
  LoaderCircle,
  RefreshCw,
  Send,
  Upload,
} from 'lucide-react';

import { apiRequest } from '../../services/api.js';

const STATUS = {
  SENT: 'Юборилган',
  ACCEPTED: 'Қабул қилинган',
  IN_PROGRESS: 'Иш жараёнида',
  REPORT_READY: 'Ҳисобот тайёр',
  COMPLETED: 'Якунланган',
  CANCELLED: 'Бекор қилинган',
};

export function AppraisalSection({ caseId, caseItem }) {
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [documentIds, setDocumentIds] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const serviceType = caseItem?.serviceType || '';
  const isAppraisalService = [
    'PRIMARY_MORTGAGE',
    'SECONDARY_MORTGAGE',
    'MICROLOAN',
  ].includes(serviceType);

  const propertyInfo = useMemo(() => ({
    type: caseItem?.collateralType || '—',
    address: caseItem?.collateralAddress || '—',
    cadastralNumber: caseItem?.collateralCadastreNumber || '—',
    ownerFullName: caseItem?.collateralOwnerFullName || '—',
    ownerPinfl: caseItem?.collateralOwnerPinfl || '—',
    area: caseItem?.collateralArea ? `${caseItem.collateralArea} м²` : '—',
    estimatedValue: caseItem?.collateralEstimatedValue
      ? `${new Intl.NumberFormat('uz-UZ').format(Number(caseItem.collateralEstimatedValue))} сўм`
      : '—',
  }), [caseItem]);

  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError('');
    try {
      const [companiesData, documentsData, requestData] = await Promise.all([
        apiRequest('/appraisals/companies'),
        apiRequest(`/documents/case/${caseId}`),
        apiRequest(`/appraisals/case/${caseId}`),
      ]);
      setCompanies(companiesData.items || []);
      setDocuments(documentsData.items || []);
      setRequests(requestData.items || []);
    } catch (e) {
      setError(e.message || 'Баҳолаш маълумотларини юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const toggleDoc = (id) => {
    setDocumentIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  const createRequest = async (event) => {
    event.preventDefault();
    if (!companyId) {
      setError('Баҳолаш компаниясини танланг.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await apiRequest(`/appraisals/case/${caseId}`, {
        method: 'POST',
        body: JSON.stringify({ companyId, documentIds, note }),
      });
      setCompanyId('');
      setDocumentIds([]);
      setNote('');
      await load();
    } catch (e) {
      setError(e.message || 'Заявкани юбориб бўлмади.');
    } finally {
      setSending(false);
    }
  };

  const uploadFile = async (requestId, file, kind) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('Файл ҳажми 20 МБдан ошмаслиги керак.');
      return;
    }
    setUploadingId(requestId);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      await apiRequest(`/appraisals/requests/${requestId}/files`, {
        method: 'POST',
        body: form,
      });
      await load();
    } catch (e) {
      setError(e.message || 'Файлни юклаб бўлмади.');
    } finally {
      setUploadingId(null);
    }
  };

  const downloadReport = async (report) => {
    if (!report?.fileUrl) return;

    setDownloadingId(report.id);
    setError('');

    try {
      const response = await fetch(report.fileUrl);
      if (!response.ok) {
        throw new Error('Ҳисобот файлини олиб бўлмади.');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = report.fileName || 'appraisal-report.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      // Агар браузер cross-origin юклаб олишни чекласа,
      // signed URL'ни янги ойнада очамиз.
      window.open(report.fileUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!caseId || !isAppraisalService) {
    return null;
  }

  if (loading) {
    return (
      <section className="panel details-section">
        <div className="details-empty-block">
          <LoaderCircle className="spin" size={30} />
          <strong>Баҳолаш модули юкланмоқда...</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="panel details-section">
      <div className="details-section-head">
        <div>
          <span className="section-kicker">Баҳолаш</span>
          <h3>Баҳолаш компаниясига заявка</h3>
          <p>Ҳужжатлар ва мулк расмларини баҳоловчига юборинг.</p>
        </div>
        <Building2 size={22} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 9,
          marginBottom: 15,
          padding: 12,
          borderRadius: 11,
          background: '#fafafa',
          border: '1px solid #ececec',
        }}
      >
        {[
          ['Мулк тури', propertyInfo.type],
          ['Кадастр рақами', propertyInfo.cadastralNumber],
          ['Мулкдор', propertyInfo.ownerFullName],
          ['Мулкдор ЖШШИР', propertyInfo.ownerPinfl],
          ['Майдони', propertyInfo.area],
          ['Тахминий қиймати', propertyInfo.estimatedValue],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'grid', gap: 3 }}>
            <span style={{ color: '#7b7f86', fontSize: 11 }}>{label}</span>
            <strong style={{ fontSize: 12 }}>{value}</strong>
          </div>
        ))}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 3 }}>
          <span style={{ color: '#7b7f86', fontSize: 11 }}>Мулк манзили</span>
          <strong style={{ fontSize: 12 }}>{propertyInfo.address}</strong>
        </div>
      </div>

      {propertyInfo.address === '—' && propertyInfo.cadastralNumber === '—' ? (
        <div className="form-error" style={{ marginBottom: 12 }}>
          Аввал юқоридаги «Гаровга олинаётган мулк маълумотлари» бўлимида мулк манзили ёки кадастр рақамини киритинг.
        </div>
      ) : null}

      <form onSubmit={createRequest} style={{ display: 'grid', gap: 13 }}>
        <label className="field">
          <span>Баҳолаш компанияси</span>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">— Компанияни танланг —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <div>
          <strong style={{ fontSize: 12 }}>Юбориладиган ҳужжатлар</strong>
          {documents.length ? (
            <div style={{ display: 'grid', gap: 7, marginTop: 8 }}>
              {documents.map((doc) => (
                <label
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 9,
                    border: '1px solid #e7e7e7',
                    borderRadius: 9,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={documentIds.includes(doc.id)}
                    onChange={() => toggleDoc(doc.id)}
                  />
                  <FileText size={16} />
                  <span style={{ fontSize: 12 }}>
                    {doc.fileName || doc.type}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="executor-note">Мурожаатда ҳужжатлар ҳали йўқ.</p>
          )}
        </div>

        <label className="field">
          <span>Изоҳ</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Баҳоловчи учун қўшимча маълумот..."
          />
        </label>

        {error ? <div className="form-error">{error}</div> : null}

        <button
          className="primary"
          type="submit"
          disabled={
            sending ||
            !companyId ||
            (propertyInfo.address === '—' && propertyInfo.cadastralNumber === '—')
          }
        >
          {sending ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
          {sending ? 'Юборилмоқда...' : 'Баҳолашга юбориш'}
        </button>
      </form>

      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {requests.map((request) => {
          const reports = (request.files || []).filter((f) => f.kind === 'REPORT');
          const photos = (request.files || []).filter((f) => f.kind === 'PROPERTY_PHOTO');

          return (
            <article
              key={request.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 14,
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{request.displayId}</strong>
                  <div style={{ color: '#777', fontSize: 11, marginTop: 3 }}>
                    {request.company?.name}
                  </div>
                </div>
                <span className="status-badge status-progress">
                  {STATUS[request.status] || request.status}
                </span>
              </div>

              <div style={{ fontSize: 11, color: '#666' }}>
                Юборилган ҳужжатлар: {request.documents?.length || request._count?.documents || 0} ·
                Мулк расмлари: {photos.length}
              </div>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  width: 'fit-content',
                  padding: '8px 10px',
                  border: '1px solid #ddd',
                  borderRadius: 9,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {uploadingId === request.id ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Image size={16} />
                )}
                Мулк расмини юклаш (20 МБгача)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  disabled={uploadingId === request.id}
                  onChange={(e) => uploadFile(request.id, e.target.files?.[0], 'PROPERTY_PHOTO')}
                />
              </label>

              {reports.length ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="details-list-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <CheckCircle2 size={17} />

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong>Баҳолаш ҳисоботи тайёр</strong>
                        <span>{report.fileName || 'appraisal-report.pdf'}</span>
                      </div>

                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        <a
                          href={report.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="secondary-button"
                        >
                          <Eye size={15} />
                          Кўриш
                        </a>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => downloadReport(report)}
                          disabled={downloadingId === report.id}
                        >
                          {downloadingId === report.id ? (
                            <LoaderCircle className="spin" size={15} />
                          ) : (
                            <Download size={15} />
                          )}
                          {downloadingId === report.id
                            ? 'Юкланмоқда...'
                            : 'Ҳисоботни юклаб олиш'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}

        {!requests.length ? (
          <div className="details-empty-block">
            <RefreshCw size={28} />
            <strong>Баҳолаш заявкаси ҳали юборилмаган</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}
