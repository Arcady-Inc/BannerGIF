import React, { useRef, useState } from 'react';
import { X, Upload, Link as LinkIcon, FileType, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  addFontFromFile,
  addFontFromGoogleURL,
  CustomFont,
} from '../utils/customFonts';

interface CustomFontModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (fonts: CustomFont[]) => void;
}

type Tab = 'upload' | 'google';

interface PendingFile {
  file: File;
  displayName: string;
  status: 'pending' | 'saving' | 'done' | 'error';
  error?: string;
}

const CustomFontModal: React.FC<CustomFontModalProps> = ({ open, onClose, onAdded }) => {
  const [tab, setTab] = useState<Tab>('upload');

  // Upload tab state
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Fonts tab state
  const [googleUrl, setGoogleUrl] = useState('');
  const [googleDisplayName, setGoogleDisplayName] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  if (!open) return null;

  // ─── Upload tab handlers ─────────────────────────────────────────────────

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const next: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = f.name.toLowerCase().split('.').pop() ?? '';
      if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
        next.push({
          file: f,
          displayName: f.name,
          status: 'error',
          error: 'Unsupported format (need .ttf, .otf, .woff, .woff2)',
        });
        continue;
      }
      next.push({
        file: f,
        displayName: f.name.replace(/\.[^.]+$/, ''),
        status: 'pending',
      });
    }
    setPendingFiles((prev) => [...prev, ...next]);
  };

  const handleUploadAll = async () => {
    const saved: CustomFont[] = [];
    // Save them one by one so a failure on file 2 doesn't abort file 1.
    for (let i = 0; i < pendingFiles.length; i++) {
      const pf = pendingFiles[i];
      if (pf.status !== 'pending') continue;
      setPendingFiles((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, status: 'saving' } : p))
      );
      try {
        const font = await addFontFromFile(pf.file, pf.displayName);
        saved.push(font);
        setPendingFiles((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: 'done' } : p))
        );
      } catch (err) {
        const e = err as Error & { code?: string };
        const friendly =
          e.code === 'DUPLICATE_FAMILY'
            ? `A font with this name is already imported. Rename it above or remove the existing one from the Custom tab and try again.`
            : (e.message || 'Unknown error');
        setPendingFiles((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? { ...p, status: 'error', error: friendly }
              : p
          )
        );
      }
    }
    if (saved.length > 0) onAdded(saved);
  };

  // ─── Google Fonts tab handlers ───────────────────────────────────────────

  const handleGoogleImport = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const font = await addFontFromGoogleURL(googleUrl.trim(), googleDisplayName);
      onAdded([font]);
      setGoogleUrl('');
      setGoogleDisplayName('');
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const allDone =
    pendingFiles.length > 0 &&
    pendingFiles.every((p) => p.status === 'done' || p.status === 'error');

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <FileType className="w-4 h-4 text-[#4F6FF5]" />
            <h2 className="text-sm font-bold text-slate-100">Add Custom Font</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-3 pt-3">
          <div className="grid grid-cols-2 gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setTab('upload')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                tab === 'upload'
                  ? 'bg-[#4F6FF5] text-white shadow-md shadow-[#4F6FF5]/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Upload className="w-3 h-3" />
              Upload File
            </button>
            <button
              onClick={() => setTab('google')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                tab === 'google'
                  ? 'bg-[#4F6FF5] text-white shadow-md shadow-[#4F6FF5]/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LinkIcon className="w-3 h-3" />
              Google Fonts URL
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5 space-y-3">
          {tab === 'upload' && (
            <>
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`w-full py-6 border border-dashed rounded-lg cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${
                  isDragging
                    ? 'border-[#4F6FF5] bg-[#4F6FF5]/10'
                    : 'border-slate-700 bg-slate-900/30 hover:border-[#4F6FF5]/50 hover:bg-slate-800/40'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400 text-center px-4">
                  Drop font files here or click to browse
                </p>
                <p className="text-[10px] text-slate-600">.ttf · .otf · .woff · .woff2</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2,font/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              {/* Pending files list */}
              {pendingFiles.length > 0 && (
                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                  {pendingFiles.map((pf, idx) => {
                    const isErr = pf.status === 'error';
                    return (
                      <div
                        key={`${pf.file.name}-${idx}`}
                        className={`rounded-lg p-2 border ${
                          isErr
                            ? 'bg-red-500/10 border-red-500/40'
                            : 'bg-slate-900/40 border-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={pf.displayName}
                            onChange={(e) =>
                              setPendingFiles((prev) =>
                                prev.map((p, i) =>
                                  i === idx
                                    ? { ...p, displayName: e.target.value }
                                    : p
                                )
                              )
                            }
                            disabled={pf.status !== 'pending'}
                            className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs text-slate-200 disabled:text-slate-500"
                          />
                          <span className="text-[9px] text-slate-500 font-mono">
                            {Math.round(pf.file.size / 1024)}KB
                          </span>
                          {pf.status === 'pending' && (
                            <button
                              onClick={() =>
                                setPendingFiles((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="text-slate-500 hover:text-red-400"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {pf.status === 'saving' && (
                            <Loader2 className="w-3 h-3 animate-spin text-[#4F6FF5]" />
                          )}
                          {pf.status === 'done' && (
                            <span className="text-[9px] font-bold text-emerald-500">
                              SAVED
                            </span>
                          )}
                          {pf.status === 'error' && (
                            <span className="text-[9px] font-bold text-red-400">
                              FAILED
                            </span>
                          )}
                        </div>
                        {/* Inline error message — no hover required */}
                        {isErr && pf.error && (
                          <p className="text-[10px] text-red-300 mt-1.5 leading-snug">
                            {pf.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="text-[11px] text-slate-400 hover:text-slate-200 px-3 py-1.5"
                >
                  Close
                </button>
                <button
                  onClick={handleUploadAll}
                  disabled={pendingFiles.filter((p) => p.status === 'pending').length === 0}
                  className="flex items-center gap-1.5 bg-[#4F6FF5] hover:bg-[#3D52C7] disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-[11px] font-bold px-4 py-1.5 rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {allDone ? 'Done' : 'Add Fonts'}
                </button>
              </div>
            </>
          )}

          {tab === 'google' && (
            <>
              {/* How-to instructions — show the exact 3 steps + a copyable example */}
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-3 space-y-2">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                  How to get the URL
                </p>
                <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>
                    Open{' '}
                    <a
                      href="https://fonts.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4F6FF5] hover:text-[#7E94FF] underline-offset-2 hover:underline"
                    >
                      fonts.google.com
                    </a>{' '}
                    and pick a font family
                  </li>
                  <li>
                    Click <span className="text-slate-200 font-semibold">Get font</span> →{' '}
                    <span className="text-slate-200 font-semibold">Get embed code</span>
                  </li>
                  <li>
                    Copy the <code className="text-slate-300 bg-slate-800/80 px-1 rounded">href</code>{' '}
                    value from the <code className="text-slate-300">&lt;link&gt;</code> tag
                  </li>
                </ol>
                <div className="pt-1">
                  <p className="text-[9px] font-semibold text-slate-500 uppercase mb-1">
                    Example
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const ex =
                        'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap';
                      setGoogleUrl(ex);
                    }}
                    className="w-full text-left text-[10px] font-mono text-slate-300 bg-slate-900/60 border border-slate-700/40 rounded px-2 py-1.5 hover:border-[#4F6FF5]/40 hover:bg-[#4F6FF5]/5 transition-colors break-all"
                    title="Click to use this example URL"
                  >
                    fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Google Fonts CSS URL
                </label>
                <input
                  type="text"
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  placeholder="https://fonts.googleapis.com/css2?family=..."
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-[#4F6FF5] focus:border-[#4F6FF5] outline-none placeholder:text-slate-600 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  value={googleDisplayName}
                  onChange={(e) => setGoogleDisplayName(e.target.value)}
                  placeholder="Auto-detected from CSS if empty"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-[#4F6FF5] focus:border-[#4F6FF5] outline-none placeholder:text-slate-600"
                />
              </div>

              {googleError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                  <p className="text-[10px] text-red-300">{googleError}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="text-[11px] text-slate-400 hover:text-slate-200 px-3 py-1.5"
                >
                  Close
                </button>
                <button
                  onClick={handleGoogleImport}
                  disabled={googleLoading || !googleUrl.trim()}
                  className="flex items-center gap-1.5 bg-[#4F6FF5] hover:bg-[#3D52C7] disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-[11px] font-bold px-4 py-1.5 rounded-md transition-colors"
                >
                  {googleLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Import
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomFontModal;
