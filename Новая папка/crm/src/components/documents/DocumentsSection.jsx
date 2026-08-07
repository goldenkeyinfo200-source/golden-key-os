import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileImage,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import { apiRequest, USER_KEY } from '../../services/api.js';

const DOCUMENT_TYPES = [
  ['PASSPORT_FRONT', 'Паспорт олд томони'],
  ['PASSPORT_BACK', 'Паспорт орқа томони'],
  ['PINFL', 'ЖШШИР ҳужжати'],
  ['CADASTRE', 'Кадастр ҳужжати'],
  ['INCOME_CERTIFICATE', 'Даромад маълумотномаси'],
  ['MARRIAGE_CERTIFICATE', 'Никоҳ гувоҳномаси'],
  ['BIRTH_CERTIFICATE', 'Туғилганлик гувоҳномаси'],
  ['BANK_DOCUMENT', 'Банк ҳужжати'],
  ['CONTRACT', 'Шартнома'],
  ['OTHER', 'Бошқа ҳужжат'],
];

const TYPE_LABELS = Object.fromEntries(DOCUMENT_TYPES);

const DELETE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
];

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function fileSizeLabel(file) {
  if (!file?.size) return '';

  const mb = file.size / (1024 * 1024);

  if (mb >= 1) return `${mb.toFixed(1)} MB`;

  return `${Math.ceil(file.size / 1024)} KB`;
}

function isImage(document) {
  return document.mimeType?.startsWith('image/');
}

