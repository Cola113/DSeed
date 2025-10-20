'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type Mode = 'text' | 'img' | 'imgs';
type LocalImage = { file: File; url: string; id: string };
type UrlItem = { id: string; url: string };
type HistoryItem = { id: string; url: string; ts: number };

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const HISTORY_KEY = 'image_history_v1';
const HISTORY_MAX = 200;

const getNameFromUrl = (u: string) => {
  try {
    const name = new URL(u).pathname.split('/').pop() || '外链图片';
    return decodeURIComponent(name);
  } catch {
    return '外链图片';
  }
};

function RemoveBtn({
  onClick,
  title = '移除',
}: {
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full
                 border border-white/20 bg-white/10 text-white/80
                 transition-all duration-200
                 hover:text-red-400 hover:border-red-400/40 hover:bg-red-500/10 hover:scale-105
                 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400/50"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 10v8M14 10v8" />
      </svg>
    </button>
  );
}

const arrayMove = <T,>(arr: T[], from: number, to: number) => {
  const a = arr.slice();
  const [m] = a.splice(from, 1);
  a.splice(to, 0, m);
  return a;
};

export default function Home() {
  const [mode, setMode] = useState<Mode>('text');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [files, setFiles] = useState<LocalImage[]>([]);
  const [urlItems, setUrlItems] = useState<UrlItem[]>([{ id: uid(), url: '' }]);

  const [images, setImages] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editUrl, setEditUrl] = useState<string | null>(null);

  const dragKeyRef = useRef<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_MAX)));
    } catch {}
  }, [history]);

  const makeItem = (f: File): LocalImage => ({
    file: f,
    url: URL.createObjectURL(f),
    id: `${f.name}-${f.size}-${f.lastModified}-${uid()}`,
  });

  const addFiles = useCallback(
    (list: File[] | FileList) => {
      const arr = Array.from(list).filter((f) => f.type.startsWith('image/'));
      if (arr.length === 0) return;

      let targetMode: Mode = mode;
      if (mode === 'text') {
        targetMode = arr.length > 1 ? 'imgs' : 'img';
        setMode(targetMode);
      }

      if (targetMode === 'img') {
        const item = makeItem(arr[0]);
        setFiles((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.url));
          return [item];
        });
        setUrlItems([{ id: uid(), url: '' }]);
      } else {
        const next = arr.map(makeItem);
        setFiles((prev) => [...prev, ...next]);
      }
    },
    [mode]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const t = prev.find((p) => p.id === id);
      if (t) URL.revokeObjectURL(t.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const onAddUrlField = () => setUrlItems((arr) => [...arr, { id: uid(), url: '' }]);

  const onChangeUrl = (i: number, v: string) => {
    setUrlItems((arr) => arr.map((x, idx) => (idx === i ? { ...x, url: v } : x)));
    if (mode === 'img' && i === 0 && v.trim()) {
      setFiles((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
    }
  };

  const removeUrl = (i: number) => {
    if (mode === 'img') setUrlItems([{ id: uid(), url: '' }]);
    else setUrlItems((arr) => arr.filter((_, idx) => idx !== i));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasteFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f && f.type.startsWith('image/')) pasteFiles.push(f);
      }
    }
    if (pasteFiles.length) addFiles(pasteFiles);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleModeChange = (m: Mode) => {
    if (m === 'img') {
      setFiles((prev) => {
        if (prev.length <= 1) return prev;
        prev.slice(1).forEach((p) => URL.revokeObjectURL(p.url));
        return [prev[0]];
      });
      setUrlItems((prev) =>
        files.length > 0 ? [{ id: uid(), url: '' }] : [{ id: uid(), url: (prev[0]?.url || '').trim() }]
      );
    }
    setMode(m);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImages([]);

    try {
      const fd = new FormData();
      fd.append('mode', mode);
      fd.append('prompt', prompt);
      fd.append('size', size);

      const cleanedUrls = urlItems.map((u) => u.url.trim()).filter(Boolean);

      if (mode === 'img') {
        if (files.length > 0) fd.append('files', files[0].file);
        else if (cleanedUrls.length > 0) fd.append('imageUrls', cleanedUrls[0]);
      } else if (mode === 'imgs') {
        files.forEach((item) => fd.append('files', item.file));
        cleanedUrls.forEach((u) => fd.append('imageUrls', u));
      }

      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '请求失败');

      const urls: string[] = Array.isArray(data?.images) ? data.images : [];
      setImages(urls);

      if (urls.length) {
        setHistory((prev) => {
          const seen = new Set(prev.map((h) => h.url));
          const add: HistoryItem[] = urls
            .filter((u) => !seen.has(u))
            .map((u) => ({ id: uid(), url: u, ts: Date.now() }));
          return [...add, ...prev].slice(0, HISTORY_MAX);
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '请求出错';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const firstUrl = (urlItems[0]?.url || '').trim();
  const hasSingleSelectedInImg = mode === 'img' && (files.length > 0 || !!firstUrl);
  const cleanedUrls = urlItems.map((u) => u.url.trim()).filter(Boolean);
  const hasPrompt = prompt.trim().length > 0;

  const effectiveCountImg = mode === 'img' ? (files.length > 0 ? 1 : cleanedUrls.length > 0 ? 1 : 0) : 0;
  const effectiveCountImgs = mode === 'imgs' ? files.length + cleanedUrls.length : 0;

  const canSubmit =
    mode === 'text'
      ? hasPrompt
      : mode === 'img'
      ? hasPrompt && effectiveCountImg >= 1
      : hasPrompt && effectiveCountImgs >= 2;

  type PreviewItem = { key: string; kind: 'file' | 'url'; url: string; name: string };
  const filesMap = new Map(files.map((f) => [f.id, f]));
  const urlsMap = new Map(urlItems.map((u) => [u.id, u]));
  const previewItems: PreviewItem[] =
    mode === 'imgs'
      ? [
          ...files.map((f) => ({ key: `f:${f.id}`, kind: 'file' as const, url: f.url, name: f.file.name })),
          ...urlItems
            .filter((u) => u.url.trim())
            .map((u) => ({ key: `u:${u.id}`, kind: 'url' as const, url: u.url.trim(), name: getNameFromUrl(u.url) })),
        ]
      : [];

  const onDragStart = (key: string) => (e: React.DragEvent<HTMLDivElement>) => {
    dragKeyRef.current = key;
    setDraggingKey(key);
    setOverKey(null);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDragEnter = (key: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOverKey(key);
  };
  const onDragEnd = () => {
    setDraggingKey(null);
    setOverKey(null);
    dragKeyRef.current = null;
  };
  const onDropOn = (targetKey: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromKey = dragKeyRef.current;
    if (!fromKey || fromKey === targetKey) {
      onDragEnd();
      return;
    }
    const keys = previewItems.map((it) => it.key);
    const from = keys.indexOf(fromKey);
    const to = keys.indexOf(targetKey);
    if (from < 0 || to < 0) {
      onDragEnd();
      return;
    }

    const reorderedKeys = arrayMove(keys, from, to);

    const newFiles: LocalImage[] = [];
    const newUrlFilled: UrlItem[] = [];
    for (const k of reorderedKeys) {
      if (k.startsWith('f:')) {
        const id = k.slice(2);
        const f = filesMap.get(id);
        if (f) newFiles.push(f);
      } else {
        const id = k.slice(2);
        const u = urlsMap.get(id);
        if (u && u.url.trim()) newUrlFilled.push(u);
      }
    }
    const emptyUrls = urlItems.filter((u) => !u.url.trim());
    setFiles(newFiles);
    setUrlItems([...newUrlFilled, ...emptyUrls]);
    onDragEnd();
  };

  const applyContinueEdit = (as: 'img' | 'imgs') => {
    if (!editUrl) return;
    if (as === 'img') {
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
      setUrlItems([{ id: uid(), url: editUrl }]);
      setMode('img');
    } else {
      setMode('imgs');
      setUrlItems((prev) => {
        const filled = prev.filter((u) => u.url.trim());
        const empties = prev.filter((u) => !u.url.trim());
        return [...filled, { id: uid(), url: editUrl }, ...empties.length ? empties : [{ id: uid(), url: '' }]];
      });
    }
    setEditUrl(null);
  };

  const clearHistory = () => setHistory([]);
  const removeHistory = (id: string) => setHistory((prev) => prev.filter((h) => h.id !== id));

  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      <div className="absolute inset-0 -z-30 bg-gradient-to-b from-slate-950 via-slate-900 to-black" />
      <div className="glass-pane -z-20" />
      <div className="rain -z-10" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 -z-10 h-[560px] w-[560px] rounded-full bg-cyan-500/20 blur-3xl" />

      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="backdrop-blur-xl bg-white/12 border border-white/20 rounded-2xl shadow-2xl">
          <div className="p-7 md:p-9 text-white">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-white to-cyan-200 shimmer" style={{ letterSpacing: '-0.02em' }}>
              可乐的小站
            </h1>
            <p className="mt-2 text-cyan-200/90 text-base glow float">
              <span className="emoji-bounce mr-1">🐮</span>
              顶级牛马
              <span className="emoji-bounce ml-1">🐴</span>
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-6">
              <div className="flex flex-wrap gap-2">
                {(['text', 'img', 'imgs'] as Mode[]).map((m) => {
                  const label = m === 'text' ? '文生图' : m === 'img' ? '单图生图' : '多图生图';
                  const active = mode === m;
                  return (
                    <label
                      key={m}
                      className={`cursor-pointer inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-sm transition
                      ${active ? 'bg-cyan-400/95 text-slate-900 border-cyan-300 shadow-md' : 'bg-white/10 text-white/90 border-white/20 hover:bg-white/15'}`}
                    >
                      <input type="radio" className="sr-only" checked={active} onChange={() => handleModeChange(m)} />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>

              <div>
                <label className="block text-sm mb-1 text-white/80">提示词（prompt）</label>
                <textarea
                  className="w-full rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/60 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="请输入你的描述..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-white/80">分辨率</label>
                <select
                  className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  value={size}
                  onChange={(e) => setSize(e.target.value as '1K' | '2K' | '4K')}
                >
                  <option className="text-slate-900" value="1K">1K</option>
                  <option className="text-slate-900" value="2K">2K</option>
                  <option className="text-slate-900" value="4K">4K</option>
                </select>
              </div>

              {mode !== 'text' && !(mode === 'img' && hasSingleSelectedInImg) && (
                <>
                  <div
                    onPaste={handlePaste}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="rounded-xl border-2 border-dashed border-white/25 bg-white/5 backdrop-blur-sm p-4 text-white/80"
                  >
                    <div className="text-sm">
                      点击此区域后，粘贴 Ctrl/Command + V，或将图片拖拽到这里
                      {mode === 'img' && <span className="ml-2 text-xs text-white/60">（单图模式仅保留一张）</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-white/80">
                      上传图片（{mode === 'imgs' ? '可多选' : '单张'}）
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple={mode === 'imgs'}
                      onChange={(e) => e.target.files && addFiles(e.target.files)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60
                      file:mr-3 file:rounded-md file:border-0 file:bg-cyan-400/90 file:px-3 file:py-2 file:text-slate-900 file:font-medium"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm text-white/80">图片外链 URL（可选）</label>
                      {mode !== 'img' && (
                        <button
                          type="button"
                          onClick={onAddUrlField}
                          className="text-cyan-300 hover:text-cyan-200 text-sm"
                        >
                          + 添加一条
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(mode === 'img' ? urlItems.slice(0, 1) : urlItems).map((u, i) => (
                        <div key={u.id} className="flex items-center gap-2">
                          <input
                            type="url"
                            className="flex-1 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                            placeholder="https://example.com/image.png"
                            value={u.url}
                            onChange={(e) => onChangeUrl(i, e.target.value)}
                          />
                          {mode !== 'img' && (
                            <RemoveBtn onClick={() => removeUrl(i)} title="移除该 URL" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {mode === 'img' && hasSingleSelectedInImg && (
                <div>
                  <h3 className="text-sm text-white/80 mb-2">待生成的图片预览</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {files.length > 0 ? (
                      <div className="rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-sm">
                        <img src={files[0].url} alt="preview" className="w-full aspect-square object-cover" />
                        <div className="px-2 py-1 text-[11px] text-white/80 flex items-center justify-between">
                          <span className="truncate">{files[0].file.name}</span>
                          <RemoveBtn onClick={() => removeFile(files[0].id)} title="移除该图片" />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-sm">
                        <img src={firstUrl} alt="url-preview" className="w-full aspect-square object-cover" />
                        <div className="px-2 py-1 text-[11px] text-white/80 flex items-center justify-between">
                          <span className="truncate">{getNameFromUrl(firstUrl)}</span>
                          <RemoveBtn onClick={() => removeUrl(0)} title="移除该图片" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {mode === 'imgs' && (files.length > 0 || cleanedUrls.length > 0) && (
                <div>
                  <h3 className="text-sm text-white/80 mb-2">待生成的图片预览（可拖拽排序）</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" onDragOver={onDragOver}>
                    {previewItems.map((it) => {
                      const isDragging = draggingKey === it.key;
                      const isOver = overKey === it.key && draggingKey !== it.key;
                      return (
                        <div
                          key={it.key}
                          draggable
                          onDragStart={onDragStart(it.key)}
                          onDragEnter={onDragEnter(it.key)}
                          onDrop={onDropOn(it.key)}
                          onDragEnd={onDragEnd}
                          className={`relative rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-sm cursor-move transition
                            ${isDragging ? 'opacity-60 scale-[0.98]' : 'hover:translate-y-[1px]'}
                            ${isOver ? 'ring-2 ring-cyan-400/70' : ''}`}
                          title="拖动以调整顺序"
                        >
                          {isOver && (
                            <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-cyan-400/70 animate-pulse rounded-xl" />
                          )}
                          <img
                            src={it.url}
                            alt="preview"
                            className="w-full aspect-square object-cover select-none pointer-events-none"
                          />
                          <div className="px-2 py-1 text-[11px] text-white/80 flex items-center justify-between">
                            <span className="truncate">{it.name}</span>
                            {it.key.startsWith('f:') ? (
                              <RemoveBtn onClick={() => removeFile(it.key.slice(2))} title="移除该图片" />
                            ) : (
                              <RemoveBtn
                                onClick={() => {
                                  const id = it.key.slice(2);
                                  const idx = urlItems.findIndex((u) => u.id === id);
                                  if (idx >= 0) removeUrl(idx);
                                }}
                                title="移除该图片"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="btn-shine px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400/95 to-emerald-400/95 text-slate-900 font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.2)]
                  hover:shadow-[0_12px_40px_rgba(34,211,238,0.3)] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 inline-block rounded-full border-2 border-transparent border-t-slate-900 border-r-slate-900 animate-spin" />
                      生成中…
                    </span>
                  ) : (
                    '开始生成'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImages([]);
                    setError(null);
                    setFiles((f) => (f.forEach((x) => URL.revokeObjectURL(x.url)), []));
                    setUrlItems([{ id: uid(), url: '' }]);
                  }}
                  className="px-5 py-3 rounded-2xl bg-white/10 border border-white/25 text-white hover:bg-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                >
                  清空结果
                </button>
              </div>
            </form>

            {error && <p className="text-rose-300 mt-4">{error}</p>}

            {images.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-medium mb-3">生成结果</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {images.map((url, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-sm">
                      <img src={url} alt={`result-${idx}`} className="w-full h-auto" />
                      <div className="flex flex-wrap items-center gap-2 p-3">
                        <a
                          className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15"
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          新标签打开
                        </a>
                        <a
                          className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15"
                          href={url}
                          download
                        >
                          下载
                        </a>
                        <button
                          type="button"
                          onClick={() => setEditUrl(url)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-400/90 text-slate-900 font-medium hover:bg-cyan-400"
                        >
                          继续编辑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {history.length > 0 && (
              <section className="mt-10">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-medium">历史记录</h2>
                  <button
                    className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15"
                    onClick={clearHistory}
                  >
                    清空历史
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {history.map((h) => (
                    <div key={h.id} className="rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-sm">
                      <img src={h.url} alt="history" className="w-full aspect-square object-cover" />
                      <div className="flex flex-wrap items-center gap-2 p-3">
                        <a
                          className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15"
                          href={h.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          打开
                        </a>
                        <a
                          className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15"
                          href={h.url}
                          download
                        >
                          下载
                        </a>
                        <button
                          className="px-3 py-1.5 rounded-lg bg-cyan-400/90 text-slate-900 font-medium hover:bg-cyan-400"
                          onClick={() => setEditUrl(h.url)}
                        >
                          继续编辑
                        </button>
                        <button
                          className="ml-auto px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15"
                          onClick={() => removeHistory(h.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>

      {editUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditUrl(null)}>
          <div className="max-w-sm w-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl text-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">继续编辑</h3>
            <p className="text-white/80 mt-1 mb-4 break-all">将这张图用于新的创作？</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-cyan-400/95 text-slate-900 font-medium hover:bg-cyan-400"
                onClick={() => applyContinueEdit('img')}
              >
                单图替换
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15"
                onClick={() => applyContinueEdit('imgs')}
              >
                多图追加
              </button>
            </div>
            <button className="mt-4 w-full px-4 py-2 rounded-xl bg-white/5 border border-white/20 hover:bg-white/10" onClick={() => setEditUrl(null)}>
              取消
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
