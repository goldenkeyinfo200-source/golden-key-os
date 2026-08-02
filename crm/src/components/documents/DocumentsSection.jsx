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
