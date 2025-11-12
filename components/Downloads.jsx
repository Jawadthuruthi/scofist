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

const Downloads = ({ initialDownloads = [], apiKey, activeRole }) => {
  const [year, setYear] = useState(null);
  const [semester, setSemester] = useState(null);
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [filterSemester, setFilterSemester] = useState(null);

  const { useFetchItems, useAddItem, useDeleteItem } = useCrud(
    "downloads",
    apiKey
  );
  const fetchDownloadsQuery = useFetchItems(
    null,
    null,
    { year: filterYear, semester: filterSemester },
    {}
  );
  const addDownload = useAddItem();
  const deleteDownload = useDeleteItem();

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

      // Reset form
      setCourse("");
      setYear("");
      setSemester("");
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

  const handleDownload = async (fileUrl, subject, downloadId) => {
    setDownloadingId(downloadId);
    try {
      // Extract the actual filename from Cloudinary URL
      // Example: https://res.cloudinary.com/.../downloads/file_ia0po8.pdf
      const urlParts = fileUrl.split("/");
      const cloudinaryFilename = urlParts[urlParts.length - 1];

      // Generate clean filename with subject name, enforcing PDF extension
      const filename = `${subject.replace(/\s+/g, "_")}.pdf`;

      console.log("Downloading:", {
        cloudinaryUrl: fileUrl,
        finalFilename: filename,
      });

      // Use API proxy route to avoid CORS issues
      const proxyUrl = `/api/download-file?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(filename)}`;

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
    return fetchDownloadsQuery.data?.downloads || initialDownloads;
  }, [fetchDownloadsQuery.data, initialDownloads]);

  const years = [1, 2, 3, 4, 5];
  const semesters = [1, 2];

  return (
    <>
      <Header
        title="DOWNLOADS"
        description="Download and upload study materials"
      />
      <div className="container mx-auto p-4 space-y-6">
        {/* Upload Section */}
        {activeRole === "College Admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload previous year question papers</CardTitle>
              <CardDescription>
                Upload documents for students to download
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
                <div className="space-y-2">
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
                <div className="space-y-2">
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

        {/* Downloads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Available Downloads</CardTitle>
            <CardDescription>
              Filter and download question papers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
              <div className="space-y-2">
                <Label>Filter by Semester</Label>
                <Select value={filterSemester} onValueChange={setFilterSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Semesters</SelectItem>
                    {semesters.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
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
                      <TableRow key={download._id}>
                        <TableCell>{download.course}</TableCell>
                        <TableCell>{download.year}</TableCell>
                        <TableCell>{download.semester}</TableCell>
                        <TableCell>{download.subject}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDownload(
                                  download.fileUrl,
                                  download.subject,
                                  download._id
                                )
                              }
                              disabled={downloadingId === download._id}
                            >
                              {downloadingId === download._id ? (
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
                                    disabled={deletingId === download._id}
                                  >
                                    {deletingId === download._id ? (
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
                                      {download.subject}" from {download.course}{" "}
                                      Year {download.year} Semester{" "}
                                      {download.semester}. This action cannot
                                      be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(download)}
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

export default Downloads;
