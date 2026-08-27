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
const DELETE_ROLES = ['SUPER_ADMIN','DIRECTOR','BRANCH_MANAGER','RECEPTION_MANAGER'];
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
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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

const S = {
  panel: {
    background: '#fff',
    border: '1px solid #e7e9ee',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 2px 12px rgba(17,24,39,.04)',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  headActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  smallBtn: {
    width: 38, height: 38,
    border: '1px solid #e3e6eb',
    background: '#fff',
    borderRadius: 9,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  redBtn: {
    minHeight: 38,
    border: 0,
    borderRadius: 9,
    background: '#ef233c',
    color: '#fff',
    fontWeight: 800,
    padding: '0 14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    cursor: 'pointer',
  },
  list: {
    display: 'grid',
    gap: 9,
  },
  card: {
    border: '1px solid #e7e9ee',
    borderRadius: 11,
    padding: '10px 12px',
    display: 'grid',
    gridTemplateColumns: '42px minmax(0,1fr) auto',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 38, height: 38,
    borderRadius: 9,
    background: '#fff1f2',
    color: '#ef233c',
    display: 'grid',
    placeItems: 'center',
  },
  action: {
    minHeight: 34,
    border: '1px solid #dfe3e8',
    borderRadius: 8,
    background: '#fff',
    color: '#111827',
    padding: '0 10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    background: 'rgba(17,24,39,.58)',
    backdropFilter: 'blur(2px)',
    display: 'grid',
    placeItems: 'center',
    padding: 18,
  },
  modal: {
    width: 'min(620px, calc(100vw - 28px))',
    maxHeight: 'calc(100vh - 36px)',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 24px 70px rgba(0,0,0,.24)',
    border: '1px solid #e8eaef',
  },
  modalHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '17px 18px 13px',
    borderBottom: '1px solid #eceef2',
  },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: 9,
    border: '1px solid #e1e5ea',
    background: '#fff',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },
  form: {
    display: 'grid',
    gap: 13,
    padding: 18,
  },
  field: {
    display: 'grid',
    gap: 6,
  },
  select: {
    width: '100%',
    minHeight: 42,
    border: '1px solid #dfe3e8',
    borderRadius: 9,
    padding: '0 11px',
    background: '#fff',
    fontSize: 13,
  },
  sourceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
    gap: 10,
  },
  picker: {
    minHeight: 155,
    border: '1.5px dashed #d5dae1',
    borderRadius: 12,
    background: '#fbfcfd',
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: 7,
    textAlign: 'center',
    cursor: 'pointer',
    padding: 14,
  },
  scannerBtn: {
    minHeight: 155,
    border: '1.5px dashed #d5dae1',
    borderRadius: 12,
    background: '#fbfcfd',
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: 7,
    textAlign: 'center',
    padding: 14,
  },
  note: {
    borderRadius: 9,
    padding: '9px 10px',
    fontSize: 11,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 9,
    paddingTop: 2,
  },
};

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

  useEffect(() => { loadDocuments(); }, [loadDocuments]);
  useEffect(() => { checkScannerAgent(); }, [checkScannerAgent]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !uploading && !scanning) {
        setModalOpen(false);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    setUploadError('');
    if (!file) return setSelectedFile(null);

    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
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
        body: JSON.stringify({ dpi: 300, colorMode: 'color' }),
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
        'Golden Key Scanner Agent билан боғланиб бўлмади.'
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
      if (applicantClientId) formData.append('clientId', applicantClientId);

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
    if (!window.confirm(`"${document.fileName || 'Ҳужжат'}" файлини ўчиришни тасдиқлайсизми?`)) return;
    setDeletingId(document.id);
    setPageError('');
    try {
      await apiRequest(`/documents/${document.id}`, { method: 'DELETE' });
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
      <section style={S.panel}>
        <div style={S.head}>
          <div>
            <div style={{color:'#ef233c',fontWeight:800,fontSize:11,textTransform:'uppercase'}}>Ҳужжатлар</div>
            <h3 style={{margin:'4px 0 2px',fontSize:18}}>Юкланган файллар</h3>
            <div style={{fontSize:12,color:'#7b7f86'}}>Жами {items.length} та ҳужжат</div>
          </div>

          <div style={S.headActions}>
            <button type="button" style={S.smallBtn} onClick={loadDocuments} disabled={loading}>
              <RefreshCw size={17} className={loading ? 'spin' : ''} />
            </button>
            <button type="button" style={S.redBtn} onClick={openModal}>
              <Plus size={17} /> Ҳужжат юклаш
            </button>
          </div>
        </div>

        {pageError ? (
          <div style={{...S.note,background:'#fff1f2',color:'#a61b29'}}>
            {pageError}
          </div>
        ) : loading ? (
          <div style={{display:'grid',placeItems:'center',gap:8,padding:'28px 0'}}>
            <LoaderCircle className="spin" size={30}/>
            <strong>Ҳужжатлар юкланмоқда...</strong>
          </div>
        ) : items.length === 0 ? (
          <div style={{display:'grid',placeItems:'center',gap:7,padding:'30px 0',color:'#7b7f86'}}>
            <FileText size={34}/>
            <strong>Ҳужжатлар юкланмаган</strong>
          </div>
        ) : (
          <div style={S.list}>
            {items.map((document) => (
              <article key={document.id} style={S.card}>
                <div style={S.iconBox}>
                  {isImage(document) ? <FileImage size={20}/> : <FileText size={20}/>}
                </div>

                <div style={{minWidth:0}}>
                  <strong style={{display:'block',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {document.fileName || TYPE_LABELS[document.type] || document.type}
                  </strong>
                  <span style={{display:'block',fontSize:11,color:'#7b7f86',marginTop:3}}>
                    {TYPE_LABELS[document.type] || document.type} · {formatDate(document.createdAt)}
                  </span>
                </div>

                <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
                  {document.fileUrl ? (
                    <>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer" style={S.action}>
                        <Eye size={15}/> Кўриш
                      </a>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer" style={S.action}>
                        <Download size={15}/>
                      </a>
                    </>
                  ) : null}

                  {canDelete ? (
                    <button
                      type="button"
                      style={{...S.action,color:'#d92d20',borderColor:'#ffd1cc'}}
                      onClick={() => deleteDocument(document)}
                      disabled={deletingId === document.id}
                    >
                      {deletingId === document.id
                        ? <LoaderCircle className="spin" size={15}/>
                        : <Trash2 size={15}/>}
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
          style={S.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section style={S.modal}>
            <div style={S.modalHead}>
              <div>
                <div style={{color:'#ef233c',fontWeight:800,fontSize:11}}>ЯНГИ ҲУЖЖАТ</div>
                <h3 style={{margin:'4px 0 0',fontSize:19}}>Файлни юклаш ёки сканерлаш</h3>
              </div>

              <button type="button" style={S.closeBtn} onClick={closeModal} disabled={uploading || scanning}>
                <X size={20}/>
              </button>
            </div>

            <form style={S.form} onSubmit={uploadDocument}>
              <label style={S.field}>
                <span style={{fontSize:12,fontWeight:700}}>Ҳужжат тури</span>
                <select
                  style={S.select}
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  disabled={uploading || scanning}
                >
                  {DOCUMENT_TYPES.map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
              </label>

              <div style={S.sourceGrid}>
                <label style={S.picker}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    onChange={chooseFile}
                    disabled={uploading || scanning}
                    style={{display:'none'}}
                  />
                  <UploadCloud size={30} color="#ef233c"/>

                  {selectedFile ? (
                    <>
                      <strong style={{fontSize:12,maxWidth:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {selectedFile.name}
                      </strong>
                      <span style={{fontSize:11,color:'#7b7f86'}}>{fileSizeLabel(selectedFile)}</span>
                    </>
                  ) : (
                    <>
                      <strong style={{fontSize:12}}>Файл танлаш</strong>
                      <span style={{fontSize:11,color:'#7b7f86'}}>JPG, PNG, WEBP ёки PDF · 20 MB гача</span>
                    </>
                  )}
                </label>

                <button
                  type="button"
                  onClick={scanFromComputer}
                  disabled={!scannerAvailable || scannerChecking || scanning || uploading}
                  style={{
                    ...S.scannerBtn,
                    cursor: scannerAvailable ? 'pointer' : 'not-allowed',
                    opacity: scannerAvailable ? 1 : .55,
                  }}
                >
                  {scannerChecking || scanning
                    ? <LoaderCircle className="spin" size={30}/>
                    : <ScanLine size={30} color="#ef233c"/>}

                  <strong style={{fontSize:12}}>
                    {scanning ? 'Сканерланмоқда...' : 'Сканердан олиш'}
                  </strong>

                  <span style={{fontSize:11,color:'#7b7f86'}}>
                    {scannerAvailable ? 'Scanner Agent тайёр' : 'Scanner Agent топилмади'}
                  </span>
                </button>
              </div>

              {!scannerAvailable && !scannerChecking ? (
                <div style={{...S.note,background:'#fff8e8',color:'#8a6500'}}>
                  Сканердан олиш учун ушбу компьютерда Golden Key Scanner Agent ишлаётган бўлиши керак.
                </div>
              ) : null}

              {selectedFile ? (
                <div style={{...S.note,background:'#effaf3',color:'#176b35'}}>
                  Тайёр файл: <strong>{selectedFile.name}</strong> · {fileSizeLabel(selectedFile)}
                </div>
              ) : null}

              {uploadError ? (
                <div style={{...S.note,background:'#fff1f2',color:'#a61b29'}}>
                  {uploadError}
                </div>
              ) : null}

              <div style={S.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={uploading || scanning}
                  style={{
                    minHeight:38,border:'1px solid #dfe3e8',borderRadius:9,
                    background:'#fff',fontWeight:700,padding:'0 14px',cursor:'pointer'
                  }}
                >
                  Бекор қилиш
                </button>

                <button
                  type="submit"
                  disabled={uploading || scanning || !selectedFile}
                  style={{
                    ...S.redBtn,
                    opacity: uploading || scanning || !selectedFile ? .55 : 1,
                    cursor: uploading || scanning || !selectedFile ? 'not-allowed' : 'pointer',
                  }}
                >
                  {uploading ? (
                    <>
                      <LoaderCircle className="spin" size={16}/> Юкланмоқда...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16}/> CRMга юклаш
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
