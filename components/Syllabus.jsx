"use client";
import { useState, useMemo } from "react";
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
import { Upload, Download as DownloadIcon, Loader, Trash2 } from "lucide-react";
import Header from "./Header";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { saveAs } from "file-saver";
import { MultiSelect } from "@/components/ui/multi-select";

const Syllabus = ({ initialSyllabus = [], apiKey, activeRole }) => {
  const [year, setYear] = useState(null);
  const [course, setCourse] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [filterCourse, setFilterCourse] = useState(null);

  const { useFetchItems, useAddItem, useDeleteItem } = useCrud(
    "syllabus",
    apiKey
  );
  const fetchSyllabusQuery = useFetchItems(
    null,
    null,
    { year: filterYear, course: filterCourse },
    {}
  );
  const addSyllabus = useAddItem();
  const deleteSyllabus = useDeleteItem();

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
      setYear("");
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
      const filename = `${course}_${year}_syllabus.pdf`;

      const proxyUrl = `/api/download-file?url=${encodeURIComponent(
        fileUrl
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
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(`Failed to delete file: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSyllabus = useMemo(() => {
    return fetchSyllabusQuery.data?.syllabuses || initialSyllabus;
  }, [fetchSyllabusQuery.data, initialSyllabus]);

  const years = [1, 2, 3, 4, 5];
  const courses = ["BSIc(5 Years)", "HSIc(3 Years)", "HSIc(2 Years)"];

  return (
    <>
      <Header
        title="SYLLABUS"
        subTitle="Download and upload syllabus"
      />
      <div className="container mx-auto p-4 space-y-6">
        {activeRole === "College Admin" && (
          <Card>
            <CardHeader>
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
                    onValueChange={setCourse}
                    options={[
                      { value: "BSIc(5 Years)", label: "BSIc(5 Years)" },
                      { value: "HSIc(3 Years)", label: "HSIc(3 Years)" },
                      { value: "HSIc(2 Years)", label: "HSIc(2 Years)" },
                    ]}
                    placeholder="Select or type a course"
                    freeSolo
                    multiSelect={false}
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
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
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
          <CardHeader>
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
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Courses</SelectItem>
                    {courses.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Course {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filter by Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Years</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        Year {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSyllabus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No syllabus available
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSyllabus.map((syllabus) => (
                      <TableRow key={syllabus._id}>
                        <TableCell>{syllabus.course}</TableCell>
                        <TableCell>{syllabus.year}</TableCell>
                        <TableCell>{syllabus.fileName}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
                                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <DownloadIcon className="mr-2 h-4 w-4" />
                                  Download
                                </>
                              )}
                            </Button>
                            {activeRole === "College Admin" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={deletingId === syllabus._id}
                                  >
                                    {deletingId === syllabus._id ? (
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
                                      {syllabus.fileName}" from {syllabus.course}{" "}
                                      Year {syllabus.year}. This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(syllabus)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
    </>
  );
};

export default Syllabus;