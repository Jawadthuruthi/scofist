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
import { Upload, Download as DownloadIcon, Loader } from "lucide-react";
import Header from "./Header";
import useCrud from "@/hooks/use-crud";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

const Downloads = ({ initialDownloads = [], role, apiKey }) => {
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { useFetchItems, useAddItem } = useCrud("downloads", apiKey);

  const fetchDownloadsQuery = useFetchItems(null, initialDownloads, { year, semester }, {
    enabled: !!year || !!semester
  });

  const addDownload = useAddItem();

  const onDrop = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !title || !year || !semester || !subject) {
      toast.error("Please fill all fields and select a file.");
      return;
    }
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/mock-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      const fileUrl = data.secure_url;

      await addDownload.mutateAsync({
        title,
        year,
        semester,
        subject,
        fileUrl,
      });

      await fetchDownloadsQuery.refetch();

      setTitle("");
      setYear("");
      setSemester("");
      setSubject("");
      setFile(null);
      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const filteredDownloads = useMemo(() => {
    return fetchDownloadsQuery.data?.downloads || initialDownloads;
  }, [fetchDownloadsQuery.data, initialDownloads]);

  const years = [...new Set(initialDownloads.map(d => d.year))].sort((a, b) => b - a);
  const semesters = [...new Set(initialDownloads.map(d => d.semester))].sort((a, b) => a - b);

  return (
    <div className="min-h-screen">
      <Header title="DOWNLOADS" subTitle="Download previous year question papers" />

      {role === "College Admin" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Question Paper
            </CardTitle>
            <CardDescription>
              Upload a new question paper for students to download.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="File Name / Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Subject Name" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Input type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
              <Input type="number" placeholder="Semester" value={semester} onChange={(e) => setSemester(e.target.value)} />
            </div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
                isDragActive ? "border-primary" : "border-border"
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <p>{file.name}</p>
              ) : (
                <p>Drag 'n' drop a PDF here, or click to select one</p>
              )}
            </div>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader className="mr-2 animate-spin" /> : <Upload className="mr-2" />}
              Upload
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Question Papers</CardTitle>
          <CardDescription>Filter and download question papers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Semester" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDownloads.length > 0 ? (
                filteredDownloads.map((download) => (
                  <TableRow key={download._id}>
                    <TableCell>{download.subject}</TableCell>
                    <TableCell>{download.year}</TableCell>
                    <TableCell>{download.semester}</TableCell>
                    <TableCell>
                      <a
                        href={download.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline">
                          <DownloadIcon className="mr-2" />
                          Download
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    {role === "College Admin"
                      ? "No question papers uploaded yet. Use the form above to upload one."
                      : "No question papers available at the moment. Please check back later."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Downloads;
