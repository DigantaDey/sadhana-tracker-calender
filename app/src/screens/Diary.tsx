import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Hash,
  Link2,
  Network,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav, type NoteRequest } from '../lib/nav';
import type { Note } from '../lib/types';
import { formatLong, fromISO, MONTHS, todayISO } from '../lib/date';
import { excerpt, extractLinks, extractTags, renderMarkdown } from '../lib/markdown';
import { Empty, Segmented } from '../components/ui';
import { NoteGraph } from '../components/NoteGraph';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'untitled';

function dailyTitle(date: string) {
  const d = fromISO(date);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function DiaryScreen({
  noteRequest,
  clearNoteRequest,
}: {
  noteRequest: NoteRequest | null;
  clearNoteRequest: () => void;
}) {
  const { state, saveNote, deleteNote, pushToast } = useStore();
  const nav = useNav();
  const [mode, setMode] = useState<'notes' | 'graph'>('notes');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [preview, setPreview] = useState(false);
  const autosave = useRef<number | null>(null);

  const notes = state.notes;
  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of notes) for (const t of extractTags(n.body)) map.set(t, (map.get(t) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => (tag ? extractTags(n.body).includes(tag) : true))
      .filter(
        (n) =>
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
      });
  }, [notes, query, tag]);

  const openNote = (n: Note) => {
    setEditing(n);
    setPreview(false);
  };

  const createNote = (title = '', date = todayISO(), body = '') => {
    const note: Note = {
      id: `note-${slug(title || 'untitled')}-${Date.now().toString(36).slice(-4)}`,
      date,
      title,
      body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEditing(note);
    setPreview(false);
  };

  const openByTitle = (title: string) => {
    const found = notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
    if (found) return openNote(found);
    // create the note so a wiki-link is never a dead end
    const note: Note = {
      id: `note-${slug(title)}-${Date.now().toString(36).slice(-4)}`,
      date: todayISO(),
      title,
      body: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEditing(note);
    setPreview(false);
  };

  const openByDate = (date: string) => {
    const found = notes.find((n) => n.date === date);
    if (found) return openNote(found);
    createNote(dailyTitle(date), date, '');
  };

  useEffect(() => {
    if (!noteRequest) return;
    if (noteRequest.kind === 'id') {
      const n = notes.find((x) => x.id === noteRequest.id);
      if (n) openNote(n);
    } else if (noteRequest.kind === 'title') {
      openByTitle(noteRequest.title);
    } else {
      openByDate(noteRequest.date);
    }
    clearNoteRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteRequest]);

  const updateEditing = (patch: Partial<Note>) => {
    if (!editing) return;
    const next = { ...editing, ...patch };
    setEditing(next);
    if (autosave.current) window.clearTimeout(autosave.current);
    autosave.current = window.setTimeout(() => saveNote(next), 400);
  };

  const commit = () => {
    if (!editing) return;
    if (!editing.title.trim() && !editing.body.trim()) {
      setEditing(null);
      return;
    }
    const final = {
      ...editing,
      title: editing.title.trim() || dailyTitle(editing.date),
    };
    saveNote(final);
    setEditing(null);
    pushToast({ text: 'Saved to your diary', icon: 'check' });
  };

  const backlinksFor = (title: string) =>
    notes.filter((n) => n.id !== editing?.id && extractLinks(n.body).some((l) => l.toLowerCase() === title.toLowerCase()));

  const parsed = editing ? renderMarkdown(editing.body) : null;

  return (
    <>
      <main className="screen">
        <div className="screen__head" style={{ paddingBottom: 8 }}>
          <div className="row row--between">
            <div>
              <div className="eyebrow">Svādhyāya</div>
              <h1 className="title">Diary</h1>
            </div>
            <button
              className="btn btn--ghost"
              style={{ height: 38 }}
              onClick={() => createNote('')}
              type="button"
            >
              <Plus /> Note
            </button>
          </div>
          <p className="sub">
            Plain markdown, stored on this device. Link notes with <code>[[double brackets]]</code>{' '}
            and they become a web you can walk back through.
          </p>
        </div>

        <Segmented
          value={mode}
          onChange={setMode}
          small
          options={[
            { value: 'notes', label: 'Notes' },
            { value: 'graph', label: 'Constellation' },
          ]}
        />

        {mode === 'notes' ? (
          <>
            <div className="searchbar">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entries"
                aria-label="Search notes"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear" type="button">
                  <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>clear</span>
                </button>
              )}
            </div>

            {allTags.length > 0 && (
              <div className="chips" style={{ marginTop: 12 }}>
                {allTags.map(([t, n]) => (
                  <button
                    key={t}
                    className="chip chip--sm"
                    data-active={tag === t}
                    onClick={() => setTag(tag === t ? null : t)}
                    type="button"
                  >
                    <Hash size={10} /> {t}
                    <span style={{ opacity: 0.55, fontSize: 10 }}>{n}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="notelist" style={{ marginTop: 16 }}>
              {filtered.length === 0 && (
                <Empty glyph="✎">
                  {query || tag
                    ? 'Nothing matches that yet.'
                    : 'No entries. Today is a good day to start — three honest sentences will do.'}
                </Empty>
              )}
              {filtered.map((n) => (
                <button key={n.id} className="notecard" onClick={() => openNote(n)} type="button">
                  <div className="notecard__date">
                    {formatLong(n.date)}
                    {n.pinned && <Pin size={10} className="pin" style={{ marginLeft: 2 }} />}
                  </div>
                  <div className="notecard__title">{n.title || dailyTitle(n.date)}</div>
                  <div className="notecard__excerpt">{excerpt(n.body) || 'Empty entry'}</div>
                  {extractTags(n.body).length > 0 && (
                    <div className="notecard__tags">
                      {extractTags(n.body)
                        .slice(0, 4)
                        .map((t) => (
                          <span key={t} className="tagpill">
                            #{t}
                          </span>
                        ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="divider" />
            <div className="row row--between">
              <div className="mono-note" style={{ margin: 0 }}>
                {notes.length} entries · {notes.reduce((a, n) => a + extractLinks(n.body).length, 0)}{' '}
                links · stored locally
              </div>
            </div>
          </>
        ) : (
          <>
            <NoteGraph notes={notes} onOpen={openNote} />
            <p className="mono-note">
              Each line is a <code>[[link]]</code> between entries. The more you write, the more this
              graph becomes a map of your practice — the reason the diary lives beside the tracker
              instead of in another app.
            </p>
            <div className="stack gap-2 mt-4">
              {notes
                .map((n) => ({ n, links: extractLinks(n.body).length }))
                .sort((a, b) => b.links - a.links)
                .slice(0, 4)
                .map(({ n, links }) => (
                  <button
                    key={n.id}
                    className="notecard"
                    onClick={() => openNote(n)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    type="button"
                  >
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14.5 }}>{n.title}</span>
                    <span className="row" style={{ gap: 4, color: 'var(--muted-2)', fontSize: 11 }}>
                      <Link2 size={11} /> {links}
                    </span>
                  </button>
                ))}
            </div>
          </>
        )}
      </main>

      {editing && (
        <section className="editor" aria-label="Note editor">
          <div className="editor__bar">
            <button className="iconbtn" onClick={commit} aria-label="Back" type="button">
              <ArrowLeft />
            </button>
            <div className="editor__meta">
              {formatLong(editing.date)}
              {autosave.current ? '' : ''}
            </div>
            <div className="row" style={{ gap: 2 }}>
              <button
                className="iconbtn"
                onClick={() => updateEditing({ pinned: !editing.pinned })}
                aria-label="Pin note"
                style={{ color: editing.pinned ? 'var(--accent)' : undefined }}
                type="button"
              >
                <Pin />
              </button>
              <button
                className="iconbtn"
                onClick={() => setPreview((p) => !p)}
                aria-label={preview ? 'Edit' : 'Preview'}
                type="button"
              >
                {preview ? <Pencil /> : <Check />}
              </button>
            </div>
          </div>

          <div className="editor__scroll">
            {!preview ? (
              <>
                <input
                  className="editor__title"
                  value={editing.title}
                  onChange={(e) => updateEditing({ title: e.target.value })}
                  placeholder="Title"
                  aria-label="Note title"
                />
                <textarea
                  className="editor__body"
                  value={editing.body}
                  onChange={(e) => {
                    const el = e.target;
                    updateEditing({ body: el.value });
                    el.style.height = 'auto';
                    el.style.height = `${Math.max(320, el.scrollHeight)}px`;
                  }}
                  placeholder="What did the practice feel like today? Link an entry with [[its title]], tag it with #steadiness."
                  aria-label="Note body"
                  spellCheck
                />
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {extractTags(editing.body).map((t) => (
                    <button
                      key={t}
                      className="tagpill"
                      onClick={() => {
                        setTag(t);
                        setMode('notes');
                        commit();
                      }}
                      type="button"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="prose">
                <h2 style={{ marginTop: 0 }}>{editing.title || 'Untitled'}</h2>
                <div
                  dangerouslySetInnerHTML={{ __html: parsed?.html ?? '' }}
                  onClick={(e) => {
                    const el = e.target as HTMLElement;
                    const note = el.closest('[data-note]')?.getAttribute('data-note');
                    const tagAttr = el.getAttribute('data-tag');
                    if (note) {
                      e.preventDefault();
                      openByTitle(note);
                    } else if (tagAttr) {
                      e.preventDefault();
                      setTag(tagAttr);
                      setMode('notes');
                      commit();
                    }
                  }}
                />
              </div>
            )}

            {backlinksFor(editing.title).length > 0 && (
              <div className="backlinks">
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  Linked mentions
                </div>
                {backlinksFor(editing.title).map((n) => (
                  <button key={n.id} className="backlink" onClick={() => openNote(n)} type="button">
                    <Network size={12} />
                    <span>
                      <strong>{n.title}</strong> — {excerpt(n.body, 60)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="row row--between" style={{ marginTop: 28 }}>
              <button
                className="btn btn--quiet"
                onClick={() => {
                  if (confirm('Delete this entry? This cannot be undone.')) {
                    deleteNote(editing.id);
                    setEditing(null);
                    pushToast({ text: 'Entry deleted', icon: 'info' });
                  }
                }}
                style={{ color: 'var(--rose)', paddingLeft: 0 }}
                type="button"
              >
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn--primary" onClick={commit} type="button">
                Done
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
