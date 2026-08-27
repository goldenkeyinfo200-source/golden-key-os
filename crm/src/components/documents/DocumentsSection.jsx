import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileImage,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  ScanLine,
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

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const SCANNER_AGENT_URL =
  import.meta.env.VITE_SCANNER_AGENT_URL || 'http://127.0.0.1:17831';

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
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.ceil(file.size / 1024)} KB`;
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

  const [scannerAvailable, setScannerAvailable] = useState(false);
  const [scannerChecking, setScannerChecking] = useState(false);
  const [scanning, setScanning] = useState(false);

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

  const checkScannerAgent = useCallback(async () => {
    setScannerChecking(true);
    try {
      const response = await fetch(`${SCANNER_AGENT_URL}/health`, {
        method: 'GET',
        cache: 'no-store',
      });

      setScannerAvailable(response.ok);
    } catch {
      setScannerAvailable(false);
    } finally {
      setScannerChecking(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    checkScannerAgent();
  }, [checkScannerAgent]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !uploading && !scanning) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [modalOpen, uploading, scanning]);

  const openModal = () => {
    setDocumentType('PASSPORT_FRONT');
    setSelectedFile(null);
    setUploadError('');
    setModalOpen(true);
    checkScannerAgent();
  };

  const closeModal = () => {
    if (uploading || scanning) return;

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

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Файл ҳажми 20 MB дан ошмаслиги керак.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const scanFromComputer = async () => {
    setScanning(true);
    setUploadError('');

    try {
      const response = await fetch(`${SCANNER_AGENT_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dpi: 300,
          colorMode: 'color',
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Сканерлаш амалга ошмади.');
      }

      const blob = await response.blob();

      if (blob.size > MAX_FILE_SIZE) {
        throw new Error('Скан қилинган файл 20 MBдан катта.');
      }

      const scannedFile = new File(
        [blob],
        `scan-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
        { type: blob.type || 'image/jpeg' }
      );

      setSelectedFile(scannedFile);
    } catch (error) {
      setScannerAvailable(false);
      setUploadError(
        error.message ||
          'Scanner Agent билан боғланиб бўлмади. Компьютерда Golden Key Scanner Agent ишлаётганини текширинг.'
      );
    } finally {
      setScanning(false);
    }
  };

  const uploadDocument = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setUploadError('Аввал файл танланг ёки сканердан олинг.');
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

      setModalOpen(false);
      setSelectedFile(null);
      setUploadError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

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
            <span>Паспорт, кадастр, банк ҳужжатлари ва PDF файлларни шу ерга юкланг.</span>
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
                  {isImage(document) ? <FileImage size={22} /> : <FileText size={22} />}
                </div>

                <div className="document-card-content">
                  <strong>{document.fileName || TYPE_LABELS[document.type] || document.type}</strong>
                  <span>
                    {TYPE_LABELS[document.type] || document.type} · {formatDate(document.createdAt)}
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
            if (event.target === event.currentTarget) closeModal();
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
                <h3 id="document-modal-title">Файлни юклаш ёки сканерлаш</h3>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={uploading || scanning}
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
                  disabled={uploading || scanning}
                >
                  {DOCUMENT_TYPES.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                <label
                  className="document-file-picker"
                  style={{ minHeight: 145 }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    onChange={chooseFile}
                    disabled={uploading || scanning}
                  />

                  <UploadCloud size={30} />

                  {selectedFile ? (
                    <>
                      <strong>{selectedFile.name}</strong>
                      <span>{fileSizeLabel(selectedFile)}</span>
                    </>
                  ) : (
                    <>
                      <strong>Файл танлаш</strong>
                      <span>JPG, PNG, WEBP ёки PDF · 20 MB гача</span>
                    </>
                  )}
                </label>

                <button
                  type="button"
                  onClick={scanFromComputer}
                  disabled={!scannerAvailable || scannerChecking || scanning || uploading}
                  style={{
                    minHeight: 145,
                    border: '1px dashed #d9dde3',
                    borderRadius: 12,
                    background: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    alignContent: 'center',
                    gap: 7,
                    cursor: scannerAvailable ? 'pointer' : 'not-allowed',
                    opacity: scannerAvailable ? 1 : 0.55,
                  }}
                >
                  {scannerChecking || scanning ? (
                    <LoaderCircle className="spin" size={30} />
                  ) : (
                    <ScanLine size={30} />
                  )}

                  <strong>
                    {scanning ? 'Сканерланмоқда...' : 'Сканердан олиш'}
                  </strong>

                  <span style={{ fontSize: 11, color: '#7b7f86' }}>
                    {scannerAvailable
                      ? 'Windows Scanner Agent тайёр'
                      : 'Scanner Agent топилмади'}
                  </span>
                </button>
              </div>

              {!scannerAvailable && !scannerChecking ? (
                <div
                  style={{
                    padding: '9px 10px',
                    borderRadius: 9,
                    background: '#fff8e8',
                    color: '#8a6500',
                    fontSize: 11,
                  }}
                >
                  Сканердан олиш учун ушбу компьютерда Golden Key Scanner Agent ишлаётган бўлиши керак.
                </div>
              ) : null}

              {selectedFile ? (
                <div
                  style={{
                    padding: '9px 10px',
                    borderRadius: 9,
                    background: '#effaf3',
                    color: '#176b35',
                    fontSize: 11,
                  }}
                >
                  Тайёр файл: <strong>{selectedFile.name}</strong> · {fileSizeLabel(selectedFile)}
                </div>
              ) : null}

              {uploadError ? (
                <div className="document-upload-error">{uploadError}</div>
              ) : null}

              <div className="document-modal-actions">
                <button
                  type="button"
                  className="document-cancel"
                  onClick={closeModal}
                  disabled={uploading || scanning}
                >
                  Бекор қилиш
                </button>

                <button
                  type="submit"
                  className="document-save"
                  disabled={uploading || scanning || !selectedFile}
                >
                  {uploading ? (
                    <>
                      <LoaderCircle className="spin" size={16} />
                      Юкланмоқда...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      CRMга юклаш
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
