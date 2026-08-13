import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import Modal from '../components/Modal';
import { createNote, deleteNote, getNotes, updateNote } from '../lib/commands';
import type { Note } from '../lib/types';
import styles from './Notes.module.css';

function parseDbDate(value: string) {
  if (value.includes('T')) return new Date(value);
  return new Date(`${value.replace(' ', 'T')}Z`);
}

function groupLabel(date: Date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, dd MMMM yyyy');
}

function timestamp(value: string) {
  return format(parseDbDate(value), 'dd MMM yyyy, HH:mm');
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setNotes(await getNotes());
      setError(null);
    } catch (reason) {
      setError(`Could not load notes: ${String(reason)}`);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const groups = useMemo(() => {
    const grouped = new Map<string, Note[]>();
    notes.forEach((note) => {
      const key = format(parseDbDate(note.created_at), 'yyyy-MM-dd');
      grouped.set(key, [...(grouped.get(key) ?? []), note]);
    });
    return [...grouped.entries()];
  }, [notes]);

  const openEditor = (note: Note | 'new') => {
    setEditing(note);
    setTitle(note === 'new' ? '' : note.title);
    setContent(note === 'new' ? '' : note.content);
    setError(null);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditing(null);
    setTitle('');
    setContent('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        await createNote({ title, content });
      } else if (editing) {
        await updateNote({ id: editing.id, title, content });
      }
      setEditing(null);
      setTitle('');
      setContent('');
      await refresh();
    } catch (reason) {
      setError(`Could not save note: ${String(reason)}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteNote(pendingDelete.id);
      setNotes((current) =>
        current.filter((item) => item.id !== pendingDelete.id),
      );
      setPendingDelete(null);
    } catch (reason) {
      setError(`Could not delete note: ${String(reason)}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Notes</h1>
          <p>Your study thoughts, organised by the day they were created.</p>
        </div>
        <button className={styles.newButton} onClick={() => openEditor('new')}>
          + New note
        </button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {groups.length === 0 ? (
        <div className={styles.empty}>
          <span>✎</span>
          <h2>No notes yet</h2>
          <p>Capture a formula, insight, or reminder for later.</p>
          <button onClick={() => openEditor('new')}>Write your first note</button>
        </div>
      ) : (
        <div className={styles.groups}>
          {groups.map(([date, items]) => (
            <section className={styles.group} key={date}>
              <div className={styles.dateHeading}>
                <h2>{groupLabel(new Date(`${date}T00:00:00`))}</h2>
                <span>{items.length} note{items.length === 1 ? '' : 's'}</span>
              </div>
              <div className={styles.noteGrid}>
                {items.map((note) => (
                  <article className={styles.noteCard} key={note.id}>
                    <div className={styles.noteTop}>
                      <h3>{note.title}</h3>
                      <div className={styles.actions}>
                        <button onClick={() => openEditor(note)}>Edit</button>
                        <button
                          type="button"
                          className={styles.delete}
                          onClick={() => {
                            setError(null);
                            setPendingDelete(note);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className={styles.content}>{note.content}</p>
                    <div className={styles.meta}>
                      <span>Created {timestamp(note.created_at)}</span>
                      <span>Last updated {timestamp(note.updated_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing === 'new' ? 'New note' : 'Edit note'}
          onClose={closeEditor}
          width={640}
        >
          <form className={styles.form} onSubmit={save}>
            <label>
              <span>Title</span>
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What is this note about?"
                maxLength={120}
              />
            </label>
            <label>
              <span>Note</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write your note here…"
                rows={10}
              />
            </label>
            {error && <div className={styles.formError}>{error}</div>}
            <div className={styles.formActions}>
              <button type="button" onClick={closeEditor}>Cancel</button>
              <button
                className={styles.saveButton}
                type="submit"
                disabled={saving || !title.trim() || !content.trim()}
              >
                {saving ? 'Saving…' : editing === 'new' ? 'Create note' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <Modal
          title="Delete note?"
          onClose={() => !deleting && setPendingDelete(null)}
          width={440}
        >
          <p className={styles.confirmCopy}>
            “{pendingDelete.title}” will be permanently deleted.
          </p>
          {error && <div className={styles.formError}>{error}</div>}
          <div className={styles.formActions}>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              disabled={deleting}
              onClick={remove}
            >
              {deleting ? 'Deleting…' : 'Delete note'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