export function DocumentsSection({ caseId, applicantClientId, onChanged }) {
  const user = useMemo(() => readUser(), []);
  const canDelete = DELETE_ROLES.includes(user?.role);

  const fileInputRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [documentType, setDocumentType] = useState('PASSPORT_FRONT');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const loadDocuments = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setPageError('');

    try {
      const data = await apiRequest(`/documents/case/${caseId}`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setPageError(error.message || 'Ҳужжатларни юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !uploading) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [modalOpen, uploading]);

  const openModal = () => {
    setDocumentType('PASSPORT_FRONT');
    setSelectedFile(null);
    setUploadError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (uploading) return;

    setModalOpen(false);
    setSelectedFile(null);
    setUploadError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    setUploadError('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowed.includes(file.type)) {
      setUploadError('Фақат JPG, PNG, WEBP ёки PDF файл танланг.');
      event.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Файл ҳажми 15 MB дан ошмаслиги керак.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const uploadDocument = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setUploadError('Аввал файл танланг.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', documentType);

      if (applicantClientId) {
        formData.append('clientId', applicantClientId);
      }

      await apiRequest(`/documents/case/${caseId}`, {
        method: 'POST',
        body: formData,
      });

      closeModal();
      await loadDocuments();
      await onChanged?.();
    } catch (error) {
      setUploadError(error.message || 'Ҳужжатни юклаб бўлмади.');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (document) => {
    const confirmed = window.confirm(
      `"${document.fileName || TYPE_LABELS[document.type] || 'Ҳужжат'}" файлини ўчиришни тасдиқлайсизми?`
    );

    if (!confirmed) return;

    setDeletingId(document.id);
    setPageError('');

    try {
      await apiRequest(`/documents/${document.id}`, {
        method: 'DELETE',
      });

      await loadDocuments();
      await onChanged?.();
    } catch (error) {
      setPageError(error.message || 'Ҳужжатни ўчириб бўлмади.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <>

      <style>{`
        .documents-section {
          overflow: visible;
        }

        .documents-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .documents-head h3 {
          margin: 3px 0 4px;
        }

        .documents-head p {
          margin: 0;
          color: #7d838b;
          font-size: 12px;
        }

        .documents-head-actions,
        .document-card-actions,
        .document-modal-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .documents-refresh,
        .documents-upload-button,
        .document-action,
        .documents-empty button,
        .documents-error button,
        .document-cancel,
        .document-save {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          border-radius: 9px;
          padding: 0 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        .documents-refresh {
          width: 38px;
          padding: 0;
          border: 1px solid #dfe3e8;
          background: #fff;
          color: #25282c;
        }

        .documents-upload-button,
        .documents-empty button,
        .document-save {
          border: 1px solid #e5232f;
          background: #e5232f;
          color: #fff;
        }

        .document-cancel,
        .documents-error button {
          border: 1px solid #dfe3e8;
          background: #fff;
          color: #25282c;
        }

        .documents-list {
          display: grid;
          gap: 11px;
        }

        .document-card {
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          border: 1px solid #e4e7eb;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
        }

        .document-card-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #fff1f2;
          color: #e5232f;
        }

        .document-card-content {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .document-card-content strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .document-card-content span {
          color: #858b93;
          font-size: 11px;
        }

        .document-action {
          min-height: 34px;
          padding: 0 10px;
          border: 1px solid #dfe3e8;
          background: #fff;
          color: #25282c;
        }

        .document-delete {
          color: #d31d28;
          border-color: #ffd2d5;
          background: #fff7f7;
        }

        .documents-loading,
        .documents-empty,
        .documents-error {
          min-height: 180px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          text-align: center;
          color: #8c939c;
        }

        .documents-error {
          color: #c9212c;
        }

        .documents-empty span,
        .documents-error span {
          max-width: 520px;
          font-size: 12px;
          line-height: 1.5;
        }

        .document-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(10, 13, 17, 0.58);
          backdrop-filter: blur(3px);
        }

        .document-modal {
          width: min(680px, 100%);
          max-height: calc(100vh - 48px);
          overflow: auto;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.24);
        }

        .document-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px;
          border-bottom: 1px solid #eceef1;
        }

        .document-modal-head span {
          color: #e5232f;
          font-size: 11px;
          font-weight: 800;
        }

        .document-modal-head h3 {
          margin: 4px 0 0;
          font-size: 19px;
        }

        .document-modal-head button {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
        }

        .document-upload-form {
          display: grid;
          gap: 16px;
          padding: 20px;
        }

        .document-field {
          display: grid;
          gap: 7px;
        }

        .document-field span {
          color: #555c65;
          font-size: 12px;
          font-weight: 700;
        }

        .document-field select {
          width: 100%;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          background: #fff;
          font: inherit;
          padding: 11px 12px;
        }

        .document-file-picker {
          min-height: 180px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 8px;
          padding: 20px;
          border: 1.5px dashed #d4d9df;
          border-radius: 13px;
          background: #fafbfc;
          text-align: center;
          cursor: pointer;
        }

        .document-file-picker input {
          display: none;
        }

        .document-file-picker svg {
          color: #e5232f;
        }

        .document-file-picker span {
          color: #8a9098;
          font-size: 12px;
        }

        .document-upload-error {
          border-radius: 10px;
          padding: 11px 12px;
          background: #fff0f1;
          color: #c9212c;
          font-size: 12px;
          font-weight: 700;
        }

        .document-modal-actions {
          justify-content: flex-end;
        }

        @media (max-width: 700px) {
          .documents-head {
            flex-direction: column;
          }

          .documents-head-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .document-card {
            grid-template-columns: 42px minmax(0, 1fr);
          }

          .document-card-actions {
            grid-column: 1 / -1;
            justify-content: flex-end;
          }

          .document-modal-backdrop {
            padding: 10px;
          }
        }
      `}</style>

      <section className="panel details-section documents-section">
        <div className="details-section-head documents-head">
          <div>
            <span className="section-kicker">Ҳужжатлар</span>
            <h3>Юкланган файллар</h3>
            <p>Жами {items.length} та ҳужжат</p>
          </div>

          <div className="documents-head-actions">
            <button
              type="button"
              className="documents-refresh"
              onClick={loadDocuments}
              disabled={loading}
              title="Ҳужжатларни янгилаш"
            >
              <RefreshCw size={17} className={loading ? 'spin' : ''} />
            </button>

            <button
              type="button"
              className="documents-upload-button"
              onClick={openModal}
            >
              <Plus size={17} />
              Ҳужжат юклаш
            </button>
          </div>
        </div>

        {pageError ? (
          <div className="documents-error">
            <strong>Ҳужжатлар билан ишлашда хато</strong>
            <span>{pageError}</span>
            <button type="button" onClick={loadDocuments}>
              Қайта уриниш
            </button>
          </div>
        ) : loading ? (
          <div className="documents-loading">
            <LoaderCircle className="spin" size={31} />
            <strong>Ҳужжатлар юкланмоқда...</strong>
          </div>
        ) : items.length === 0 ? (
          <div className="documents-empty">
            <FileText size={36} />
            <strong>Ҳужжатлар юкланмаган</strong>
            <span>
              Паспорт, кадастр, банк ҳужжатлари ва PDF файлларни шу ерга
              юкланг.
            </span>
            <button type="button" onClick={openModal}>
              <UploadCloud size={16} />
              Биринчи ҳужжатни юклаш
            </button>
          </div>
        ) : (
          <div className="documents-list">
            {items.map((document) => (
              <article className="document-card" key={document.id}>
                <div className="document-card-icon">
                  {isImage(document) ? (
                    <FileImage size={22} />
                  ) : (
                    <FileText size={22} />
                  )}
                </div>

                <div className="document-card-content">
                  <strong>
                    {document.fileName ||
                      TYPE_LABELS[document.type] ||
                      document.type}
                  </strong>
                  <span>
                    {TYPE_LABELS[document.type] || document.type} ·{' '}
                    {formatDate(document.createdAt)}
                  </span>
                </div>

                <div className="document-card-actions">
                  {document.fileUrl ? (
                    <>
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="document-action"
                        title="Файлни кўриш"
                      >
                        <Eye size={16} />
                        Кўриш
                      </a>

                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="document-action"
                        title="Файлни очиш ёки юклаб олиш"
                      >
                        <Download size={16} />
                      </a>
                    </>
                  ) : null}

                  {canDelete ? (
                    <button
                      type="button"
                      className="document-action document-delete"
                      onClick={() => deleteDocument(document)}
                      disabled={deletingId === document.id}
                      title="Файлни ўчириш"
                    >
                      {deletingId === document.id ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen ? (
        <div
          className="document-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="document-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-modal-title"
          >
            <div className="document-modal-head">
              <div>
                <span>Янги ҳужжат</span>
                <h3 id="document-modal-title">Файлни юклаш</h3>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={uploading}
                aria-label="Ойнани ёпиш"
              >
                <X size={20} />
              </button>
            </div>

            <form className="document-upload-form" onSubmit={uploadDocument}>
              <label className="document-field">
                <span>Ҳужжат тури</span>
                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  disabled={uploading}
                >
                  {DOCUMENT_TYPES.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="document-file-picker">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={chooseFile}
                  disabled={uploading}
                />

                <UploadCloud size={34} />

                {selectedFile ? (
                  <>
                    <strong>{selectedFile.name}</strong>
                    <span>{fileSizeLabel(selectedFile)}</span>
                  </>
                ) : (
                  <>
                    <strong>Файл танлаш учун босинг</strong>
                    <span>JPG, PNG, WEBP ёки PDF · 15 MB гача</span>
                  </>
                )}
              </label>

              {uploadError ? (
                <div className="document-upload-error">{uploadError}</div>
              ) : null}

              <div className="document-modal-actions">
                <button
                  type="button"
                  className="document-cancel"
                  onClick={closeModal}
                  disabled={uploading}
                >
                  Бекор қилиш
                </button>

                <button
                  type="submit"
                  className="document-save"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? (
                    <>
                      <LoaderCircle className="spin" size={16} />
                      Юкланмоқда...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      Юклаш
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
