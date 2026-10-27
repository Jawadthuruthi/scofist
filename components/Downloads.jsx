"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Upload, Download as DownloadIcon, Loader, Trash2, Pencil, Eye, X, AlertTriangle } from "lucide-react";
import Header from "./Header";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { saveAs } from "file-saver";
import { MultiSelect } from "@/components/ui/multi-select";
import DocumentPreviewDialog from "./DocumentPreviewDialog";

const Downloads = ({ initialDownloads = [], apiKey, activeRole }) => {
  const [year, setYear] = useState(null);
  const [semester, setSemester] = useState(null);
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [previewItem, setPreviewItem] = useState(null); // { url, title }
  const [filterYear, setFilterYear] = useState(null);
  const [filterSemester, setFilterSemester] = useState(null);
  const [filterCourse, setFilterCourse] = useState(null);

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
      setEditingCourseName(null);
      await fetchCourses();
      await fetchDownloadsQuery.refetch();
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
        setFilterCourse(null);
      }
      setDeletingCourseName(null);
      await fetchCourses();
      await fetchDownloadsQuery.refetch();
    } catch (err) {
      console.error("Error deleting course:", err);
      toast.error(err.message || "Failed to delete course");
    } finally {
      setIsDeletingCourse(false);
    }
  };

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


  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud(
    "downloads",
    apiKey
  );
  const fetchDownloadsQuery = useFetchItems(
    0,
    1000,
    {},
    {}
  );
  const addDownload = useAddItem();
  const updateDownload = useUpdateItem();
  const deleteDownload = useDeleteItem();

  const [editingDownload, setEditingDownload] = useState(null);
  const [editCourse, setEditCourse] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSemester, setEditSemester] = useState("");
  const [editSubject, setEditSubject] = useState("");

  const handleEditClick = (download) => {
    setEditingDownload(download);
    setEditCourse(download.course);
    setEditYear(download.year);
    setEditSemester(download.semester);
    setEditSubject(download.subject);
  };

  const handleUpdate = async () => {
    if (!editCourse || !editYear || !editSemester || !editSubject) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await updateDownload.mutateAsync({
        data: {
          _id: editingDownload._id,
          course: editCourse,
          year: editYear,
          semester: editSemester,
          subject: editSubject,
        },
      });
      toast.success("Updated successfully");
      setEditingDownload(null);
      await fetchDownloadsQuery.refetch();
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
    if (!file || !course || !year || !semester || !subject) {
      toast.error("Please fill all fields and select a file.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Upload via /api/upload
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

      // Save download metadata to database
      await addDownload.mutateAsync({
        course,
        year,
        semester,
        subject,
        fileUrl,
      });

      // Refresh downloads list
      await fetchDownloadsQuery.refetch();

      // Reset form (persisting course, year, semester as requested)
      setSubject("");
      setFile(null);

      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (download, downloadId) => {
    const { fileUrl, subject, course, year, semester } = download;
    setDownloadingId(downloadId);
    try {
      let url = fileUrl;
      // Force PDF transformation only for Cloudinary images (avoiding raw files like .docx)
      if (url.includes("cloudinary.com") && url.includes("/image/upload/") && !url.toLowerCase().endsWith(".pdf")) {
        const parts = url.split("/upload/");
        if (parts.length === 2) {
          url = `${parts[0]}/upload/f_pdf/${parts[1].replace(/\.[^/.]+$/, ".pdf")}`;
        }
      }


      // Generate clean filename with subject name, enforcing PDF extension
      const filename = `${subject}_${course}_Year${year}_Sem${semester}.pdf`.replace(/\s+/g, "_");

      // Use API proxy route to avoid CORS issues
      const proxyUrl = `/api/download-file?url=${encodeURIComponent(
        url
      )}&filename=${encodeURIComponent(filename)}`;


      // Fetch through proxy
      const response = await fetch(proxyUrl, {
        headers: {
          "api-key": apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download file");
      }

      // Get blob from response with correct type
      const blob = await response.blob();

      console.log("Blob received:", {
        size: blob.size,
        type: blob.type,
      });

      // Use file-saver to download
      saveAs(blob, filename);

      toast.success("Download started!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(`Failed to download file: ${error.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (download) => {
    setDeletingId(download._id);
    try {
      // Call delete mutation with correct data structure
      await deleteDownload.mutateAsync({
        data: {
          _id: download._id,
          fileUrl: download.fileUrl,
        },
      });

      await fetchDownloadsQuery.refetch();
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(`Failed to delete file: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDownloads = useMemo(() => {
    const all = fetchDownloadsQuery.data?.downloads || initialDownloads;
    return all.filter((d) => {
      if (filterCourse && d.course !== filterCourse) return false;
      if (filterYear && String(d.year) !== String(filterYear)) return false;
      if (filterSemester && String(d.semester) !== String(filterSemester)) return false;
      return true;
    });
  }, [fetchDownloadsQuery.data, initialDownloads, filterCourse, filterYear, filterSemester]);

  const years = [1, 2, 3, 4, 5];
  const semesters = [1, 2];

  const downloadsCountForDeletingCourse = useMemo(() => {
    if (!deletingCourseName) return 0;
    const all = fetchDownloadsQuery.data?.downloads || initialDownloads;
    return all.filter(
      (d) => d.course?.trim().toLowerCase() === deletingCourseName?.trim().toLowerCase()
    ).length;
  }, [deletingCourseName, fetchDownloadsQuery.data, initialDownloads]);

  return (
    <>
      <Header
        title="QUESTION PAPERS"
        subTitle="Download and upload question papers"
      />
      <div className="space-y-6 mt-4">
        {/* Upload Section */}
        {activeRole === "College Admin" && (
          <Card>
            <CardHeader className="bg-muted/20 border-b mb-4">
              <CardTitle>Upload previous year question papers</CardTitle>
              <CardDescription>
                Upload question papers for students
              </CardDescription>
            </CardHeader>
            <CardContent
              className="space-y-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (e.defaultPrevented) return;
                  const target = e.target;
                  if (
                    target.tagName === "BUTTON" ||
                    target.closest("button") ||
                    target.tagName === "A" ||
                    target.closest('[role="button"]')
                  ) {
                    return;
                  }
                  handleUpload();
                }
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2 md:col-span-1">
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
                <div className="space-y-2 col-span-1">
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
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="semester">Semester</Label>
                  <Select
                    id="semester"
                    value={semester}
                    onValueChange={setSemester}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2].map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

              {/* Dropzone */}
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

        {/* Downloads Table */}
        <Card>
          <CardHeader className="bg-muted/20 border-b mb-4">
            <CardTitle>
              Available Question Papers ({filteredDownloads.length})
            </CardTitle>
            <CardDescription>
              Filter and download question papers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2 col-span-2 md:col-span-2">
                <Label>Filter by Course</Label>
                <MultiSelect
                  value={filterCourse || ""}
                  onValueChange={(v) => setFilterCourse(v || null)}
                  options={courses.map((c) => ({ value: c, label: c }))}
                  placeholder="All Courses"
                  noBadge={true}
                  multiSelect={false}
                  onOptionEdit={activeRole === "College Admin" ? handleOptionEdit : undefined}
                  onOptionDelete={activeRole === "College Admin" ? handleOptionDelete : undefined}
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Filter by Year</Label>
                <Select
                  value={filterYear ?? "all"}
                  onValueChange={(v) => setFilterYear(v === "all" ? null : v)}
                >
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
              <div className="space-y-2 col-span-1">
                <Label>Filter by Semester</Label>
                <Select
                  value={filterSemester ?? "all"}
                  onValueChange={(v) => setFilterSemester(v === "all" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semesters.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
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
                    <TableHead>Semester</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDownloads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No downloads available
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDownloads.map((download) => (
                      <TableRow
                        key={download._id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          const filename = `${download.subject}_${download.course}_Year${download.year}_Sem${download.semester}.pdf`.replace(/\s+/g, "_");
                          setPreviewItem({
                            url: download.fileUrl,
                            title: `${download.subject} — ${download.course} Year ${download.year} Sem ${download.semester}`,
                            filename,
                          });
                        }}
                      >
                        <TableCell>{download.course}</TableCell>
                        <TableCell>{download.year}</TableCell>
                        <TableCell>{download.semester}</TableCell>
                        <TableCell>{download.subject}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 sm:px-3 text-xs"
                              title="Preview"
                              onClick={(e) => {
                                e.stopPropagation();
                                const filename = `${download.subject}_${download.course}_Year${download.year}_Sem${download.semester}.pdf`.replace(/\s+/g, "_");
                                setPreviewItem({
                                  url: download.fileUrl,
                                  title: `${download.subject} — ${download.course} Year ${download.year} Sem ${download.semester}`,
                                  filename,
                                });
                              }}
                            >
                              <Eye className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDownload(
                                  download,
                                  download._id
                                )
                              }

                              disabled={downloadingId === download._id}
                            >
                              {downloadingId === download._id ? (
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
                                  onClick={() => handleEditClick(download)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={deletingId === download._id}
                                    >
                                      {deletingId === download._id ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="sm:max-w-md flex flex-col p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden border shadow-2xl">
                                    <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-destructive/5 dark:bg-destructive/10 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
                                      <div className="p-2 rounded-lg bg-destructive/10 shrink-0 text-destructive">
                                        <AlertTriangle className="h-5 w-5" />
                                      </div>
                                      <div className="flex-1 text-left space-y-0.5 min-w-0">
                                        <AlertDialogTitle className="text-lg font-bold m-0 text-destructive">
                                          Delete Question Paper?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="m-0 text-xs text-muted-foreground pt-0.5">
                                          This file will be permanently removed
                                        </AlertDialogDescription>
                                      </div>
                                      <AlertDialogCancel asChild>
                                        <button
                                          type="button"
                                          className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
                                        >
                                          <X className="h-5 w-5" />
                                        </button>
                                      </AlertDialogCancel>
                                    </AlertDialogHeader>
                                    <div className="p-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
                                      <p>
                                        This will permanently delete the file{" "}
                                        <strong className="text-foreground font-semibold">"{download.subject}"</strong>{" "}
                                        from {download.course} Year {download.year} Semester {download.semester}.
                                      </p>
                                      <p className="text-xs text-destructive font-medium">
                                        This action cannot be undone.
                                      </p>
                                    </div>
                                    <AlertDialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-3 w-full">
                                      <AlertDialogCancel className="h-9 px-4 text-xs mt-0">
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(download)}
                                        className="h-9 px-5 text-xs font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5 mt-0"
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
      <EditDialog
        open={!!editingDownload}
        onOpenChange={(open) => !open && setEditingDownload(null)}
        course={editCourse}
        setCourse={setEditCourse}
        courses={courses}
        year={editYear}
        setYear={setEditYear}
        semester={editSemester}
        setSemester={setEditSemester}
        subject={editSubject}
        setSubject={setEditSubject}
        onSave={handleUpdate}
        loading={updateDownload.isPending}
      />
      {/* PDF Preview Dialog */}
      <DocumentPreviewDialog
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        item={previewItem}
      />

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
                Update course name across all associated question papers
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
              Update the name for this course. All existing question papers under{" "}
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
            {downloadsCountForDeletingCourse > 0 ? (
              <p className="text-xs text-destructive font-medium">
                Warning: {downloadsCountForDeletingCourse} question paper(s) associated with this course will also be permanently deleted.
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
    </>
  );
};

/* Edit Dialog Component logic is embedded inside for simplicity based on current structure */
const EditDialog = ({
  open,
  onOpenChange,
  course,
  setCourse,
  courses = [],
  year,
  setYear,
  semester,
  setSemester,
  subject,
  setSubject,
  onSave,
  loading
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden border shadow-2xl flex flex-col">
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 shrink-0 text-blue-600 dark:text-blue-400">
            <Pencil className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left space-y-0.5 min-w-0">
            <DialogTitle className="text-lg font-bold m-0 text-foreground">
              Edit Question Paper
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground m-0">
              Update course, year, semester, or subject details
            </DialogDescription>
          </div>
          <DialogClose
            onClick={() => onOpenChange(false)}
            className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>

        <div className="p-5 space-y-4 flex-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Course</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Year</Label>
              <Select value={String(year)} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Semester</Label>
              <Select value={String(semester)} onValueChange={setSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/30 dark:bg-muted/10 flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="h-9 px-5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ... existing imports ...


export default Downloads;
