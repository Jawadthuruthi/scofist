"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  Loader2,
  Plus,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeacherNoteCard, TeacherNoteForm } from "./TeacherNoteCard";

const PAGE_LIMIT = 20;

function extractErrorMessage(err, fallback) {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}

/**
 * Private personal notes workspace rendered beneath the My Periods table.
 * Notes are strictly isolated per authenticated teacher on the server.
 */
export default function TeacherNotesSection({ teacherId }) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["teacher-notes", teacherId || "self"],
    [teacherId]
  );

  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [notePendingDelete, setNotePendingDelete] = useState(null);

  const notesQuery = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axios.get("/api/teacher-notes", {
        params: { page: pageParam, limit: PAGE_LIMIT },
        withCredentials: true,
      });
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.meta?.pagination;
      if (!pagination) return undefined;
      const nextPage = pagination.page + 1;
      return nextPage < pagination.totalPages ? nextPage : undefined;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const notes = useMemo(() => {
    const seen = new Set();
    const collected = [];
    for (const page of notesQuery.data?.pages || []) {
      for (const note of page?.data || []) {
        if (note?._id && !seen.has(note._id)) {
          seen.add(note._id);
          collected.push(note);
        }
      }
    }
    return collected;
  }, [notesQuery.data]);

  const totalNotes =
    notesQuery.data?.pages?.[0]?.meta?.pagination?.total ?? notes.length;

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post("/api/teacher-notes", payload, {
        withCredentials: true,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsAdding(false);
      toast.success("Note saved");
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, "Failed to save note"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.put("/api/teacher-notes", payload, {
        withCredentials: true,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingNoteId(null);
      toast.success("Note updated");
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, "Failed to update note"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId) => {
      const res = await axios.delete("/api/teacher-notes", {
        data: { _id: noteId },
        withCredentials: true,
      });
      return res.data;
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey });
      if (editingNoteId === deletedId) {
        setEditingNoteId(null);
      }
      setNotePendingDelete(null);
      toast.success("Note deleted");
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, "Failed to delete note"));
    },
  });

  const handleOpenAdd = () => {
    setEditingNoteId(null);
    setIsAdding(true);
  };

  return (
    <section aria-labelledby="teacher-notes-heading" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="teacher-notes-heading" className="font-bold text-lg">
              NOTES
            </h2>
            {totalNotes > 0 && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {totalNotes}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Personal notes
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleOpenAdd}
          disabled={isAdding || createMutation.isPending}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-card p-3.5 sm:p-4 shadow-sm ring-1 ring-primary/15">
          <TeacherNoteForm
            onSave={(values) => createMutation.mutate(values)}
            onCancel={() => setIsAdding(false)}
            isSaving={createMutation.isPending}
            submitLabel="Save Note"
          />
        </div>
      )}

      {notesQuery.isLoading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          role="status"
          aria-busy="true"
          aria-label="Loading notes"
        >
          <div className="h-28 rounded-xl border bg-muted/40 animate-pulse" />
          <div className="h-28 rounded-xl border bg-muted/40 animate-pulse" />
        </div>
      ) : notesQuery.isError ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm font-medium text-foreground">
            {extractErrorMessage(notesQuery.error, "Could not load your notes.")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => notesQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : notes.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
          <div className="mb-2.5 rounded-full bg-muted p-2.5 text-muted-foreground">
            <StickyNote className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            No notes yet
          </h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Keep reminders, class follow-ups, or private notes here. Only you
            can view, edit, or delete them.
          </p>

        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.map((note) => (
              <TeacherNoteCard
                key={note._id}
                note={note}
                isEditing={editingNoteId === note._id}
                isSaving={
                  updateMutation.isPending &&
                  updateMutation.variables?._id === note._id
                }
                isDeleting={
                  deleteMutation.isPending &&
                  deleteMutation.variables === note._id
                }
                onStartEdit={(target) => {
                  setIsAdding(false);
                  setEditingNoteId(target._id);
                }}
                onCancelEdit={() => setEditingNoteId(null)}
                onSaveEdit={(values) => updateMutation.mutate(values)}
                onRequestDelete={(target) => setNotePendingDelete(target)}
              />
            ))}
          </div>

          {notesQuery.hasNextPage && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => notesQuery.fetchNextPage()}
                disabled={notesQuery.isFetchingNextPage}
              >
                {notesQuery.isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Load more notes ({Math.max(0, totalNotes - notes.length)} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmationPopup
        open={Boolean(notePendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setNotePendingDelete(null);
          }
        }}
        loading={deleteMutation.isPending}
        action="delete"
        title="Delete Note"
        description={
          <>
            Are you sure you want to delete this note
            {notePendingDelete?.title
              ? ` ("${notePendingDelete.title}")`
              : ""}
            ? This action cannot be undone.
          </>
        }
        onClick={async () => {
          if (notePendingDelete?._id) {
            await deleteMutation.mutateAsync(notePendingDelete._id);
          }
        }}
      />
    </section>
  );
}
