"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Upload, Download as DownloadIcon, Loader, Trash2, Pencil, Eye, AlertTriangle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import Header from "./Header";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { saveAs } from "file-saver";
import { MultiSelect } from "@/components/ui/multi-select";
import DocumentPreviewDialog from "./DocumentPreviewDialog";

const Books = ({ initialBooks = [], apiKey, activeRole }) => {
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterName, setFilterName] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [previewItem, setPreviewItem] = useState(null);

  // Dynamic courses management
  const [courses, setCourses] = useState(["BSIc(5 Years)", "HSIc(3 Years)", "HSIc(2 Years)"]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [editingCourseName, setEditingCourseName] = useState(null);
  const [newCourseNameInput, setNewCourseNameInput] = useState("");
  const [savingCourse, setSavingCourse] = useState(false);
  const [deletingCourseName, setDeletingCourseName] = useState(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      setLoadingCourses(true);
      const res = await fetch("/api/downloads/courses", {
        headers: apiKey ? { "api-key": apiKey } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(data.courses);
        }
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoadingCourses(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCourseChange = async (val) => {
    setCourse(val);
    if (val && !courses.includes(val)) {
      try {
        await fetch("/api/downloads/courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "api-key": apiKey } : {}),
          },
          body: JSON.stringify({ name: val.trim() }),
        });
        fetchCourses();
      } catch (err) {
        console.error("Error saving new course:", err);
      }
    }
  };

  const handleOptionEdit = (courseName) => {
    setEditingCourseName(courseName);
    setNewCourseNameInput(courseName);
  };

  const handleSaveCourseName = async () => {
    const trimmed = newCourseNameInput.trim();
    if (!trimmed || !editingCourseName) return;
    if (trimmed === editingCourseName) {
      setEditingCourseName(null);
      return;
    }

    try {
      setSavingCourse(true);
      const res = await fetch("/api/downloads/courses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          oldName: editingCourseName,
          newName: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update course name");
      }
      toast.success(data.message || "Course name updated successfully");
      if (course === editingCourseName) {
        setCourse(trimmed);
      }
      if (filterCourse === editingCourseName) {
        setFilterCourse(trimmed);
      }
      if (editCourse === editingCourseName) {
        setEditCourse(trimmed);
      }
      setEditingCourseName(null);
      await fetchCourses();
      await fetchBooksQuery.refetch();
    } catch (err) {
      console.error("Error updating course:", err);
      toast.error(err.message || "Failed to update course");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleOptionDelete = (courseName) => {
    setDeletingCourseName(courseName);
  };

  const handleConfirmDeleteCourse = async () => {
    if (!deletingCourseName) return;

    try {
      setIsDeletingCourse(true);
      const res = await fetch(
        `/api/downloads/courses?name=${encodeURIComponent(deletingCourseName)}`,
        {
          method: "DELETE",
          headers: apiKey ? { "api-key": apiKey } : {},
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete course");
      }
      toast.success(data.message || "Course deleted successfully");
      if (course && deletingCourseName && course.trim().toLowerCase() === deletingCourseName.trim().toLowerCase()) {
        setCourse("");
      }
      if (filterCourse && deletingCourseName && filterCourse.trim().toLowerCase() === deletingCourseName.trim().toLowerCase()) {
        setFilterCourse("all");
      }
      setDeletingCourseName(null);
      await fetchCourses();
      await fetchBooksQuery.refetch();
    } catch (err) {
      console.error("Error deleting course:", err);
      toast.error(err.message || "Failed to delete course");
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud("books", apiKey);
  const fetchBooksQuery = useFetchItems(
    null,
    null,
    { 
      name: filterName, 
      course: filterCourse === "all" ? "" : filterCourse 
    },
    { initialData: { books: initialBooks } }
  );
  const addBook = useAddItem();
  const updateBook = useUpdateItem();
  const deleteBook = useDeleteItem();

  const [editingBook, setEditingBook] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCourse, setEditCourse] = useState("");

  const handleEditClick = (book) => {
    setEditingBook(book);
    setEditName(book.name);
    setEditCourse(book.course);
  };

  const handleUpdate = async () => {
    if (!editName || !editCourse) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await updateBook.mutateAsync({
        data: {
          _id: editingBook._id,
          name: editName,
          course: editCourse,
        },
      });
      toast.success("Updated successfully");
      setEditingBook(null);
      await fetchBooksQuery.refetch();
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update");
    }
  };

  const onDrop = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !course || !name) {
      toast.error("Please fill all fields and select a file.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "api-key": apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Upload failed with status: ${response.status}`
        );
      }

      const data = await response.json();
      const fileUrl = data.secure_url;

      await addBook.mutateAsync({
        name,
        course,
        fileUrl,
        fileName: file.name,
      });

      await fetchBooksQuery.refetch();

      setName("");
      setCourse("");
      setFile(null);

      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (book, downloadId) => {
    setDownloadingId(downloadId);
    try {
      let url = book.fileUrl;
      // Force PDF transformation only for Cloudinary images (avoiding raw files like .docx)
      if (url.includes("cloudinary.com") && url.includes("/image/upload/") && !url.toLowerCase().endsWith(".pdf")) {
        const parts = url.split("/upload/");
        if (parts.length === 2) {
          url = `${parts[0]}/upload/f_pdf/${parts[1].replace(/\.[^/.]+$/, ".pdf")}`;
        }
      }

      const filename = `${book.name}.pdf`.replace(/\s+/g, "_");
      const proxyUrl = `/api/download-file?url=${encodeURIComponent(
        url
      )}&filename=${encodeURIComponent(filename)}`;

      const response = await fetch(proxyUrl, {
        headers: {
          "api-key": apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download file");
      }

      const blob = await response.blob();
      saveAs(blob, filename);
      toast.success("Download started!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(`Failed to download file: ${error.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (book) => {
    setDeletingId(book._id);
    try {
      await deleteBook.mutateAsync({
        data: {
          _id: book._id,
          fileUrl: book.fileUrl,
        },
      });
      await fetchBooksQuery.refetch();
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(`Failed to delete file: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBooks = useMemo(() => {
    return fetchBooksQuery.data?.books || [];
  }, [fetchBooksQuery.data]);

  const booksCountForDeletingCourse = useMemo(() => {
    if (!deletingCourseName) return 0;
    const all = fetchBooksQuery.data?.books || initialBooks || [];
    return all.filter(
      (b) => b.course?.trim().toLowerCase() === deletingCourseName?.trim().toLowerCase()
    ).length;
  }, [deletingCourseName, fetchBooksQuery.data, initialBooks]);

  return (
    <>
      <Header title="BOOKS" subTitle="Download and upload books" />
      <div className="space-y-6 mt-4">
        {activeRole === "College Admin" && (
          <Card>
            <CardHeader className="bg-muted/20 border-b mb-4">
              <CardTitle>Upload Book</CardTitle>
              <CardDescription>Upload a new book for a course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <MultiSelect
                    id="course"
                    value={course}
                    onValueChange={handleCourseChange}
                    options={courses.map((c) => ({ value: c, label: c }))}
                    placeholder="Select or type a course"
                    freeSolo
                    multiSelect={false}
                    onOptionEdit={activeRole === "College Admin" ? handleOptionEdit : undefined}
                    onOptionDelete={activeRole === "College Admin" ? handleOptionDelete : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Book Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter book name"
                  />
                </div>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="h-5 w-5" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive
                        ? "Drop the file here..."
                        : "Drag 'n' drop a file here, or click to select one"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports: PDF, DOC, DOCX, PPT, PPTX
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="bg-muted/20 border-b mb-4">
            <CardTitle>Available Books ({filteredBooks.length})</CardTitle>
            <CardDescription>Filter and download books</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Filter by Course</Label>
                <MultiSelect
                  value={filterCourse === "all" ? "" : filterCourse}
                  onValueChange={(v) => setFilterCourse(v || "all")}
                  options={courses.map((c) => ({ value: c, label: c }))}
                  placeholder="All Courses"
                  noBadge={true}
                  multiSelect={false}
                  onOptionEdit={activeRole === "College Admin" ? handleOptionEdit : undefined}
                  onOptionDelete={activeRole === "College Admin" ? handleOptionDelete : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label>Filter by Book Name</Label>
                <Input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Search by book name..."
                />
              </div>
            </div>

            <div className="overflow-x-auto border-x">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Book Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No books available
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBooks.map((book) => (
                      <TableRow key={book._id}>
                        <TableCell>{book.course}</TableCell>
                        <TableCell>{book.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 sm:px-3 text-xs"
                              title="Preview"
                              onClick={() => {
                                const filename = `${book.name}_${book.course}`.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_") + ".pdf";
                                setPreviewItem({
                                  url: book.fileUrl,
                                  title: `${book.name} — ${book.course}`,
                                  filename,
                                });
                              }}
                            >
                              <Eye className="h-4 w-4 sm:mr-1.5" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(book, book._id)}
                              disabled={downloadingId === book._id}
                            >
                              {downloadingId === book._id ? (
                                <>
                                  <Loader className="h-4 w-4 sm:mr-2 animate-spin" />
                                  <span className="hidden sm:inline">Downloading...</span>
                                </>
                              ) : (
                                <>
                                  <DownloadIcon className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Download</span>
                                </>
                              )}
                            </Button>
                            {activeRole === "College Admin" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditClick(book)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={deletingId === book._id}
                                    >
                                      {deletingId === book._id ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Are you sure?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the file "
                                        {book.fileName}" ({book.name}). This
                                        action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(book)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Book Dialog */}
      <Dialog open={!!editingBook} onOpenChange={(open) => !open && setEditingBook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <MultiSelect
                value={editCourse}
                onValueChange={setEditCourse}
                options={courses.map((c) => ({ value: c, label: c }))}
                placeholder="Select or type a course"
                freeSolo
                multiSelect={false}
                onOptionEdit={activeRole === "College Admin" ? handleOptionEdit : undefined}
                onOptionDelete={activeRole === "College Admin" ? handleOptionDelete : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label>Book Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter book name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBook(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateBook.isPending}>
              {updateBook.isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Name Dialog */}
      <Dialog
        open={!!editingCourseName}
        onOpenChange={(open) => !open && setEditingCourseName(null)}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden border shadow-2xl flex flex-col">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md sticky top-0 z-20 shrink-0">
            <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 shrink-0 text-blue-600 dark:text-blue-400">
              <Pencil className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <DialogTitle className="text-lg font-bold m-0 text-foreground">
                Edit Course Name
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground m-0">
                Update course name across all associated books and records
              </DialogDescription>
            </div>
            <DialogClose
              onClick={() => setEditingCourseName(null)}
              className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="p-5 space-y-4 flex-1">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
              Update the name for this course. All existing books and records under{" "}
              <span className="font-semibold text-foreground">"{editingCourseName}"</span>{" "}
              will automatically be updated.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courseNameInput" className="text-xs font-semibold">
                Course Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="courseNameInput"
                value={newCourseNameInput}
                onChange={(e) => setNewCourseNameInput(e.target.value)}
                placeholder="Enter new course name"
                className="h-10 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveCourseName();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/30 dark:bg-muted/10 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingCourseName(null)}
              disabled={savingCourse}
              className="h-9 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCourseName}
              disabled={
                savingCourse ||
                !newCourseNameInput.trim() ||
                newCourseNameInput.trim() === editingCourseName
              }
              className="h-9 px-5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingCourse ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCourseName}
        onOpenChange={(open) => {
          if (!open && !isDeletingCourse) {
            setDeletingCourseName(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md flex flex-col p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden border shadow-2xl">
          <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-destructive/5 dark:bg-destructive/10 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
            <div className="p-2 rounded-lg bg-destructive/10 shrink-0 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <AlertDialogTitle className="text-lg font-bold m-0 text-destructive">
                Delete Course?
              </AlertDialogTitle>
              <AlertDialogDescription className="m-0 text-xs text-muted-foreground pt-0.5">
                This course will be permanently removed
              </AlertDialogDescription>
            </div>
            <AlertDialogCancel asChild>
              <button
                type="button"
                disabled={isDeletingCourse}
                className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </AlertDialogCancel>
          </AlertDialogHeader>

          <div className="p-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p>
              Are you sure you want to delete the course{" "}
              <strong className="text-foreground font-semibold">
                "{deletingCourseName}"
              </strong>
              ?
            </p>
            {booksCountForDeletingCourse > 0 ? (
              <p className="text-xs text-destructive font-medium">
                Warning: {booksCountForDeletingCourse} book(s) associated with this course will also be permanently deleted.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                This action cannot be undone.
              </p>
            )}
          </div>

          <AlertDialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-3 w-full">
            <AlertDialogCancel disabled={isDeletingCourse} className="h-9 px-4 text-xs mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteCourse}
              disabled={isDeletingCourse}
              className="h-9 px-5 text-xs font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5 mt-0"
            >
              {isDeletingCourse ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Dialog */}
      <DocumentPreviewDialog
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        item={previewItem}
      />
    </>
  );
};

export default Books;
