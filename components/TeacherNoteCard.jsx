"use client";

import { useState } from "react";
import { Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 5000;

function formatNoteTimestamp(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch (err) {
    console.warn("Note timestamp formatting fallback:", err?.message || err);
    return date.toLocaleString();
  }
}

/**
 * Shared composer form for creating and editing a teacher's personal note.
 */
export function TeacherNoteForm({
  initialTitle = "",
  initialContent = "",
  onSave,
  onCancel,
  isSaving = false,
  submitLabel = "Save Note",
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  const trimmedContent = content.trim();
  const isOverLimit =
    title.trim().length > MAX_TITLE_LENGTH ||
    trimmedContent.length > MAX_CONTENT_LENGTH;
  const canSubmit = trimmedContent.length > 0 && !isOverLimit && !isSaving;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({
      title: title.trim(),
      content: trimmedContent,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape" && !isSaving) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={MAX_TITLE_LENGTH}
        placeholder="Note title (optional)"
        aria-label="Note title"
        disabled={isSaving}
        className="h-9 text-sm font-medium bg-background"
      />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={MAX_CONTENT_LENGTH}
        rows={3}
        autoFocus
        placeholder="Write your important note..."
        aria-label="Note content"
        disabled={isSaving}
        className="min-h-[88px] resize-y text-sm bg-background leading-relaxed"
      />
        <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
          {content.length > 4000 && (
            <span className="text-xs text-muted-foreground mr-auto">
              {content.length}/{MAX_CONTENT_LENGTH} characters
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {submitLabel}
            </Button>
          </div>
        </div>
    </form>
  );
}

/**
 * Displays a single private teacher note with inline edit and delete actions.
 */
export function TeacherNoteCard({
  note,
  isEditing,
  isSaving,
  isDeleting,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRequestDelete,
}) {
  if (isEditing) {
    return (
      <div className="rounded-xl border border-primary/40 bg-card p-3.5 sm:p-4 shadow-sm ring-1 ring-primary/15">
        <TeacherNoteForm
          key={note._id}
          initialTitle={note.title || ""}
          initialContent={note.content || ""}
          onSave={(values) => onSaveEdit({ _id: note._id, ...values })}
          onCancel={onCancelEdit}
          isSaving={isSaving}
          submitLabel="Save Changes"
        />
      </div>
    );
  }

  const createdMs = note.createdAt ? new Date(note.createdAt).getTime() : 0;
  const updatedMs = note.updatedAt ? new Date(note.updatedAt).getTime() : 0;
  const wasEdited = updatedMs - createdMs > 2000;
  const timestamp = formatNoteTimestamp(note.updatedAt || note.createdAt);

  return (
    <article className="flex flex-col justify-between rounded-xl border bg-card p-3.5 sm:p-4 shadow-sm transition-colors hover:border-border/80">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {note.title ? (
              <h3 className="text-sm font-semibold text-foreground break-words leading-snug">
                {note.title}
              </h3>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                Note
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onStartEdit(note)}
              disabled={isDeleting}
              aria-label={`Edit note${note.title ? `: ${note.title}` : ""}`}
              title="Edit note"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRequestDelete(note)}
              disabled={isDeleting}
              aria-label={`Delete note${note.title ? `: ${note.title}` : ""}`}
              title="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
          {note.content}
        </p>
      </div>

      {timestamp && (
        <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{timestamp}</span>
          {wasEdited && <span className="italic">Edited</span>}
        </div>
      )}
    </article>
  );
}
