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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { uploadFileToR2 } from "@/lib/r2Client";

const Syllabus = ({ initialSyllabus = [], apiKey, activeRole }) => {
  const [year, setYear] = useState(null);
  const [course, setCourse] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingSyllabus, setDeletingSyllabus] = useState(null);
  const [filterYear, setFilterYear] = useState("all");
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
      await fetchSyllabusQuery.refetch();
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
      await fetchSyllabusQuery.refetch();
    } catch (err) {
      console.error("Error deleting course:", err);
      toast.error(err.message || "Failed to delete course");
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud(
    "syllabus",
    apiKey
  );
  const fetchSyllabusQuery = useFetchItems(
    null,
    null,
    {
      year: filterYear === "all" ? "" : filterYear,
      course: filterCourse === "all" ? "" : filterCourse
    },
    { initialData: { syllabuses: initialSyllabus } }
  );
  const addSyllabus = useAddItem();
  const updateSyllabus = useUpdateItem();
  const deleteSyllabus = useDeleteItem();

  const [editingSyllabus, setEditingSyllabus] = useState(null);
  const [editCourse, setEditCourse] = useState("");
  const [editYear, setEditYear] = useState("");

  const handleEditClick = (syllabus) => {
    setEditingSyllabus(syllabus);
    setEditCourse(syllabus.course);
    setEditYear(syllabus.year);
  };

  const handleUpdate = async () => {
    if (!editCourse || !editYear) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await updateSyllabus.mutateAsync({
        data: {
          _id: editingSyllabus._id,
          course: editCourse,
          year: editYear,
        },
      });
      toast.success("Updated successfully");
      setEditingSyllabus(null);
      await fetchSyllabusQuery.refetch();
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
    if (!file || !course || !year) {
      toast.error("Please fill all fields and select a file.");
      return;
    }

    setUploading(true);

    try {
      // Direct client-side upload to Cloudflare R2 (bypasses Vercel 4.5MB payload limit)
      const { fileUrl } = await uploadFileToR2(file, "syllabus");

      // Save syllabus metadata to database
      await addSyllabus.mutateAsync({
        course,
        year,
        fileUrl,
        fileName: file.name,
      });

      // Refresh syllabus list
      await fetchSyllabusQuery.refetch();

      // Reset form
      setCourse("");
      setYear(null);
      setFile(null);

      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileUrl, course, year, downloadId) => {
    setDownloadingId(downloadId);
    try {
      let url = fileUrl;
      const filename = `${course}_Year${year}_Syllabus.pdf`.replace(/\s+/g, "_");

      // For R2 or direct CDN downloads, fetch directly (bypasses Vercel 4.5MB limit)
      if (url.includes(".r2.cloudflarestorage.com") || url.includes(".r2.dev") || !url.includes("cloudinary.com")) {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to download file from storage");
        const blob = await response.blob();
        saveAs(blob, filename);
        toast.success("Download started!");
        return;
      }

      // Force PDF transformation only for Cloudinary images (avoiding raw files like .docx)
      if (url.includes("cloudinary.com") && url.includes("/image/upload/") && !url.toLowerCase().endsWith(".pdf")) {
        const parts = url.split("/upload/");
        if (parts.length === 2) {
          url = `${parts[0]}/upload/f_pdf/${parts[1].replace(/\.[^/.]+$/, ".pdf")}`;
        }
      }

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

  const handleDelete = async (syllabus) => {
    if (!syllabus) return;
    setDeletingId(syllabus._id);
    try {
      await deleteSyllabus.mutateAsync({
        data: {
          _id: syllabus._id,
          fileUrl: syllabus.fileUrl,
        },
      });

      await fetchSyllabusQuery.refetch();
      toast.success("File deleted successfully!");
      setDeletingSyllabus(null);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(`Failed to delete file: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSyllabus = useMemo(() => {
    const data = fetchSyllabusQuery.data?.syllabuses || [];
    return data.filter((item) => {
      const matchCourse = filterCourse === "all" || item.course === filterCourse;
      const matchYear = filterYear === "all" || String(item.year) === String(filterYear);
      return matchCourse && matchYear;
    });
  }, [fetchSyllabusQuery.data, filterCourse, filterYear]);

  const allSyllabuses = fetchSyllabusQuery.data?.syllabuses || [];
  const years = Array.from(new Set(allSyllabuses.map(s => String(s.year)))).sort((a, b) => Number(a) - Number(b));

  const syllabusCountForDeletingCourse = useMemo(() => {
    if (!deletingCourseName) return 0;
    const all = fetchSyllabusQuery.data?.syllabuses || initialSyllabus || [];
    return all.filter(
      (s) => s.course?.trim().toLowerCase() === deletingCourseName?.trim().toLowerCase()
    ).length;
  }, [deletingCourseName, fetchSyllabusQuery.data, initialSyllabus]);

  return (
    <>
      <Header
        title="SYLLABUS"
        subTitle="Download and upload syllabus"
      />
      <div className="space-y-6 mt-4">
        {activeRole === "College Admin" && (
          <Card>
            <CardHeader className="bg-muted/20 border-b mb-4">
              <CardTitle>Upload Syllabus</CardTitle>
              <CardDescription>
                Upload syllabus for students to download
              </CardDescription>
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
                  <Label htmlFor="year">Year</Label>
                  <Select id="year" value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            <CardTitle>
              Available Syllabuses ({filteredSyllabus.length})
            </CardTitle>
            <CardDescription>
              Filter and download syllabus
            </CardDescription>
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
                <Label>Filter by Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        Year {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto border-x">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSyllabus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No syllabus available
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSyllabus.map((syllabus) => (
                      <TableRow
                        key={syllabus._id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          const filename = `${syllabus.course}_Year${syllabus.year}_Syllabus.pdf`.replace(/\s+/g, "_");
                          setPreviewItem({
                            url: syllabus.fileUrl,
                            title: `${syllabus.course} Year ${syllabus.year} Syllabus`,
                            filename,
                          });
                        }}
                      >
                        <TableCell>{syllabus.course}</TableCell>
                        <TableCell>{syllabus.year}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 sm:px-3 text-xs"
                              title="Preview"
                              onClick={(e) => {
                                e.stopPropagation();
                                const filename = `${syllabus.course}_Year${syllabus.year}_Syllabus.pdf`.replace(/\s+/g, "_");
                                setPreviewItem({
                                  url: syllabus.fileUrl,
                                  title: `${syllabus.course} Year ${syllabus.year} Syllabus`,
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
                              onClick={() =>
                                handleDownload(
                                  syllabus.fileUrl,
                                  syllabus.course,
                                  syllabus.year,
                                  syllabus._id
                                )
                              }
                              disabled={downloadingId === syllabus._id}
                            >
                              {downloadingId === syllabus._id ? (
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
                                  className="h-8 w-8 p-0"
                                  title="Edit"
                                  onClick={() => handleEditClick(syllabus)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 w-8 p-0"
                                  title="Delete"
                                  disabled={deletingId === syllabus._id}
                                  onClick={() => setDeletingSyllabus(syllabus)}
                                >
                                  {deletingId === syllabus._id ? (
                                    <Loader className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
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

      {/* Edit Syllabus Dialog */}
      <Dialog open={!!editingSyllabus} onOpenChange={(open) => !open && setEditingSyllabus(null)}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden border shadow-2xl flex flex-col">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md sticky top-0 z-20 shrink-0">
            <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 shrink-0 text-blue-600 dark:text-blue-400">
              <Pencil className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <DialogTitle className="text-lg font-bold m-0 text-foreground">
                Edit Syllabus
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground m-0">
                Update course and year details for this syllabus
              </DialogDescription>
            </div>
            <DialogClose
              onClick={() => setEditingSyllabus(null)}
              className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="p-5 space-y-4 flex-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Course <span className="text-destructive">*</span>
              </Label>
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Year <span className="text-destructive">*</span>
              </Label>
              <Select value={String(editYear)} onValueChange={setEditYear}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-muted/30 dark:bg-muted/10 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSyllabus(null)}
              disabled={updateSyllabus.isPending}
              className="h-9 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdate}
              disabled={updateSyllabus.isPending || !editCourse || !editYear}
              className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateSyllabus.isPending ? (
                <>
                  <Loader className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Syllabus Confirmation Dialog */}
      <AlertDialog
        open={!!deletingSyllabus}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeletingSyllabus(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md flex flex-col p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden border shadow-2xl">
          <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-destructive/5 dark:bg-destructive/10 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
            <div className="p-2 rounded-lg bg-destructive/10 shrink-0 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <AlertDialogTitle className="text-lg font-bold m-0 text-destructive">
                Delete Syllabus?
              </AlertDialogTitle>
              <AlertDialogDescription className="m-0 text-xs text-muted-foreground pt-0.5">
                This syllabus will be permanently removed
              </AlertDialogDescription>
            </div>
            <AlertDialogCancel asChild>
              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => setDeletingSyllabus(null)}
                className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </AlertDialogCancel>
          </AlertDialogHeader>

          <div className="p-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
            Are you sure you want to delete the file{" "}
            <span className="font-semibold text-foreground">"{deletingSyllabus?.fileName}"</span>
            {deletingSyllabus?.course ? (
              <> from <span className="font-semibold text-foreground">{deletingSyllabus.course}</span> Year {deletingSyllabus.year}</>
            ) : null}?
            <br />
            <span className="text-xs text-destructive">
              This action cannot be undone.
            </span>
          </div>

          <AlertDialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-3 w-full">
            <AlertDialogCancel
              disabled={!!deletingId}
              onClick={() => setDeletingSyllabus(null)}
              className="h-9 px-4 text-xs mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deletingSyllabus)}
              disabled={!!deletingId}
              className="h-9 px-4 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? (
                <>
                  <Loader className="mr-2 h-3.5 w-3.5 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Syllabus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                Update course name across all associated syllabus and records
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
              Update the name for this course. All existing syllabus files and records under{" "}
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
            {syllabusCountForDeletingCourse > 0 ? (
              <p className="text-xs text-destructive font-medium">
                Warning: {syllabusCountForDeletingCourse} syllabus file(s) associated with this course will also be permanently deleted.
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

export default Syllabus;
