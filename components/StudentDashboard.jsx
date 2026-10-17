"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import { Calendar, Printer, BookOpen, Clock, Loader2, Wallet, IndianRupee, FileText, MessageSquare, User, Users, Eye, Plane, List, LayoutGrid, Search, Bell, Download, Trophy, Award, Camera, Newspaper, Megaphone, Edit2, CheckCircle, XCircle, AlertTriangle, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UpdateCard from "@/components/UpdateCard";
import ShareModal from "@/components/ShareModal";
import ProfileEditModal from "./ProfileEditModal";
import html2canvas from "html2canvas";
import { cn, formatDateForDisplay, formatMonthYear, formatDateShort, formatDate, copyToClipboard } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import TableComponent from "@/components/TableComponent";
import Barcode from "react-barcode";
import PrintHeader from "@/components/PrintHeader";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Button } from "./ui/button";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { saveAs } from "file-saver";





const formatDateWithoutDay = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ProfileField = ({ label, subLabel, value, isBold }) =>
  (value || value === 0 || (typeof value === 'string' && value.trim() !== '')) ? (
    <>
      <div className="flex flex-col py-1">
        <span className={`text-sm font-medium ${isBold ? 'font-bold' : 'text-muted-foreground'}`}>{label}</span>
        {subLabel && <span className="text-xs text-muted-foreground">{subLabel}</span>}
      </div>
      <div className="text-sm px-1 py-1">:</div>
      <div className={`text-sm ${isBold ? 'font-bold' : 'text-foreground'} min-w-0 break-words py-1`}>{value}</div>
    </>
  ) : null;

function DownloadsTabContent({ apiKey }) {
  React.useEffect(() => {
    console.log("DownloadsTabContent initialized with apiKey:", apiKey ? "Present" : "Missing");
  }, [apiKey]);

  const [activeSubTab, setActiveSubTab] = React.useState("PAPERS");


  // -- Question Papers --
  const [papers, setPapers] = React.useState([]);
  const [papersLoading, setPapersLoading] = React.useState(false);
  const [papersLoaded, setPapersLoaded] = React.useState(false);

  // -- Syllabus --
  const [syllabuses, setSyllabuses] = React.useState([]);
  const [syllabusLoading, setSyllabusLoading] = React.useState(false);
  const [syllabusLoaded, setSyllabusLoaded] = React.useState(false);

  // -- Books --
  const [books, setBooks] = React.useState([]);
  const [booksLoading, setBooksLoading] = React.useState(false);
  const [booksLoaded, setBooksLoaded] = React.useState(false);

  // Lazy-load each tab's data only when first opened
  React.useEffect(() => {
    if (activeSubTab === "PAPERS" && !papersLoaded && apiKey) {
      setPapersLoading(true);
      fetch("/api/downloads", { headers: { "api-key": apiKey } })
        .then(r => r.json())
        .then(d => { setPapers(d.downloads || []); setPapersLoaded(true); })
        .catch(e => console.error("Papers fetch error:", e))
        .finally(() => setPapersLoading(false));
    }
    if (activeSubTab === "SYLLABUS" && !syllabusLoaded && apiKey) {
      setSyllabusLoading(true);
      fetch("/api/syllabus", { headers: { "api-key": apiKey } })
        .then(r => r.json())
        .then(d => { setSyllabuses(d.syllabuses || []); setSyllabusLoaded(true); })
        .catch(e => console.error("Syllabus fetch error:", e))
        .finally(() => setSyllabusLoading(false));
    }
    if (activeSubTab === "BOOKS" && !booksLoaded && apiKey) {
      setBooksLoading(true);
      fetch("/api/books", { headers: { "api-key": apiKey } })
        .then(r => r.json())
        .then(d => { setBooks(d.books || []); setBooksLoaded(true); })
        .catch(e => console.error("Books fetch error:", e))
        .finally(() => setBooksLoading(false));
    }
  }, [activeSubTab, apiKey]);

  const [downloadingId, setDownloadingId] = React.useState(null);
  const [previewItem, setPreviewItem] = React.useState(null); // { url, title }

  const handleDownload = async (fileUrl, filename, downloadId) => {
    if (!fileUrl) return;
    setDownloadingId(downloadId);
    console.log("[Download] Starting:", filename);
    console.log("[Download] apiKey present:", !!apiKey);
    console.log("[Download] fileUrl:", fileUrl);
    try {
      let url = fileUrl;
      // Force PDF transformation only for Cloudinary images (avoiding raw files like .docx)
      if (url.includes("cloudinary.com") && url.includes("/image/upload/") && !url.toLowerCase().endsWith(".pdf")) {
        const parts = url.split("/upload/");
        if (parts.length === 2) {
          url = `${parts[0]}/upload/f_pdf/${parts[1].replace(/\.[^/.]+$/, ".pdf")}`;
        }
      }

      const proxyUrl = `/api/download-file?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      console.log("[Download] proxyUrl:", proxyUrl);

      const response = await fetch(proxyUrl, {
        headers: { "api-key": apiKey || "" }
      });

      console.log("[Download] response.status:", response.status);
      console.log("[Download] response.ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("[Download] Error status:", response.status);
        console.error("[Download] Error content-type:", response.headers.get("content-type"));
        console.error("[Download] Error body:", errorText.substring(0, 500));

        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // not JSON
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      console.log("[Download] Blob size:", blob.size, "type:", blob.type);
      saveAs(blob, filename);
      toast.success("Download started!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(error.message || "Failed to download file");
    } finally {

      setDownloadingId(null);
    }
  };


  const subTabs = [
    { id: "PAPERS", label: "Question Papers", icon: FileText, color: "text-teal-600 dark:text-teal-400", activeBg: "bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300" },
    { id: "SYLLABUS", label: "Syllabus", icon: BookOpen, color: "text-indigo-600 dark:text-indigo-400", activeBg: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" },
    { id: "BOOKS", label: "Books", icon: BookOpen, color: "text-amber-600 dark:text-amber-400", activeBg: "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300" },
  ];

  const EmptyState = ({ icon: Icon, color, label }) => (
    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
      <div className={`p-5 rounded-2xl mb-4 bg-muted/30`}>
        <Icon className={`h-10 w-10 opacity-40 ${color}`} />
      </div>
      <p className="text-sm font-semibold mb-1">No {label} Available</p>
      <p className="text-xs text-muted-foreground">Nothing has been uploaded yet.</p>
    </div>
  );

  const LoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* PDF Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="text-sm font-semibold truncate">{previewItem?.title || "Preview"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewItem?.url && (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewItem.url)}&embedded=true`}
                className="w-full h-full border-0"
                title={previewItem?.title || "Document Preview"}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Sub-tab Switcher */}
      <div className="flex gap-2 border-b pb-3 overflow-x-auto no-scrollbar">

        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                isActive
                  ? tab.activeBg
                  : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "" : tab.color}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Question Papers */}
      {activeSubTab === "PAPERS" && (
        papersLoading ? <LoadingState /> :
        !papers.length ? <EmptyState icon={FileText} color="text-teal-500" label="Question Papers" /> :
        <div className="rounded-md border overflow-hidden overflow-x-auto">
          <Table className="min-w-[500px]">

            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-3 text-xs font-bold uppercase w-[50px]">No</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Course</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Year</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Sem</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Subject</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {papers.map((d, idx) => (
                <TableRow key={d._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="py-2.5 text-sm">{d.course}</TableCell>
                  <TableCell className="py-2.5 text-sm">Year {d.year}</TableCell>
                  <TableCell className="py-2.5 text-sm">Sem {d.semester}</TableCell>
                  <TableCell className="py-2.5 text-sm font-semibold text-teal-700 dark:text-teal-300">{d.subject}</TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 h-8 w-8 p-0"
                        title="Preview"
                        onClick={() => setPreviewItem({ url: d.fileUrl, title: `${d.subject} — ${d.course} Year ${d.year} Sem ${d.semester}` })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20" 
                        onClick={() => handleDownload(d.fileUrl, `${d.subject}_${d.course}_Year${d.year}_Sem${d.semester}.pdf`.replace(/\s+/g, "_"), d._id)}
                        disabled={downloadingId === d._id}
                      >
                        {downloadingId === d._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
                        ) : (
                          <Download className="h-3.5 w-3.5 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">
                          {downloadingId === d._id ? "Wait..." : "Download"}
                        </span>
                      </Button>
                    </div>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Syllabus */}
      {activeSubTab === "SYLLABUS" && (
        syllabusLoading ? <LoadingState /> :
        !syllabuses.length ? <EmptyState icon={FileText} color="text-indigo-500" label="Syllabuses" /> :
        <div className="rounded-md border overflow-hidden overflow-x-auto">
          <Table className="min-w-[400px]">

            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-3 text-xs font-bold uppercase w-[50px]">No</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Course</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Year</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">File Name</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syllabuses.map((s, idx) => (
                <TableRow key={s._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="py-2.5 text-sm">{s.course}</TableCell>
                  <TableCell className="py-2.5 text-sm">{s.year}</TableCell>
                  <TableCell className="py-2.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300">{s.fileName || "Syllabus"}</TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 h-8 w-8 p-0"
                        title="Preview"
                        onClick={() => setPreviewItem({ url: s.fileUrl, title: `${s.fileName || 'Syllabus'} — ${s.course} Year ${s.year}` })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" 
                        onClick={() => handleDownload(s.fileUrl, `${s.course}_Year${s.year}_Syllabus.pdf`.replace(/\s+/g, "_"), s._id)}
                        disabled={downloadingId === s._id}
                      >
                        {downloadingId === s._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
                        ) : (
                          <Download className="h-3.5 w-3.5 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">
                          {downloadingId === s._id ? "Wait..." : "Download"}
                        </span>
                      </Button>
                    </div>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Books */}
      {activeSubTab === "BOOKS" && (
        booksLoading ? <LoadingState /> :
        !books.length ? <EmptyState icon={BookOpen} color="text-amber-500" label="Books" /> :
        <div className="rounded-md border overflow-hidden overflow-x-auto">
          <Table className="min-w-[380px]">

            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-3 text-xs font-bold uppercase w-[50px]">No</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Book Name</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Course</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((b, idx) => (
                <TableRow key={b._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-300">{b.name}</TableCell>
                  <TableCell className="py-2.5 text-sm">{b.course || "—"}</TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 h-8 w-8 p-0"
                        title="Preview"
                        onClick={() => setPreviewItem({ url: b.fileUrl, title: b.name })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                        onClick={() => handleDownload(b.fileUrl, `${b.name}.pdf`.replace(/\s+/g, "_"), b._id)}
                        disabled={downloadingId === b._id}
                      >
                        {downloadingId === b._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
                        ) : (
                          <Download className="h-3.5 w-3.5 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">
                          {downloadingId === b._id ? "Wait..." : "Download"}
                        </span>
                      </Button>
                    </div>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function AwardPoster({ award, currentUser, festSettings }) {
  const Icon = award.icon;
  const posterRef = React.useRef(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const orgLogo = festSettings?.org?.logo?.url;
  const instLogo = festSettings?.institution?.logo?.url;

  const colorMap = {
    amber: "from-amber-400 via-yellow-500 to-amber-600",
    emerald: "from-emerald-400 via-teal-500 to-emerald-600",
    yellow: "from-yellow-400 via-amber-500 to-yellow-600",
    gold: "from-yellow-300 via-amber-400 to-yellow-600",
    silver: "from-slate-300 via-slate-400 to-slate-500",
    bronze: "from-amber-600 via-orange-700 to-amber-800",
    indigo: "from-indigo-400 via-blue-500 to-indigo-600",
    rose: "from-rose-400 via-pink-500 to-rose-600",
  };
  
  const bgGradient = colorMap[award.color] || "from-zinc-400 to-zinc-600";

  const downloadAsJpeg = async () => {
    if (!posterRef.current) return;
    setIsExporting(true);
    try {
      // Small delay to ensure any hover states are cleared if needed
      await new Promise(r => setTimeout(r, 100));
      
      const canvas = await html2canvas(posterRef.current, {
        scale: 3, // High quality
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      
      const image = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement("a");
      link.href = image;
      link.download = `${award.type}_${award.period.replace(/\s+/g, "_")}.jpg`;
      link.click();
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        ref={posterRef}
        className="group relative flex flex-col items-center p-8 rounded-[2.5rem] border shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 w-full max-w-sm"
      >
        {/* Background Decorative Elements */}
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${bgGradient} opacity-10`} />
        
        {/* Logos for Best Reader */}
        {award.type === "BEST READER" && (
            <>
                {orgLogo && (
                    <div className="absolute top-6 left-6 w-10 h-10 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        <img src={orgLogo} alt="Org" className="w-full h-full object-contain" />
                    </div>
                )}
                {instLogo && (
                    <div className="absolute top-6 right-6 w-10 h-10 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        <img src={instLogo} alt="Inst" className="w-full h-full object-contain" />
                    </div>
                )}
            </>
        )}

        {/* Trophy/Icon at top right - Hidden if logos are present to avoid overlap */}
        {award.type !== "BEST READER" && Icon && (
            <Icon className="absolute top-6 right-6 h-10 w-10 text-zinc-200 dark:text-zinc-800 opacity-50 group-hover:opacity-100 transition-opacity" />
        )}
        
        {/* Profile Pic with rank border */}
        <div className="relative mb-8 z-10">
            <div className={`w-36 h-36 rounded-full p-1.5 bg-gradient-to-br ${bgGradient} shadow-xl`}>
                <div className="w-full h-full rounded-full border-[6px] border-white dark:border-zinc-900 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {currentUser?.profilePic?.url ? (
                        <img src={currentUser.profilePic.url} alt={currentUser.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-zinc-400">
                            {currentUser?.name?.charAt(0) || "S"}
                        </div>
                    )}
                </div>
            </div>
            {/* Badge */}
            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full text-xs font-black tracking-[0.2em] text-white shadow-xl uppercase bg-gradient-to-r ${bgGradient} border-2 border-white dark:border-zinc-900`}>
              {award.rankLabel || "Winner"}
            </div>
        </div>

        <div className="text-center space-y-3 pb-4">
            {award.type && !["ATTENDANCE TOPPER", "BEST READER", "STAR OF THE MONTH"].includes(award.type) && (
                <h4 className={`text-[10px] font-black tracking-[0.3em] uppercase opacity-70 ${
                  award.color === 'amber' ? 'text-amber-600' :
                  award.color === 'emerald' ? 'text-emerald-600' :
                  award.color === 'gold' ? 'text-yellow-600' :
                  award.color === 'silver' ? 'text-slate-500' :
                  award.color === 'bronze' ? 'text-amber-700' :
                  award.color === 'indigo' ? 'text-indigo-600' :
                  'text-yellow-600'
                }`}>
                    {award.type}
                </h4>
            )}
            <h3 className="text-3xl font-black tracking-tight leading-tight text-zinc-900 dark:text-white whitespace-pre-line">
                {award.title?.includes("of the Month") ? (
                  <>
                    {award.title.replace("of the Month", "").trim()}
                    <span className="block text-xl opacity-80 mt-1">of the Month</span>
                  </>
                ) : (award.title || "Achievement")}
            </h3>
            {award.subtitle && (
                <p className="text-base font-bold text-zinc-500 dark:text-zinc-400">{award.subtitle}</p>
            )}
            {award.extraInfo && (
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{award.extraInfo}</p>
            )}
            <div className="pt-6 flex flex-col items-center">
                <div className={`px-6 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm font-black tracking-widest uppercase ${
                  award.color === 'amber' ? 'text-amber-700' :
                  award.color === 'emerald' ? 'text-emerald-700' :
                  award.color === 'gold' ? 'text-yellow-700' :
                  award.color === 'silver' ? 'text-slate-600' :
                  award.color === 'bronze' ? 'text-amber-800' :
                  award.color === 'indigo' ? 'text-indigo-700' :
                  'text-yellow-700'
                }`}>
                    {award.period}
                </div>
            </div>
        </div>
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full flex justify-center opacity-40">
           <span className="text-[10px] font-black tracking-[0.4em] uppercase text-zinc-400">Congratulations...</span>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={downloadAsJpeg} 
        disabled={isExporting}
        className="rounded-full gap-2 text-xs font-bold tracking-widest uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
        Download JPEG
      </Button>
    </div>
  );
}

function AwardsTabContent({ currentUser, apiKey }) {
  const [awards, setAwards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [festSettings, setFestSettings] = React.useState(null);

  React.useEffect(() => {
    const fetchAwards = async () => {
      setLoading(true);
      
      try {
        // Fetch Settings first for branding
        let currentFestSettings = null;
        try {
            const settingsRes = await fetch("/api/settings", { cache: "no-store", headers: { "api-key": apiKey } });
            const settingsData = await settingsRes.json();
            if (settingsData.success || settingsData.settings) {
                currentFestSettings = settingsData.settings;
            }
        } catch (err) {
            console.error("Settings fetch error:", err);
        }

        const res = await fetch(`/api/student-awards?studentId=${currentUser._id}&studentName=${encodeURIComponent(currentUser.name || "")}`, { cache: "no-store", headers: { "api-key": apiKey } });
        const data = await res.json();
        
        if (data.success && data.awards) {
           const { BookOpen, Calendar, Trophy, Award } = require("lucide-react");
           const iconMap = { BookOpen, Calendar, Trophy, Award };
           
           const festName = currentFestSettings?.festival?.festivalInfo?.name || "STUDENTS FEST";
           const festYear = currentFestSettings?.festival?.festivalInfo?.year || "";
           
           const processedAwards = data.awards.map(aw => {
               const award = { ...aw, icon: iconMap[aw.iconName] || Trophy, date: new Date(aw.date) };
               if (aw.isFestWinner) {
                   award.type = `${festName} ${festYear}`.trim().toUpperCase();
               }
               return award;
           });
           setAwards(processedAwards);
        }
        setFestSettings(currentFestSettings);
      } catch (e) {
        console.error("Awards fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?._id && apiKey) fetchAwards();
  }, [currentUser?._id, apiKey]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500 mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">Analyzing your achievements...</p>
    </div>
  );

  if (!awards.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="p-6 rounded-3xl bg-yellow-50 dark:bg-yellow-900/10 mb-6 transform transition-transform hover:scale-110 duration-500">
        <Trophy className="h-16 w-16 text-yellow-500/40" />
      </div>
      <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">No Awards Yet</h3>
      <p className="text-sm max-w-xs text-center opacity-70">Keep up the great work! Your achievements will shine here once you top the charts.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
      {awards.map((award, idx) => (
        <AwardPoster key={idx} award={award} currentUser={currentUser} festSettings={festSettings} />
      ))}
    </div>
  );
}

// Normalize common category misspellings
const normalizeCategoryName = (name) => {
    if (!name) return name;
    const upper = name.toUpperCase().trim();
    const corrections = {
        "TRAVELOUGUE": "TRAVELOGUE",
        "TRAVELOUGE": "TRAVELOGUE",
        "TRAVLOGUE": "TRAVELOGUE",
        "TRAVELOG": "TRAVELOGUE",
    };
    return corrections[upper] ?? upper;
};

export default function StudentDashboard({
  user,
  apiKey,
  classes,
  batches,
  attendanceData: initialData,
  updates = [],
  hideHeader = false,
  showKinship = false,
  debtBalances = [],
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(user);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sharedArticle, setSharedArticle] = useState(null);
  const detailsRef = useRef(null);
  const historyRef = useRef(null);
  const chartRef = useRef(null);

  const downloadCardAsJpeg = async (elementRef, filename) => {
    if (!elementRef.current) return;
    try {
      toast.info("Preparing download...");
      const canvas = await html2canvas(elementRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const image = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement("a");
      link.href = image;
      link.download = filename;
      link.click();
      toast.success("Download complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download");
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Add a slight delay to ensure the content is rendered before scrolling
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const { useFetchItems } = useCrud("studentAttendances", apiKey);
  const { data: fetchedData, isLoading, error } = useFetchItems(
    0,
    0,
    {
      studentId: currentUser?._id,
    },
    { enabled: !initialData }
  );

  const attendanceData = initialData || fetchedData;
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [pendingFunds, setPendingFunds] = useState([]); // Array of fund objects
  const [fundsLoading, setFundsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PROFILE");
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [rentalsLoading, setRentalsLoading] = useState(true);
  const [marks, setMarks] = useState([]);
  const [marksLoading, setMarksLoading] = useState(true);
  const [remarksList, setRemarksList] = useState([]);
  const [remarksLoading, setRemarksLoading] = useState(true);
  const [performanceList, setPerformanceList] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [activeRemarksSubTab, setActiveRemarksSubTab] = useState("REMARKS");
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [couponDetails, setCouponDetails] = useState([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [selectedStandardFund, setSelectedStandardFund] = useState(null);
  const [isStandardModalOpen, setIsStandardModalOpen] = useState(false);
  const [leavesList, setLeavesList] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const isActiveStudent = currentUser?.studentSpecificField?.status === "Active";
  const [librarySubTab, setLibrarySubTab] = useState(isActiveStudent ? "BOOKS" : "HISTORY");
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [libraryBooksLoading, setLibraryBooksLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);


  const className = classes.find(
    (c) => c._id === currentUser?.studentSpecificField?.classId
  )?.name;

  const admissionClassName = classes.find(
    (c) => c._id === currentUser?.studentSpecificField?.admissionClassId
  )?.name;

  const batchName = batches.find(
    (b) => b._id === currentUser?.studentSpecificField?.batchId
  )?.name;

  const renderCourseDisplay = (coursesList) => {
    if (!Array.isArray(coursesList)) return null;
    let target = coursesList.filter(
      (c) =>
        c &&
        (!c.status || String(c.status).trim().toLowerCase() === "ongoing") &&
        c.courseName?.trim()
    );
    if (target.length === 0) {
      target = coursesList.filter((c) => c && c.courseName?.trim());
    }
    if (target.length === 0) return null;

    return (
      <div className="flex flex-col gap-2">
        {target.map((c, idx) => {
          const status = c.status || "Ongoing";
          const yearStr = c.year
            ? String(c.year).toLowerCase().startsWith("year")
              ? String(c.year).trim()
              : `Year ${String(c.year).trim()}`
            : null;
          const subInfo = [yearStr, c.universityBoard?.trim() || null]
            .filter(Boolean)
            .join(" • ");

          return (
            <div key={idx} className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-foreground text-sm">
                  {c.courseName}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border leading-none inline-flex items-center",
                    status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : status === "Pending"
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                      : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                  )}
                >
                  {status}
                </span>
              </div>
              {subInfo && (
                <div className="text-xs text-muted-foreground mt-0.5 font-normal leading-tight">
                  {subInfo}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const ongoingIslamicCoursesDisplay = useMemo(() => {
    const list =
      currentUser?.studentSpecificField?.islamicCourses ||
      currentUser?.islamicCourses ||
      [];
    return renderCourseDisplay(list);
  }, [currentUser]);

  const ongoingAcademicCoursesDisplay = useMemo(() => {
    const list =
      currentUser?.studentSpecificField?.academicCourses ||
      currentUser?.academicCourses ||
      [];
    return renderCourseDisplay(list);
  }, [currentUser]);

  useEffect(() => {
    const fetchFunds = async () => {
      setFundsLoading(true);
      const fundsList = [];

      try {
        // 1. Fetch All Student Funds (Department + Individual)
        // Removed batchId to fetch all history for aggregation
        const allFundsPromise = fetch(`/api/studentsFund?studentId=${currentUser._id}&getAll=true`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        }).then(res => res.ok ? res.json() : { studentFunds: [] });

        // 2. Fetch Coupon Fund (Search by Student ID)
        const couponPromise = fetch(`/api/student-coupons?search=${currentUser._id}`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        }).then(res => res.ok ? res.json() : { stats: { totalPending: 0 } });

        const [fundsResult, couponResult] = await Promise.all([
          allFundsPromise,
          couponPromise
        ]);

        // Process Standard Funds with Aggregation
        const fundsMap = new Map();

        (fundsResult.studentFunds || []).forEach(fund => {

          let label = "Students Fund";
          let subLabel = "";
          
          if (fund.fundType === 'Department') {
            label = `${fund.department} Fund`;
            // For Department funds, the "Role Holder" is the one who added/performed the transaction
            const lastTransaction = fund.transactions?.[fund.transactions.length - 1];
            subLabel = lastTransaction?.performedBy?.name || fund.department;
          } else {
            const roles = fund.teacherId?.roles || [];
            subLabel = fund.teacherId?.name || "Class Teacher";
            
            if (roles.includes("Teacher")) {
              label = "Students Fund";
            } else if (roles.length > 0) {
              label = "Staff Fund";
            }
          }

          const key = `Fund-${label}-${subLabel}`;
          const currentBatch = batches.find(b => b._id === fund.batchId)?.name || "Unknown Batch";
          
          if (fundsMap.has(key)) {
            const entry = fundsMap.get(key);
            entry.value += fund.balance; // Use balance as-is (database stores debt as negative)
            entry.records.push({
              year: currentBatch,
              holder: subLabel,
              value: fund.balance
            });
            // Support history: aggregate all transactions from these records
            entry.allTransactions = [...(entry.allTransactions || []), ...(fund.transactions || [])];
          } else {
            fundsMap.set(key, {
              label: label,
              subLabel: fund.fundType === 'Department' ? "" : subLabel,
              value: fund.balance, // Use balance as-is (database stores debt as negative)
              isInteractive: true,
              records: [{
                year: currentBatch,
                holder: subLabel,
                value: fund.balance
              }],
              allTransactions: fund.transactions || []
            });
          }
        });

        // Convert map values to list and calculate running balances
        fundsMap.forEach(item => {
          if (item.allTransactions && item.allTransactions.length > 0) {
            // Sort oldest first for balance calculation
            const sorted = [...item.allTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
            let running = 0;
            sorted.forEach(t => {
              if (t.type === 'Withdrawal') {
                running -= t.amount;
              } else {
                running += t.amount;
              }
              t.calculatedBalance = running;
            });
            // Keep the sorted for display (though UI will sort descending)
            item.allTransactions = sorted;
          }
          fundsList.push(item);
        });

        // Process Coupon Fund
        const rawCoupons = couponResult.coupons || [];
        setCouponDetails(rawCoupons);
        
        const couponPendingTotal = (couponResult.stats?.totalPending || 0);
        
        if (couponPendingTotal > 0) {
          fundsList.push({
            label: "Coupon Fund",
            value: -couponPendingTotal, // Negate to show as debt
            isCoupon: true
          });
        }

        setPendingFunds(fundsList);
      } catch (error) {
        console.error("Error fetching pending funds:", error);
        setPendingFunds([]);
      } finally {
        setFundsLoading(false);
      }
    };

    if (currentUser?._id && apiKey) {
      fetchFunds();
    } else {
      setFundsLoading(false);
    }
  }, [currentUser, classes, apiKey]);

  useEffect(() => {
    const fetchRentals = async () => {
      if (!currentUser?._id || !apiKey) return;
      setRentalsLoading(true);
      try {
        const res = await fetch(`/api/rental?studentId=${currentUser._id}`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.success) {
          setRentalHistory(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching rental history:", error);
      } finally {
        setRentalsLoading(false);
      }
    };
    fetchRentals();
  }, [currentUser, apiKey]);

  useEffect(() => {
    const fetchMarks = async () => {
      if (!currentUser?._id || !apiKey) return;
      setMarksLoading(true);
      try {
        const res = await fetch(`/api/marks?studentId=${currentUser._id}`, {
          cache: "no-store",
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.success) {
          setMarks(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching marks:", error);
      } finally {
        setMarksLoading(false);
      }
    };
    fetchMarks();
  }, [currentUser, apiKey]);

  useEffect(() => {
    const fetchRemarksAndPerformance = async () => {
      if (!currentUser?._id || !apiKey) return;
      setRemarksLoading(true);
      setPerformanceLoading(true);
      try {
        const [remarksRes, perfRes] = await Promise.all([
          fetch(`/api/remarks?studentId=${currentUser._id}`, {
            cache: "no-store",
            headers: { "Content-Type": "application/json", "api-key": apiKey }
          }),
          fetch(`/api/performance?studentId=${currentUser._id}&limit=1000`, {
            cache: "no-store",
            headers: { "Content-Type": "application/json", "api-key": apiKey }
          })
        ]);
        const result = await remarksRes.json();
        const perfResult = await perfRes.json();
        if (result.remarks) {
          setRemarksList(result.remarks || []);
        }
        if (perfResult.performance) {
          setPerformanceList(perfResult.performance || []);
        }
      } catch (error) {
        console.error("Error fetching remarks/performance:", error);
      } finally {
        setRemarksLoading(false);
        setPerformanceLoading(false);
      }
    };
    fetchRemarksAndPerformance();
  }, [currentUser, apiKey]);

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!currentUser?._id || !apiKey) return;
      setLeavesLoading(true);
      try {
        const res = await fetch(`/api/leave-records?studentId=${currentUser._id}&limit=1000`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result["leave-records"]) {
          setLeavesList(result["leave-records"] || []);
        }
      } catch (error) {
        console.error("Error fetching leave records:", error);
      } finally {
        setLeavesLoading(false);
      }
    };
    fetchLeaves();
  }, [currentUser, apiKey]);

  useEffect(() => {
    const fetchLibraryBooks = async (showLoading = true) => {
      if (!apiKey || !isActiveStudent) return;
      if (showLoading) setLibraryBooksLoading(true);
      try {
        const res = await fetch("/api/library/books", {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.success) {
          setLibraryBooks(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching library books:", error);
      } finally {
        if (showLoading) setLibraryBooksLoading(false);
      }
    };
    fetchLibraryBooks(true);
    const interval = setInterval(() => fetchLibraryBooks(false), 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [apiKey, isActiveStudent]);

  useEffect(() => {
    if (!isActiveStudent && librarySubTab === "BOOKS") {
      setLibrarySubTab("HISTORY");
    }
  }, [isActiveStudent, librarySubTab]);

  const fetchPendingRequests = async () => {
    if (!apiKey || !currentUser._id) return;
    try {
      const res = await fetch(`/api/library/requests?studentId=${currentUser._id}&status=Pending`, {
        headers: { "Content-Type": "application/json", "api-key": apiKey }
      });
      const result = await res.json();
      if (result.success) {
        setPendingRequests(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [apiKey, currentUser._id]);

  // Lazy-load articles only when ARTICLES tab is first opened
  useEffect(() => {
    if (activeTab !== "ARTICLES" || articlesLoaded || !apiKey) return;
    setArticlesLoading(true);
    fetch("/api/articles", { headers: { "api-key": apiKey } })
      .then(r => r.json())
      .then(d => { setArticles(d.articles || []); setArticlesLoaded(true); })
      .catch(e => console.error("Articles fetch error:", e))
      .finally(() => setArticlesLoading(false));
  }, [activeTab, articlesLoaded, apiKey]);

  const handleRequestBook = async (book) => {
    if (book.status !== "Available") {
      toast.error("This book is not available for request");
      return;
    }
    if (!confirm(`Are you sure you want to request "${book.name}"?`)) return;

    try {
      const res = await fetch("/api/library/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({ bookId: book._id, studentId: currentUser._id })
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Request submitted successfully");
        fetchPendingRequests();
      } else {
        toast.error(result.msg || "Failed to submit request");
      }
    } catch (error) {
      console.error("Error requesting book:", error);
      toast.error("An error occurred while requesting the book");
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;

    try {
      const res = await fetch(`/api/library/requests?id=${requestId}`, {
        method: "DELETE",
        headers: { "api-key": apiKey }
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Request cancelled successfully");
        fetchPendingRequests();
      } else {
        toast.error(result.msg || "Failed to cancel request");
      }
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("An error occurred while cancelling the request");
    }
  };

  const attendanceHistory = useMemo(() => {
    // Robust extraction of attendance records
    let records = [];
    if (attendanceData) {
      // The API often returns { studentAttendances: [...] } or just [...]
      const dataToProcess = attendanceData.studentAttendances || attendanceData;

      if (Array.isArray(dataToProcess)) {
        // Handle array of student attendance documents
        records = dataToProcess.flatMap(d => d.attendanceRecords || []);
      } else if (dataToProcess.attendanceRecords) {
        // Handle single student attendance document
        records = dataToProcess.attendanceRecords;
      } else if (Array.isArray(dataToProcess.records)) {
        // Handle direct records array
        records = dataToProcess.records;
      }
    }

    // FIXED: Calculate across ALL available years in attendance records, not just selectedYear
    const allYearsInRecords = new Set();
    records.forEach(r => allYearsInRecords.add(new Date(r.date).getFullYear()));

    // Sort years and handle empty case
    const sortedYears = Array.from(allYearsInRecords).sort((a, b) => a - b);
    if (sortedYears.length === 0) sortedYears.push(new Date().getFullYear());

    const history = [];

    // Create entries for each year's months that have data
    sortedYears.forEach(year => {
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const recordsForMonth = records.filter((r) => {
          const d = new Date(r.date);
          return d.getFullYear() === year && d.getMonth() === monthIndex;
        });

        if (recordsForMonth.length > 0) {
          const monthName = new Date(year, monthIndex, 1).toLocaleString("en-US", { month: "long" });
          const totalPeriods = recordsForMonth.length;
          const presentPeriods = recordsForMonth.filter((r) => r.present).length;

          const details = recordsForMonth.map((r, rIdx) => ({
            id: r._id || `${r.date}-${rIdx}-${r.periodNumber}`,
            date: formatDateForDisplay(r.date),
            present: r.present,
            subject: r.subjectName || "N/A",
            teacher: r.teacherName || "N/A",
          }));

          history.push({
            year,
            month: monthName,
            monthYear: `${monthName} ${year}`,
            totalPeriods,
            presentPeriods,
            details,
            percentage: ((presentPeriods / totalPeriods) * 100).toFixed(2),
          });
        }
      }
    });

    return history;
  }, [attendanceData]);

  const academicYears = useMemo(() => {
    const yearsFromRecords = new Set();
    attendanceHistory.forEach(h => yearsFromRecords.add(h.year));

    let yearsFromBatch = [];
    if (batchName) {
      const match = batchName.match(/\d{4}/g);
      if (match) {
        const startYear = parseInt(match[0], 10);
        const endYear = match[1] ? parseInt(match[1], 10) : startYear + 1;
        for (let year = startYear; year <= endYear; year++) {
          yearsFromBatch.push(year);
        }
      }
    }

    const allYears = new Set([...yearsFromRecords, ...yearsFromBatch]);
    if (allYears.size === 0) allYears.add(new Date().getFullYear());

    return Array.from(allYears).sort((a, b) => b - a); // Sort descending (newest first)
  }, [batchName, attendanceHistory]);

  useEffect(() => {
    if (academicYears.length > 0 && !academicYears.includes(selectedYear)) {
      setSelectedYear(academicYears[0]);
    }
  }, [academicYears, selectedYear]);

  // For the chart and history card, filter by selectedYear if needed
  const filteredAttendanceHistory = useMemo(() => {
    return attendanceHistory.filter(h => h.year === selectedYear);
  }, [attendanceHistory, selectedYear]);

  const currentDate = formatDateForDisplay(new Date());

  const getStatusClass = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "Dropped Out":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "Graduated":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const displayFunds = useMemo(() => {
    const list = [...(pendingFunds || [])];
    (debtBalances || []).forEach(d => {
      list.push({
        label: d.category,
        subLabel: d.year,
        value: -d.balance, // Show as negative for debt
        isDebt: true
      });
    });
    return list.filter(item => item.value !== 0);
  }, [pendingFunds, debtBalances]);

  const totalPending = useMemo(() => {
    return displayFunds.reduce((acc, item) => acc + (item.value || 0), 0);
  }, [displayFunds]);

  const getStatusBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "advanced": return { backgroundColor: "#047857", color: "white" }; // emerald-700
      case "very good": return { backgroundColor: "#15803d", color: "white" }; // green-700
      case "good": return { backgroundColor: "#22c55e", color: "white" }; // green-500
      case "acceptable": return { backgroundColor: "#eab308", color: "white" }; // yellow-500
      case "unsatisfied": return { backgroundColor: "#f97316", color: "white" }; // orange-500
      case "poor": return { backgroundColor: "#ef4444", color: "white" }; // red-500
      case "bad": return { backgroundColor: "#b91c1c", color: "white" }; // red-700
      case "very bad": return { backgroundColor: "#7f1d1d", color: "white" }; // red-900
      case "pending": return { backgroundColor: "#64748b", color: "white" }; // slate-500
      default: return { backgroundColor: "#f3f4f6", color: "#1f2937", border: "1px solid #e5e7eb" }; // gray-100
    }
  };


  return (
    <>
      <style>{`
        @media print {
          /* Force exact colors and backgrounds */
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            box-shadow: none !important;
          }
          
          /* Reset root and body layout */
          @page { margin: 1cm !important; size: auto; }
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
            width: 100% !important;
          }

          /* Nuke all potentially hidden spacing at the top */
          .no-print, [class*="no-print"] { 
            display: none !important; 
            height: 0 !important; 
            width: 0 !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            position: absolute !important;
            pointer-events: none !important;
          }

          /* Force all containers to be visible and expanded */
          [class*="overflow-"], 
          [class*="max-h-"],
          [class*="min-h-"] {
            overflow: visible !important;
            max-height: none !important;
            min-height: 0 !important;
            height: auto !important;
          }

          /* Specific resets for layout wrappers */
          .SidebarProvider, 
          [class*="sidebar-wrapper"], 
          [class*="h-screen"],
          [class*="min-h-svh"],
          main, 
          header,
          section { 
            display: block !important; 
            height: auto !important; 
            min-height: 0 !important; 
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Disable all animations and transitions in print */
          *, *::before, *::after {
            animation-delay: 0s !important;
            animation-duration: 0s !important;
            animation-iteration-count: 1 !important;
            transition-delay: 0s !important;
            transition-duration: 0s !important;
          }

          /* Reset space-y and margins on the main container children */
          .space-y-6, .space-y-4 { gap: 0 !important; }
          .space-y-6 > *, .mt-6, .pt-5, .p-4, .p-8 { 
            margin-top: 0 !important; 
            padding-top: 0 !important; 
          }
          
          /* Prevent cards from breaking across pages */
          .card-print-break { 
            break-inside: avoid !important; 
            page-break-inside: avoid !important; 
            margin-bottom: 2rem !important; 
            display: block !important;
            border: 1px solid #e2e8f0 !important;
          }

          /* Professional Table Styling for Print */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 1rem !important;
            table-layout: auto !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px 12px !important;
            text-align: left !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
          }
          th {
            background-color: #f8fafc !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            color: #1e293b !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          
          /* Specific column tweaks */
          .w-[60px] { width: 50px !important; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }

          /* Layout specific for reports */
          .print-grid-2 { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            gap: 1.5rem !important; 
          }
          .print-stack-vertical { 
            display: block !important; 
            width: 100% !important;
          }
          .print-stack-vertical > * {
            width: 100% !important;
            margin-bottom: 2rem !important;
          }
          
          .print-flex-row { 
            display: flex !important; 
            flex-direction: row !important; 
            align-items: center !important; 
            gap: 2rem !important; 
          }
          .print-exam-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 1.5rem !important;
            display: block !important;
          }
        }
      `}</style>

      <div className="space-y-6 max-w-7xl mx-auto">
        <PrintHeader title="STUDENT PROFILE" apiKey={apiKey} displayOnScreen={false} />

      {/* Premium Header */}
      <div className="no-print relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-950 p-8 text-white shadow-xl mb-6">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left w-full md:w-auto">
            {/* Mobile Header: Photo and Card side by side */}
            <div className="flex flex-row items-center justify-between w-full md:w-auto gap-4">
              <Avatar className="h-24 w-24 rounded-2xl border-4 border-white/20 shadow-2xl ring-4 ring-blue-500/20">
                <AvatarImage src={currentUser?.profilePic?.url} alt={currentUser?.name} className="object-cover" />
                <AvatarFallback className="bg-white/10 text-2xl font-bold backdrop-blur-md">
                  {currentUser?.name?.[0]}
                </AvatarFallback>
              </Avatar>
              
              {/* Status Badge for Mobile View */}
              <div className="md:hidden flex flex-col items-end gap-2">
                {currentUser?.studentSpecificField?.status && (
                  <div className={cn(
                    "px-3 py-1.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center gap-1.5",
                    currentUser.studentSpecificField.status === "Active" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                    currentUser.studentSpecificField.status === "Dropped Out" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                    currentUser.studentSpecificField.status === "Graduated" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                    "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      currentUser.studentSpecificField.status === "Active" ? "bg-green-400 animate-pulse" :
                      currentUser.studentSpecificField.status === "Dropped Out" ? "bg-red-400" :
                      currentUser.studentSpecificField.status === "Graduated" ? "bg-blue-400" :
                      "bg-slate-400"
                    )} />
                    {currentUser.studentSpecificField.status}
                  </div>
                )}
                {!hideHeader && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2 h-8 px-4 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div>
              <p className="text-blue-200 text-sm font-medium tracking-wider uppercase mb-1">Welcome,</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 drop-shadow-md">
                {currentUser?.name}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-blue-100/80">
                <span className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border border-white/10 uppercase">
                  {currentUser?._id}
                </span>
                {currentUser?.studentSpecificField?.status === "Active" ? (
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    {className || "No Class"} | {batchName || "No Batch"}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {batchName || "No Batch"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge for Desktop View */}
          <div className="hidden md:flex flex-col items-end gap-2 min-w-[140px]">
            {currentUser?.studentSpecificField?.status && (
              <div className={cn(
                "w-full px-4 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105",
                currentUser.studentSpecificField.status === "Active" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                currentUser.studentSpecificField.status === "Dropped Out" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                currentUser.studentSpecificField.status === "Graduated" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                "bg-slate-500/20 text-slate-400 border-slate-500/30"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  currentUser.studentSpecificField.status === "Active" ? "bg-green-400 animate-pulse ring-2 ring-green-400/20" :
                  currentUser.studentSpecificField.status === "Dropped Out" ? "bg-red-400 ring-2 ring-red-400/20" :
                  currentUser.studentSpecificField.status === "Graduated" ? "bg-blue-400 ring-2 ring-blue-400/20" :
                  "bg-slate-400"
                )} />
                {currentUser.studentSpecificField.status}
              </div>
            )}
            {!hideHeader && (
              <div className="flex flex-col items-end gap-2 w-full">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2 h-8 px-4 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
                {currentUser?.profileUpdateStatus === "Pending" && (
                  <div className="flex flex-col items-center w-full px-4 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider backdrop-blur-md bg-blue-500/10 text-blue-300 border-blue-500/20 animate-pulse">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Requested
                    </div>
                    {currentUser.profileRequestDate && (
                      <span className="text-[10px] text-blue-300/60 font-medium mt-0.5">{formatDateShort(currentUser.profileRequestDate)}</span>
                    )}
                  </div>
                )}
                {currentUser?.profileUpdateStatus === "Verified" && (
                  <div className="flex flex-col items-center w-full px-4 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider backdrop-blur-md bg-green-500/10 text-green-300 border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </div>
                    {currentUser.profileActionDate && (
                      <span className="text-[10px] text-green-300/60 font-medium mt-0.5">{formatDateShort(currentUser.profileActionDate)}</span>
                    )}
                  </div>
                )}
                {currentUser?.profileUpdateStatus === "Rejected" && (
                  <div className="flex flex-col items-center w-full px-4 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider backdrop-blur-md bg-red-500/10 text-red-300 border-red-500/20">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3" />
                      Rejected
                    </div>
                    {currentUser.profileActionDate && (
                      <span className="text-[10px] text-red-300/60 font-medium mt-0.5">{formatDateShort(currentUser.profileActionDate)}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
      </div>

      {/* Navigation Cards Grid */}
      <div className="no-print grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { id: "PROFILE", label: "Profile", icon: User, color: "blue" },
          { id: "ATTENDANCE", label: "Attendance", icon: Calendar, color: "rose" },
          { id: "FINANCE", label: "Finance", icon: IndianRupee, color: "emerald" },
          { id: "LIBRARY", label: "Library", icon: BookOpen, color: "amber" },
          { id: "MARKS", label: "Marks", icon: FileText, color: "indigo" },
          { id: "NOTIFICATIONS", label: "Notifications", icon: Bell, color: "cyan" },
          { id: "DOWNLOADS", label: "Downloads", icon: Download, color: "teal" },
          { id: "LEAVES", label: "Leaves", icon: Plane, color: "violet" },
          { id: "REMARKS", label: "Remarks", icon: MessageSquare, color: "orange" },
          { id: "AWARDS", label: "Awards", icon: Trophy, color: "yellow" },
          { id: "ARTICLES", label: "Articles", icon: Newspaper, color: "purple" },
          { id: "UPDATES", label: "Updates", icon: Megaphone, color: "pink" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          // Color mapping for all navigation items
          const colorStyles = {
            blue: { activeBorder: "border-blue-500", activeBg: "bg-blue-50/50 dark:bg-blue-900/10", iconActiveBg: "bg-blue-500", iconInactiveBg: "bg-blue-100 dark:bg-blue-900/20", iconInactiveText: "text-blue-600", labelActive: "text-blue-700 dark:text-blue-300", bottomBar: "bg-blue-500" },
            emerald: { activeBorder: "border-emerald-500", activeBg: "bg-emerald-50/50 dark:bg-emerald-900/10", iconActiveBg: "bg-emerald-500", iconInactiveBg: "bg-emerald-100 dark:bg-emerald-900/20", iconInactiveText: "text-emerald-600", labelActive: "text-emerald-700 dark:text-emerald-300", bottomBar: "bg-emerald-500" },
            amber: { activeBorder: "border-amber-500", activeBg: "bg-amber-50/50 dark:bg-amber-900/10", iconActiveBg: "bg-amber-500", iconInactiveBg: "bg-amber-100 dark:bg-amber-900/20", iconInactiveText: "text-amber-600", labelActive: "text-amber-700 dark:text-amber-300", bottomBar: "bg-amber-500" },
            rose: { activeBorder: "border-rose-500", activeBg: "bg-rose-50/50 dark:bg-rose-900/10", iconActiveBg: "bg-rose-500", iconInactiveBg: "bg-rose-100 dark:bg-rose-900/20", iconInactiveText: "text-rose-600", labelActive: "text-rose-700 dark:text-rose-300", bottomBar: "bg-rose-500" },
            indigo: { activeBorder: "border-indigo-500", activeBg: "bg-indigo-50/50 dark:bg-indigo-900/10", iconActiveBg: "bg-indigo-500", iconInactiveBg: "bg-indigo-100 dark:bg-indigo-900/20", iconInactiveText: "text-indigo-600", labelActive: "text-indigo-700 dark:text-indigo-300", bottomBar: "bg-indigo-500" },
            orange: { activeBorder: "border-orange-500", activeBg: "bg-orange-50/50 dark:bg-orange-900/10", iconActiveBg: "bg-orange-500", iconInactiveBg: "bg-orange-100 dark:bg-orange-900/20", iconInactiveText: "text-orange-600", labelActive: "text-orange-700 dark:text-orange-300", bottomBar: "bg-orange-500" },
            violet: { activeBorder: "border-violet-500", activeBg: "bg-violet-50/50 dark:bg-violet-900/10", iconActiveBg: "bg-violet-500", iconInactiveBg: "bg-violet-100 dark:bg-violet-900/20", iconInactiveText: "text-violet-600", labelActive: "text-violet-700 dark:text-violet-300", bottomBar: "bg-violet-500" },
            cyan: { activeBorder: "border-cyan-500", activeBg: "bg-cyan-50/50 dark:bg-cyan-900/10", iconActiveBg: "bg-cyan-500", iconInactiveBg: "bg-cyan-100 dark:bg-cyan-900/20", iconInactiveText: "text-cyan-600", labelActive: "text-cyan-700 dark:text-cyan-300", bottomBar: "bg-cyan-500" },
            teal: { activeBorder: "border-teal-500", activeBg: "bg-teal-50/50 dark:bg-teal-900/10", iconActiveBg: "bg-teal-500", iconInactiveBg: "bg-teal-100 dark:bg-teal-900/20", iconInactiveText: "text-teal-600", labelActive: "text-teal-700 dark:text-teal-300", bottomBar: "bg-teal-500" },
            yellow: { activeBorder: "border-yellow-500", activeBg: "bg-yellow-50/50 dark:bg-yellow-900/10", iconActiveBg: "bg-yellow-500", iconInactiveBg: "bg-yellow-100 dark:bg-yellow-900/20", iconInactiveText: "text-yellow-600", labelActive: "text-yellow-700 dark:text-yellow-300", bottomBar: "bg-yellow-500" },
            purple: { activeBorder: "border-purple-500", activeBg: "bg-purple-50/50 dark:bg-purple-900/10", iconActiveBg: "bg-purple-500", iconInactiveBg: "bg-purple-100 dark:bg-purple-900/20", iconInactiveText: "text-purple-600", labelActive: "text-purple-700 dark:text-purple-300", bottomBar: "bg-purple-500" },

            pink: { activeBorder: "border-pink-500", activeBg: "bg-pink-50/50 dark:bg-pink-900/10", iconActiveBg: "bg-pink-500", iconInactiveBg: "bg-pink-100 dark:bg-pink-900/20", iconInactiveText: "text-pink-600", labelActive: "text-pink-700 dark:text-pink-300", bottomBar: "bg-pink-500" },
          };

          const s = colorStyles[item.color];

          return (
            <Card 
              key={item.id}
              className={`cursor-pointer transition-all duration-300 border-2 hover:shadow-lg group relative overflow-hidden ${
                isActive 
                  ? `${s.activeBorder} ${s.activeBg}` 
                  : "border-transparent bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-800"
              }`}
              onClick={() => handleTabChange(item.id)}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
                <div className={`p-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? `${s.iconActiveBg} text-white shadow-lg scale-110` 
                    : `${s.iconInactiveBg} ${s.iconInactiveText} group-hover:scale-110`
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className={`text-sm font-bold tracking-wide ${
                  isActive ? s.labelActive : "text-slate-600 dark:text-slate-400"
                }`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className={`absolute bottom-0 left-0 w-full h-1 ${s.bottomBar}`}></div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-6" ref={detailsRef}>
        {isLoading && !initialData ? (
          <Card className="min-h-[400px] flex flex-col items-center justify-center p-12 bg-white/50 backdrop-blur-sm border-dashed">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full animate-pulse"></div>
            </div>
            <p className="mt-6 text-base font-medium text-slate-600 animate-pulse tracking-wide font-normal not-italic">
              Loading your personalized dashboard...
            </p>
          </Card>
        ) : (
          <>
            {/* Current inline profile header for Print only */}
            <Card className="hidden print:block bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900 shadow-none card-print-break mb-6">
          <CardContent className="p-5 flex items-center gap-6">
            <Avatar className="h-24 w-24 rounded-lg flex-shrink-0">
              <AvatarImage src={currentUser?.profilePic?.url} alt={currentUser?.name} />
              <AvatarFallback>{currentUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-xl font-bold mb-0.5">{currentUser?.name}</h2>
              
              <div className="grid grid-cols-[60px_10px_1fr] items-center text-sm text-muted-foreground">
                <span className="font-medium text-foreground text-sm">ID</span>
                <span className="text-sm">:</span>
                <span className="text-sm">{currentUser?._id}</span>
                
                {currentUser?.studentSpecificField?.status === "Active" && (
                  <>
                    <span className="font-medium text-foreground text-sm">Class</span>
                    <span className="text-sm">:</span>
                    <span className="text-sm">{className || "N/A"}</span>
                  </>
                )}
                
                <span className="font-medium text-foreground text-sm">Batch</span>
                <span className="text-sm">:</span>
                <span className="text-sm">{batchName || "N/A"}</span>
                
                <span className="font-medium text-foreground text-sm">Status</span>
                <span className="text-sm">:</span>
                <div className="flex">
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${getStatusClass(currentUser?.studentSpecificField?.status)}`}>
                    {currentUser?.studentSpecificField?.status}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {activeTab === "PROFILE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {/* Personal Information */}
          <Card className="card-print-break h-full shadow-sm">
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_12px_1fr] items-start">
            <ProfileField
              label="Date of Birth"
              value={formatDateShort(currentUser?.dateOfBirth)}
            />
            <ProfileField
              label="Blood Group"
              value={currentUser?.studentSpecificField?.bloodGroup || currentUser?.bloodGroup}
            />
            <ProfileField
              label="Aadhar No"
              value={currentUser?.studentSpecificField?.aadharNo || currentUser?.aadharNo}
            />
            {currentUser?.address && (
              <>
                <div className="text-sm font-medium text-muted-foreground py-1">
                  Address
                </div>
                <div className="text-sm px-1 py-1">:</div>
                <div className="text-sm text-foreground py-1">
                  {currentUser.address.houseName && (
                    <div>{currentUser.address.houseName}</div>
                  )}
                  {(currentUser.address.place || currentUser.address.postOffice) && (
                    <div>
                      {[currentUser.address.place, currentUser.address.postOffice]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {(currentUser.address.district ||
                    currentUser.address.state ||
                    currentUser.address.pin) && (
                      <div>
                        {[currentUser.address.district, currentUser.address.state]
                          .filter(Boolean)
                          .join(", ")}
                        {currentUser.address.pin && ` - ${currentUser.address.pin}`}
                      </div>
                    )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

          {/* Academic Info */}
          <Card className="card-print-break h-full shadow-sm">
          <CardHeader>
            <CardTitle>Academic Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_12px_1fr] items-start">
            <ProfileField label="Batch" value={batchName} />
            <ProfileField
              label="Admission Class"
              value={admissionClassName}
            />
            <ProfileField
              label="Admission Date"
              value={formatDateShort(
                currentUser?.studentSpecificField?.admissionDate || currentUser?.admissionDate
              )}
            />
            <ProfileField
              label="Islamic Qualif."
              value={currentUser?.studentSpecificField?.islamicQualification || currentUser?.islamicQualification}
            />
            <ProfileField
              label="Islamic Course"
              value={ongoingIslamicCoursesDisplay}
            />
            <ProfileField
              label="Academic Qualif."
              value={currentUser?.studentSpecificField?.academicQualification || currentUser?.academicQualification}
            />
            <ProfileField
              label="Academic Course"
              value={ongoingAcademicCoursesDisplay}
            />
            <ProfileField
              label="Graduated Year"
              value={currentUser?.studentSpecificField?.graduatedYear || currentUser?.graduatedYear}
            />
            {currentUser?.studentSpecificField?.status === "Dropped Out" && (
              <>
                <ProfileField
                  label="Dropout Date"
                  value={formatDateShort(currentUser?.studentSpecificField?.droppedOutDate)}
                />
                <ProfileField
                  label="Dropout Class"
                  value={classes?.find(c => c._id === currentUser?.studentSpecificField?.droppedOutClass)?.name || currentUser?.studentSpecificField?.droppedOutClass}
                />
                <ProfileField
                  label="Dropout Reason"
                  value={currentUser?.studentSpecificField?.droppedOutReason}
                />
              </>
            )}
          </CardContent>
        </Card>

          {/* Contact Info */}
          <Card className="card-print-break h-full shadow-sm">
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_12px_1fr] items-start">
            <ProfileField label="Email" value={currentUser?.email} />
            <ProfileField label="Contact No" value={currentUser?.contactNumber} />
            <ProfileField
              label="Alt. Contact"
              value={currentUser?.alternativeNumber}
            />
            <ProfileField
              label="Guardian"
              value={currentUser?.studentSpecificField?.guardianName || currentUser?.guardianName}
            />
            <ProfileField
              label="G. Contact"
              value={currentUser?.studentSpecificField?.guardianContactNumber || currentUser?.guardianContactNumber}
            />
            <ProfileField
              label="G. Alt. Contact"
              value={currentUser?.studentSpecificField?.guardianAlternativeNumber || currentUser?.guardianAlternativeNumber}
            />
          </CardContent>
        </Card>

        {showKinship && (currentUser?.studentSpecificField?.familyDetails?.length > 0 || currentUser?.familyOtherDetails) && (
          <Card className="card-print-break shadow-sm col-span-full mt-2">
            <CardHeader className="bg-muted/10 border-b py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Kinship Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentUser?.studentSpecificField?.familyDetails?.length > 0 && (
                <div className="overflow-x-auto w-full min-w-0">
                  <Table className="min-w-[550px] w-full">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-16 text-center">Sl.No</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Age</TableHead>
                        <TableHead>Education</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mobile</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentUser.studentSpecificField.familyDetails.map((member, index) => (
                        <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-center text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell className="font-semibold">{member.position}</TableCell>
                          <TableCell className="uppercase text-blue-600 font-medium">{member.name}</TableCell>
                          <TableCell className="text-center">{member.age || "-"}</TableCell>
                          <TableCell>{member.education || "-"}</TableCell>
                          <TableCell>{member.status || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">{member.mobileNumber || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {currentUser?.familyOtherDetails && (
                <div className="p-4 bg-muted/5 border-t">
                  <h4 className="text-xs font-bold mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                    <MessageSquare className="h-3.5 w-3.5" />
                    General Notes
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {currentUser.familyOtherDetails}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {activeTab === "FINANCE" && (
        <div className="space-y-6">
        <Card className="bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 card-print-break shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <Clock className="h-5 w-5" />
              Pending Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto rounded-md border min-h-[100px] w-full min-w-0">
              {fundsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading financial records...</span>
                </div>
              ) : displayFunds && displayFunds.length > 0 ? (
                <Table className="min-w-[450px] w-full">
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[60px] py-2 whitespace-nowrap">Sl No</TableHead>
                      <TableHead className="py-2 min-w-[200px]">Fund Name</TableHead>
                      <TableHead className="py-2 text-right whitespace-nowrap min-w-[100px]">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayFunds.map((item, index) => (
                      <TableRow key={index} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="py-2 text-muted-foreground font-medium">{index + 1}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">{item.label}</span>
                            {item.subLabel && <span className="text-[10px] text-muted-foreground uppercase">{item.subLabel}</span>}
                          </div>
                        </TableCell>
                        <TableCell 
                          className={`py-2 text-right font-bold text-sm cursor-pointer hover:underline decoration-dotted ${item.value < 0 ? 'text-red-600' : 'text-green-600'}`}
                          onClick={() => {
                            if (item.isCoupon) {
                              setIsCouponModalOpen(true);
                            } else if (item.isInteractive) {
                              setSelectedStandardFund(item);
                              setIsStandardModalOpen(true);
                            }
                          }}
                        >
                          {(item.value || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Summary Row */}
                    <TableRow className="bg-muted/40 font-bold border-t-2 border-muted hover:bg-muted/40">
                      <TableCell colSpan={2} className="py-3 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-xs">
                        Total Pending Balance
                      </TableCell>
                      <TableCell className={`py-3 text-right text-base ${totalPending < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(totalPending || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                   <Clock className="h-8 w-8 opacity-20" />
                   <p className="text-sm font-normal not-italic">No pending transactions found.</p>
                </div>
              )}
            </div>

              {/* Standard Fund Details Modal */}
              <Dialog open={isStandardModalOpen} onOpenChange={setIsStandardModalOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto [&>button.absolute]:hidden p-0 gap-0">
                  <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-background sticky top-0 z-20">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IndianRupee className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left space-y-0.5">
                      <DialogTitle className="text-xl font-bold m-0">
                        {selectedStandardFund?.label} Details
                      </DialogTitle>
                      <DialogDescription className="m-0">
                        Fund collection breakdown and transaction history
                      </DialogDescription>
                    </div>
                    <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                      <X className="h-5 w-5" />
                    </DialogClose>
                  </DialogHeader>
                  <div className="p-5 space-y-8">
                    {/* Collection Breakdown */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Collection Breakdown
                      </h3>
                      <div className="overflow-x-auto w-full min-w-0 rounded-md border">
                        <Table className="min-w-[320px] w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Role Holder</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(selectedStandardFund?.records || []).map((record, i) => (
                              <TableRow key={i}>
                                <TableCell>{record.holder}</TableCell>
                                <TableCell className={`text-right font-bold ${(record.value || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {(record.value || 0).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Full Transaction History */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Fund History
                      </h3>
                      <div className="rounded-md border overflow-x-auto w-full min-w-0">
                        <Table className="min-w-[360px] w-full">
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="py-2 whitespace-nowrap">Date</TableHead>
                              <TableHead className="py-2 text-right whitespace-nowrap">Transactions</TableHead>
                              <TableHead className="py-2 text-right whitespace-nowrap">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedStandardFund?.allTransactions && selectedStandardFund.allTransactions.length > 0 ? (
                              [...selectedStandardFund.allTransactions]
                                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Newest first for display
                                .map((t, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="py-2 text-xs leading-tight">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{formatDateShort(t.date)}</span>
                                        <span className="text-muted-foreground">
                                          {new Date(t.date).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className={`py-2 text-xs text-right font-bold ${t.type === 'Withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                                      <div className="flex flex-col items-end gap-0.5">
                                        <span>{t.type === 'Withdrawal' ? '-' : '+'}{(t.amount || 0).toFixed(2)}</span>
                                        {t.note && (
                                          <span className="text-[10px] font-normal text-muted-foreground leading-tight max-w-[140px] text-right">
                                            {t.note}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className={`py-2 text-xs text-right font-bold ${t.calculatedBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {t.calculatedBalance?.toFixed(2) || "0.00"}
                                    </TableCell>
                                  </TableRow>
                                ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs font-normal not-italic">
                                  No transaction history found for this fund.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Coupon Details Modal */}
              <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto [&>button.absolute]:hidden p-0 gap-0">
                  <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-background sticky top-0 z-20">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 text-left space-y-0.5">
                      <DialogTitle className="text-xl font-bold m-0">
                        Coupon Fund Details
                      </DialogTitle>
                      <DialogDescription className="m-0">
                        Coupon payment history and outstanding balances
                      </DialogDescription>
                    </div>
                    <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                      <X className="h-5 w-5" />
                    </DialogClose>
                  </DialogHeader>
                  <div className="p-4 overflow-x-auto w-full min-w-0">
                    <Table className="min-w-[650px] w-full">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="py-2 w-[60px]">Sl No</TableHead>
                          <TableHead className="py-2">Year</TableHead>
                          <TableHead className="py-2">Coupon No.</TableHead>
                          <TableHead className="py-2 text-right">Fund</TableHead>
                          <TableHead className="py-2 text-right">Total Paid</TableHead>
                          <TableHead className="py-2 text-right">Balance</TableHead>
                          <TableHead className="py-2">Payment History</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {couponDetails.map((coupon, index) => {
                          const paid = (coupon.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                          const balance = (coupon.couponAmount || 0) - paid;
                          return (
                            <TableRow key={coupon._id} className="align-top">
                              <TableCell className="py-3 text-muted-foreground">{index + 1}</TableCell>
                              <TableCell className="py-3 font-bold text-sm">
                                {coupon.academicYear}
                              </TableCell>
                              <TableCell className="py-3 text-sm">
                                {coupon.couponNumber || "N/A"}
                              </TableCell>
                              <TableCell className="py-3 text-right text-sm">₹{(coupon.couponAmount || 0).toFixed(2)}</TableCell>
                              <TableCell className="py-3 text-right text-sm text-green-600">₹{(paid || 0).toFixed(2)}</TableCell>
                              <TableCell className="py-3 text-right font-bold text-orange-600 text-sm">
                                ₹{(balance || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="space-y-1">
                                  {coupon.payments && coupon.payments.length > 0 ? (
                                    coupon.payments.map((p, pIdx) => (
                                      <div key={pIdx} className="flex items-center justify-between gap-4 text-[10px] bg-muted/30 px-2 py-1 rounded border border-muted/50">
                                        <span className="text-muted-foreground">{formatDateShort(p.date)}</span>
                                        <span className="font-bold text-green-700">₹{(p.amount || 0).toFixed(2)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground font-normal not-italic">No payments recorded</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {couponDetails.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                              No coupon records found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>

          </CardContent>
        </Card>


      </div>
      )}

      {activeTab === "LIBRARY" && (
        <Card className="lg:col-span-2 print:col-span-2 card-print-break shadow-sm">
          <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 pb-2 border-b mb-4 relative">
            <div className="flex items-center bg-muted rounded-lg p-1 w-full md:w-auto order-2 md:order-1">
              {isActiveStudent && (
                <Button
                  variant={librarySubTab === "BOOKS" ? "secondary" : "ghost"}
                  size="sm"
                  className={`flex-1 md:flex-none md:w-28 h-8 rounded-md transition-all ${librarySubTab === "BOOKS" ? "bg-white shadow-sm font-bold" : ""}`}
                  onClick={() => setLibrarySubTab("BOOKS")}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Books
                </Button>
              )}
              <Button
                variant={librarySubTab === "HISTORY" ? "secondary" : "ghost"}
                size="sm"
                className={`flex-1 md:flex-none md:w-28 h-8 rounded-md transition-all ${librarySubTab === "HISTORY" ? "bg-white shadow-sm font-bold" : ""}`}
                onClick={() => setLibrarySubTab("HISTORY")}
              >
                <List className="h-4 w-4 mr-2" />
                History
              </Button>
            </div>
            <CardTitle className="flex items-center gap-2 text-center md:absolute md:left-1/2 md:-translate-x-1/2 order-1 md:order-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              Library Services
            </CardTitle>
            <div className="hidden md:block w-56 order-3" /> {/* Spacer to balance the left buttons */}
          </CardHeader>
          <CardContent className="pt-2">
            {librarySubTab === "BOOKS" && isActiveStudent ? (
              <div className="space-y-4">
                {libraryBooksLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                  </div>
                ) : (
                  <TableComponent
                    data={libraryBooks}
                    getRowId={(row) => row._id}
                    tableHeight="calc(100vh - 450px)"
                    hidePrintBtn={true}
                    hideColumnManagement={true}
                    enableGrid={true}
                    defaultViewMode="grid"
                    gridColsClass="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    hideViewToggle={true}
                    inlineFilters={true}
                    requireFilterToRenderData={true}
                    columnsConfig={[
                      { accessorKey: "id", header: "Book ID", sortingFn: "alphanumeric" },
                      { accessorKey: "name", header: "Book Name" },
                      { accessorKey: "author", header: "Author" },
                      { 
                        accessorKey: "category", 
                        header: "Category",
                        filterFn: (row, columnId, filterValue) => {
                            if (!filterValue || filterValue.length === 0) return true;
                            const rowValue = normalizeCategoryName(row.getValue(columnId));
                            const filterArr = Array.isArray(filterValue) ? filterValue : [filterValue];
                            return filterArr.some(val => normalizeCategoryName(val) === rowValue);
                        }
                      },
                      { 
                        accessorKey: "language", 
                        header: "Language",
                        filterFn: (row, columnId, filterValue) => {
                            if (!filterValue || filterValue.length === 0) return true;
                            const rowValue = row.getValue(columnId);
                            const filterArr = Array.isArray(filterValue) ? filterValue : [filterValue];
                            return filterArr.some(val => String(val).toLowerCase() === String(rowValue).toLowerCase());
                        }
                      },
                      { accessorKey: "status", header: "Status" },
                    ]}
                    filterConfig={[
                      {
                        id: "category",
                        label: "Category",
                        inputType: "multiSelect",
                        options: Array.from(new Set(libraryBooks.map(b => normalizeCategoryName(b.category)))).filter(Boolean).sort().map(c => ({ value: c, label: c }))
                      },
                      {
                        id: "language",
                        label: "Language",
                        inputType: "multiSelect",
                        options: Array.from(new Set(libraryBooks.map(b => typeof b.language === 'string' ? b.language.toUpperCase() : b.language))).filter(Boolean).sort().map(l => ({ value: l, label: l }))
                      },
                      {
                        id: "status",
                        label: "Status",
                        inputType: "multiSelect",
                        options: [
                          { value: "Available", label: "Available" },
                          { value: "Rented", label: "Rented" },
                        ]
                      }
                    ]}
                    renderGridItem={(row) => {
                      const book = row.original;
                      return (
                        <Card className="h-full hover:shadow-md transition-shadow overflow-hidden border border-border/50">
                          <CardContent className="p-4 flex gap-4 items-start">
                            <div className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px]">
                              <div className="bg-muted/50 dark:bg-muted/20 p-2 rounded-md flex items-center justify-center w-full aspect-square border border-border/50">
                                <BookOpen className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div className="text-center w-full space-y-1">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/80 py-0.5 rounded border truncate">ID: {book.id}</div>
                                <div className={`text-[8px] px-1 py-0.5 mt-1.5 rounded-full font-bold uppercase tracking-wider inline-block w-full ${book.status === 'Available' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                  {(book.status === 'Pending' || book.status === 'Rented') ? 'Rented' : (book.status || "Unknown")}
                                </div>
                                <div className="font-bold text-[11px] text-foreground">₹{book.price?.toFixed(2) || "0.00"}</div>
                              </div>
                            </div>
                            <div className="flex-1 space-y-1 min-w-0 py-1 flex flex-col h-full">
                              <div className="flex-1">
                                <h3 className="font-bold text-base leading-tight break-words mb-1 text-foreground book-text-font" title={book.name}>{book.name}</h3>
                                <div className="text-xs text-muted-foreground truncate -mt-1" title={book.author}>Author: <span className="text-foreground font-medium book-text-font leading-none">{book.author}</span></div>
                                {book.publication && <div className="text-xs text-muted-foreground truncate -mt-1" title={book.publication}>Pub: <span className="text-foreground book-text-font leading-none">{book.publication}</span></div>}
                                <div className="text-[13px] mt-0.5 flex flex-wrap gap-1">
                                  <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground book-text-font leading-none">{book.language}</span>
                                  <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground book-text-font leading-none">{book.category}</span>
                                </div>
                              </div>
                              <div className="pt-1 flex flex-col gap-2 mt-auto">
                                <div className="flex items-center gap-2 w-full">
                                  {/* Barcode in the same row */}
                                  <div className="flex-1 flex justify-center items-center h-7 overflow-hidden bg-white rounded border border-border/50 shadow-sm p-0.5">
                                    {book.id && (
                                      <Barcode
                                        value={String(book.id)}
                                        width={0.6}
                                        height={20}
                                        fontSize={0}
                                        margin={0}
                                        displayValue={false}
                                        background="transparent"
                                      />
                                    )}
                                  </div>

                                  <div className="flex-1">
                                    {(() => {
                                      const existingReq = pendingRequests.find(r => r.bookId?._id === book._id || r.bookId === book._id);
                                      if (existingReq) {
                                        return (
                                          <Button 
                                            size="sm" 
                                            className="w-full h-7 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white"
                                            onClick={() => handleCancelRequest(existingReq._id)}
                                          >
                                            Cancel Request
                                          </Button>
                                        );
                                      } else if (book.status !== "Available") {
                                        return (
                                          <Button disabled size="sm" className="w-full h-7 text-[10px] font-bold bg-muted text-muted-foreground">
                                            Not Available
                                          </Button>
                                        );
                                      } else {
                                        return (
                                          <Button 
                                            size="sm" 
                                            className="w-full h-7 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white"
                                            onClick={() => handleRequestBook(book)}
                                          >
                                            Request
                                          </Button>
                                        );
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="w-full min-w-0">
                {rentalsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                  </div>
                ) : rentalHistory && rentalHistory.length > 0 ? (
                  <div className="rounded-md border overflow-auto max-h-[500px] w-full min-w-0">
                    <Table className="min-w-[500px] w-full">
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[60px] whitespace-nowrap">Sl No</TableHead>
                          <TableHead className="min-w-[180px]">Book Name</TableHead>
                          <TableHead className="whitespace-nowrap min-w-[120px]">Rented Date</TableHead>
                          <TableHead className="whitespace-nowrap min-w-[120px]">Returned Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rentalHistory.map((rental, index) => (
                          <TableRow key={rental._id}>
                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {rental.bookId?.name || "Unknown Book"}
                              <div className="text-xs text-muted-foreground">
                                {rental.bookId?.id || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {formatDateWithoutDay(rental.rentedDate)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {rental.receivedDate ? (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Clock className="h-3 w-3" />
                                  {formatDateWithoutDay(rental.receivedDate)}
                                </div>
                              ) : (
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  Currently Reading
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No book rental history found.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "MARKS" && (
        <div className="grid grid-cols-1 gap-5 pt-5 print-stack-vertical">
          <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                Exam Marks
              </CardTitle>
            </div>
            {marks && marks.length > 0 && (
              <div className="no-print">
                <Select onValueChange={setSelectedExamId} value={selectedExamId}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Select Exam" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exams</SelectItem>
                    {marks.map((exam) => (
                      <SelectItem key={exam._id} value={exam._id}>
                        {exam.examName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {marksLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : marks && marks.length > 0 ? (
                <div className="space-y-6">
                  {marks
                    .filter((exam) => selectedExamId === "all" || exam._id === selectedExamId)
                    .map((exam) => {
                      const studentMarks = exam.students.find(s => s.studentId?._id === currentUser._id || s.studentId === currentUser._id);
                      if (!studentMarks) return null;

                      // Calculate totals, percentage, and rank
                      let studentTotal = 0;
                      let maxTotal = 0;
                      exam.subjects.forEach(subject => {
                        const m = studentMarks.marks?.[subject.name];
                        if (subject.subColumns && subject.subColumns.length > 0) {
                            subject.subColumns.forEach(sc => {
                                studentTotal += (m && typeof m === 'object') ? (Number(m[sc.name]) || 0) : 0;
                                maxTotal += Number(sc.maxMark) || 0;
                            });
                        } else {
                            studentTotal += Number(m) || 0;
                            maxTotal += subject.maxMark || 100;
                        }
                      });
                      const percentage = maxTotal > 0 ? ((studentTotal / maxTotal) * 100).toFixed(2) : 0;

                      // Rank calculation
                      const allStudentTotals = exam.students.map(s => {
                        let total = 0;
                        exam.subjects.forEach(subject => {
                          const m = s.marks?.[subject.name];
                          if (subject.subColumns && subject.subColumns.length > 0) {
                              subject.subColumns.forEach(sc => {
                                  total += (m && typeof m === 'object') ? (Number(m[sc.name]) || 0) : 0;
                              });
                          } else {
                              total += Number(m) || 0;
                          }
                        });
                        return { studentId: s.studentId?._id || s.studentId, total };
                      });
                      allStudentTotals.sort((a, b) => b.total - a.total);
                      const rank = allStudentTotals.findIndex(s => s.studentId === currentUser._id) + 1;

                      // Collect all unique sub-column names for this exam
                      const subColNames = [];
                      exam.subjects.forEach(subject => {
                        if (subject.subColumns && subject.subColumns.length > 0) {
                          subject.subColumns.forEach(sc => {
                            if (!subColNames.includes(sc.name)) {
                              subColNames.push(sc.name);
                            }
                          });
                        }
                      });

                      return (
                        <div key={exam._id} className="space-y-1 print-exam-card w-full min-w-0">
                          <div className="rounded-md border overflow-x-auto w-full min-w-0">
                            <Table className="min-w-[550px] w-full">
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead colSpan={3 + subColNames.length} className="text-center font-bold text-sm h-10 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                                    {exam.examName}
                                  </TableHead>
                                </TableRow>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="py-2 text-xs min-w-[150px]">Subject</TableHead>
                                  {subColNames.map(name => (
                                    <TableHead key={name} className="py-2 text-xs text-center whitespace-nowrap min-w-[80px]">{name}</TableHead>
                                  ))}
                                  <TableHead className="py-2 text-xs text-center whitespace-nowrap min-w-[80px]">Total</TableHead>
                                  <TableHead className="py-2 text-xs text-center whitespace-nowrap min-w-[90px]">Result</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {exam.subjects.map((subject, sIndex) => {
                                  const rawMark = studentMarks.marks?.[subject.name];
                                  let markTotal = 0;
                                  let maxMarkTotal = subject.maxMark || 100;
                                  let isPass = true;
                                  const hasSubCols = subject.subColumns && subject.subColumns.length > 0;
                                  
                                  if (hasSubCols) {
                                      maxMarkTotal = 0;
                                      subject.subColumns.forEach(sc => {
                                          const scVal = (rawMark && typeof rawMark === 'object') ? (Number(rawMark[sc.name]) || 0) : 0;
                                          markTotal += scVal;
                                          maxMarkTotal += Number(sc.maxMark) || 0;
                                          if (scVal < (Number(sc.passMark) || 0)) isPass = false;
                                      });
                                  } else {
                                      markTotal = Number(rawMark) || 0;
                                      if (markTotal < (subject.passMark || 40)) isPass = false;
                                  }
                                  
                                  const displayMark = (rawMark === undefined || rawMark === null) ? "N/A" : markTotal;

                                  return (
                                    <TableRow key={`${subject.name}-${sIndex}`}>
                                      <TableCell className="py-2 text-sm font-medium">
                                          {subject.name}
                                      </TableCell>
                                      {subColNames.map(name => {
                                        let val = "-";
                                        if (hasSubCols) {
                                          const sc = subject.subColumns.find(col => col.name === name);
                                          if (sc) {
                                            const scVal = (rawMark && typeof rawMark === 'object') ? rawMark[sc.name] : undefined;
                                            val = scVal !== undefined ? scVal : "-";
                                          }
                                        }
                                        return (
                                          <TableCell key={name} className="py-2 text-sm text-center">
                                            {val}
                                          </TableCell>
                                        );
                                      })}
                                      <TableCell className="py-2 text-sm text-center">
                                        <span className="font-semibold">{displayMark}</span> <span className="text-xs text-muted-foreground">/ {maxMarkTotal}</span>
                                      </TableCell>
                                      <TableCell className="py-2 text-center">
                                        {displayMark !== "N/A" ? (
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {isPass ? 'Pass' : 'Fail'}
                                          </span>
                                        ) : "-"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {/* Summary Row */}
                                <TableRow className="bg-indigo-50/30 dark:bg-indigo-950/20 font-bold border-t-2">
                                  <TableCell colSpan={1 + subColNames.length} className="py-2 text-sm text-indigo-700 dark:text-indigo-300">SUMMARY</TableCell>
                                  <TableCell className="py-2 text-sm text-center">
                                    <div className="flex flex-col">
                                      <span>{studentTotal} / {maxTotal}</span>
                                      <span className="text-[10px] text-muted-foreground">{percentage}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 text-center">
                                    <div className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300">
                                      <span className="text-[10px] font-bold">RANK</span>
                                      <span className="text-sm">#{rank}</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>

                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No exam marks records found.</p>
                </div>
              )}
            </div>
          </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "ATTENDANCE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 print-stack-vertical">
          {/* Attendance History */}
          <Card className="card-print-break" ref={historyRef}>
            <CardHeader className="bg-muted/10 pb-4 pt-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar 
                  className="w-5 h-5 text-primary cursor-pointer hover:opacity-80 transition-opacity no-print" 
                  onClick={() => downloadCardAsJpeg(historyRef, `Attendance_History_${selectedYear}.jpg`)}
                  title="Download as Image"
                />
                Attendance History
              </CardTitle>
              <div className="no-print">
                <Select
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                  defaultValue={selectedYear.toString()}
                >
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pt-4 pb-6">
              <div className="max-h-[400px] overflow-auto border rounded-md w-full min-w-0">
                <Table className="min-w-[450px] w-full">
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="py-2 text-xs whitespace-nowrap">Month</TableHead>
                      <TableHead className="py-2 text-xs whitespace-nowrap">Total</TableHead>
                      <TableHead className="py-2 text-xs whitespace-nowrap">Present</TableHead>
                      <TableHead className="py-2 text-xs whitespace-nowrap">Absent</TableHead>
                      <TableHead className="py-2 text-xs text-right whitespace-nowrap">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendanceHistory.length > 0 ? (
                      filteredAttendanceHistory.map((row) => (
                        <React.Fragment key={row.monthYear}>
                          <TableRow
                            onClick={() =>
                              setExpandedMonth(
                                expandedMonth === row.monthYear ? null : row.monthYear
                              )
                            }
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            <TableCell className="py-2 text-sm font-medium whitespace-nowrap">{row.month}</TableCell>
                            <TableCell className="py-2 text-sm whitespace-nowrap">{row.totalPeriods}</TableCell>
                            <TableCell className="py-2 text-sm whitespace-nowrap">{row.presentPeriods}</TableCell>
                            <TableCell className="py-2 text-sm whitespace-nowrap">{(row.totalPeriods || 0) - (row.presentPeriods || 0)}</TableCell>
                            <TableCell className="py-2 text-sm text-right whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${parseFloat(row.percentage) > 80 ? 'bg-green-100 text-green-700' :
                                parseFloat(row.percentage) >= 50 ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                {row.percentage}%
                              </span>
                            </TableCell>
                          </TableRow>
                          {expandedMonth === row.monthYear && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={5} className="p-0">
                                <div className="p-3 sm:p-4 overflow-x-auto w-full min-w-0">
                                  <Table className="border rounded-md bg-background min-w-[380px] w-full">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="h-8 py-1 whitespace-nowrap">Date</TableHead>
                                        <TableHead className="h-8 py-1 min-w-[180px]">Subject (Teacher)</TableHead>
                                        <TableHead className="h-8 py-1 text-center whitespace-nowrap">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {row.details.map((detail, dIdx) => (
                                        <TableRow key={`${detail.date}-${dIdx}`} className="h-8">
                                          <TableCell className="py-1 text-xs">{detail.date}</TableCell>
                                          <TableCell className="py-1 text-xs font-medium">
                                            {detail.subject} <span className="text-muted-foreground font-normal">({detail.teacher})</span>
                                          </TableCell>
                                          <TableCell className="py-1 text-center whitespace-nowrap">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase inline-block ${detail.present ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                                              }`}>
                                              {detail.present ? "Present" : "Absent"}
                                            </span>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm font-normal not-italic">
                          No records found for {selectedYear}.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Chart */}
          <Card className="card-print-break flex flex-col" ref={chartRef}>
            <CardHeader className="bg-muted/10 pb-4 pt-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <LayoutGrid 
                  className="w-5 h-5 text-primary cursor-pointer hover:opacity-80 transition-opacity no-print" 
                  onClick={() => downloadCardAsJpeg(chartRef, `Attendance_Chart_${selectedYear}.jpg`)}
                  title="Download as Image"
                />
                Attendance Chart ({selectedYear})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex items-center justify-center">
              <div className="w-full h-full min-h-[300px] overflow-x-auto pb-2 flex justify-start">
                <BarChart
                  width={Math.max(300, filteredAttendanceHistory.length * 60 + 60)}
                  height={400}
                  data={filteredAttendanceHistory}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  barCategoryGap={20}
                >
                  <XAxis dataKey="month" tick={false} padding={{ left: 10, right: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" />
                  <Bar
                    dataKey="percentage"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  >
                    <LabelList 
                      dataKey="month" 
                      position="center" 
                      angle={-90} 
                      fill="white"
                      style={{ 
                        fontWeight: 'bold', 
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        pointerEvents: 'none'
                      }}
                    />
                    <LabelList 
                      dataKey="percentage" 
                      position="top" 
                      formatter={(val) => `${val}%`}
                      style={{ 
                        fontWeight: 'bold', 
                        fontSize: '10px',
                        fill: '#6b7280'
                      }}
                    />
                    {filteredAttendanceHistory.map((entry, index) => {
                      const p = parseFloat(entry.percentage);
                      const color = p > 80 ? "#22c55e" : p >= 50 ? "#ea580c" : "#ef4444";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "LEAVES" && (
        <Card className="flex flex-col card-print-break mt-5 border-violet-100 dark:border-violet-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Plane className="h-5 w-5 text-violet-500" />
              Leave History
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="w-full min-w-0">
              {leavesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (leavesList && leavesList.length > 0) ? (
                <div className="rounded-md border overflow-auto max-h-[400px] w-full min-w-0">
                  <Table className="min-w-[850px] w-full">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[60px] py-3 pl-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap">Sl No</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider min-w-[110px] whitespace-nowrap">Date of Leave</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider min-w-[180px]">Leave Reason</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider min-w-[110px] whitespace-nowrap">Exp. Arrival</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider min-w-[110px] whitespace-nowrap">Actual Arrival</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider min-w-[120px] whitespace-nowrap">Late Reason</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider min-w-[120px] whitespace-nowrap">Remark</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider text-center min-w-[100px] whitespace-nowrap">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...leavesList]
                        .sort((a, b) => new Date(b.dateOfLeave) - new Date(a.dateOfLeave))
                        .map((leave, index) => (
                        <TableRow key={leave._id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3 pl-4 text-sm text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell className="py-3 text-sm font-bold text-violet-700 dark:text-violet-300 whitespace-nowrap">
                            {formatDateShort(leave.dateOfLeave)}
                          </TableCell>
                          <TableCell className="py-3 min-w-[180px]">
                            <p className="text-sm text-foreground leading-relaxed font-normal not-italic" title={leave.leaveReason}>
                              {leave.leaveReason}
                            </p>
                          </TableCell>
                          <TableCell className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatDateShort(leave.dateOfArrival)}
                          </TableCell>
                          <TableCell className="py-3 text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                            {leave.arrivedDate ? formatDateShort(leave.arrivedDate) : "N/A"}
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground whitespace-nowrap">
                            {leave.lateReason || "-"}
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground whitespace-nowrap">
                            {leave.remark || "-"}
                          </TableCell>
                          <TableCell className="py-3 text-center whitespace-nowrap">
                            {leave.arrivedDate ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <span className="h-1 w-1 rounded-full bg-green-500" />
                                Returned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse">
                                <span className="h-1 w-1 rounded-full bg-orange-500" />
                                On Leave
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Plane className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No leave records found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "REMARKS" && (
        <Card className="flex flex-col card-print-break mt-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-500" />
              Student Remarks & Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {/* Sub-tab Switcher */}
            <div className="flex gap-2 border-b pb-3 overflow-x-auto no-scrollbar mt-2">
              {[
                { id: "REMARKS", label: "Remarks", icon: MessageSquare, color: "text-orange-600 dark:text-orange-400", activeBg: "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300" },
                { id: "PERFORMANCE", label: "Performance", icon: Trophy, color: "text-amber-600 dark:text-amber-400", activeBg: "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300" },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeRemarksSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveRemarksSubTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                      isActive
                        ? tab.activeBg
                        : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "" : tab.color}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="w-full min-w-0">
              {activeRemarksSubTab === "REMARKS" ? (
                remarksLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (remarksList && remarksList.length > 0) ? (
                  <div className="rounded-md border overflow-auto max-h-[400px] w-full min-w-0">
                    <Table className="min-w-[600px] w-full">
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[60px] py-3 pl-4 text-xs font-semibold whitespace-nowrap">Sl No</TableHead>
                          <TableHead className="py-3 text-xs font-semibold whitespace-nowrap min-w-[100px]">Date</TableHead>
                          <TableHead className="py-3 text-xs font-semibold min-w-[200px]">Remarks</TableHead>
                          <TableHead className="py-3 text-xs font-semibold whitespace-nowrap min-w-[120px]">Teacher</TableHead>
                          <TableHead className="py-3 text-xs font-semibold text-center whitespace-nowrap min-w-[100px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...remarksList]
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((remark, index) => (
                          <TableRow key={remark._id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="py-3 pl-4 text-sm text-muted-foreground font-medium">{index + 1}</TableCell>
                            <TableCell className="py-3 text-sm font-medium whitespace-nowrap">
                              {formatDateShort(remark.date)}
                            </TableCell>
                            <TableCell className="py-3 min-w-[200px]">
                              <p className="text-sm text-foreground leading-relaxed font-normal not-italic">{remark.comments}</p>
                            </TableCell>
                            <TableCell className="py-3 text-sm text-muted-foreground whitespace-nowrap">
                              {remark.teacherName || "N/A"}
                            </TableCell>
                            <TableCell className="py-3 text-center whitespace-nowrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase inline-block" style={getStatusBadgeStyle(remark.status)}>
                                {remark.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">No remarks records found.</p>
                  </div>
                )
              ) : (
                performanceLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (performanceList && performanceList.length > 0) ? (
                  <div className="rounded-md border overflow-auto max-h-[400px] w-full min-w-0">
                    <Table className="min-w-[600px] w-full">
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[60px] py-3 pl-4 text-xs font-semibold whitespace-nowrap">Sl No</TableHead>
                          <TableHead className="py-3 text-xs font-semibold whitespace-nowrap min-w-[100px]">Date</TableHead>
                          <TableHead className="py-3 text-xs font-semibold min-w-[200px]">Performance</TableHead>
                          <TableHead className="py-3 text-xs font-semibold whitespace-nowrap min-w-[120px]">Teacher</TableHead>
                          <TableHead className="py-3 text-xs font-semibold text-center whitespace-nowrap min-w-[100px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...performanceList]
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((perf, index) => (
                          <TableRow key={perf._id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="py-3 pl-4 text-sm text-muted-foreground font-medium">{index + 1}</TableCell>
                            <TableCell className="py-3 text-sm font-medium whitespace-nowrap">
                              {formatDateShort(perf.date)}
                            </TableCell>
                            <TableCell className="py-3 min-w-[200px]">
                              <p className="text-sm text-foreground leading-relaxed font-normal not-italic">{perf.comments}</p>
                            </TableCell>
                            <TableCell className="py-3 text-sm text-muted-foreground whitespace-nowrap">
                              {perf.teacherName || "N/A"}
                            </TableCell>
                            <TableCell className="py-3 text-center whitespace-nowrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase inline-block" style={getStatusBadgeStyle(perf.status)}>
                                {perf.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Trophy className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">No performance records found.</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "NOTIFICATIONS" && (
        <Card className="flex flex-col card-print-break mt-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan-500" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="p-5 rounded-2xl bg-cyan-100 dark:bg-cyan-900/20 mb-4">
                <Bell className="h-10 w-10 text-cyan-500 opacity-60" />
              </div>
              <p className="text-base font-semibold text-cyan-700 dark:text-cyan-300 mb-1">No Notifications</p>
              <p className="text-sm text-muted-foreground">You have no notifications at this time.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "DOWNLOADS" && (
        <Card className="flex flex-col card-print-break mt-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Download className="h-5 w-5 text-teal-500" />
              Downloads
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <DownloadsTabContent apiKey={apiKey} />
          </CardContent>
        </Card>
      )}

      {activeTab === "AWARDS" && (
        <Card className="flex flex-col card-print-break mt-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Awards &amp; Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <AwardsTabContent currentUser={currentUser} apiKey={apiKey} />
          </CardContent>
        </Card>
      )}

      {activeTab === "ARTICLES" && (
        <Card className="flex flex-col card-print-break mt-5 border-purple-100 dark:border-purple-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-purple-500" />
              Articles
            </CardTitle>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {articles?.length || 0} Total Articles
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {articlesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : articles && articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, idx) => (
                  <div key={article._id || idx} className="group overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col bg-white dark:bg-slate-900 rounded-2xl cursor-default h-full">
                    {article.image?.url ? (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          src={article.image.url}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                        <Newspaper className="w-12 h-12 text-purple-200 group-hover:text-purple-300 transition-colors" />
                      </div>
                    )}
                    <div className="flex-1 p-5 md:p-6 flex flex-col">
                      <div className="flex items-center gap-2 text-purple-600 text-xs font-bold uppercase tracking-widest mb-3">
                        <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                          {article.date ? new Date(article.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recent"}
                        </span>
                        {article.author && (
                          <span className="text-muted-foreground font-medium normal-case tracking-normal truncate">by {article.author}</span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors line-clamp-2 leading-tight">
                        {article.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3 flex-1 mb-4">
                        {article.content}
                      </p>
                      <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400"></span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSharedArticle(article);
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          title="Share this article"
                        >
                          <Share2 className="w-3 h-3" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="p-5 rounded-2xl bg-purple-100 dark:bg-purple-900/20 mb-4">
                  <Newspaper className="h-10 w-10 text-purple-500 opacity-60" />
                </div>
                <p className="text-base font-semibold text-purple-700 dark:text-purple-300 mb-1">No Articles Available</p>
                <p className="text-sm text-muted-foreground text-center max-w-xs">No articles have been published yet. Check back later!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "UPDATES" && (
        <Card className="flex flex-col card-print-break mt-5 border-pink-100 dark:border-pink-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-pink-500" />
              Latest Updates
            </CardTitle>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {updates?.length || 0} Total Updates
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {updates && updates.length > 0 ? (
                updates.map((update, idx) => (
                  <UpdateCard key={update._id || idx} update={update} />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <div className="p-5 rounded-2xl bg-pink-100 dark:bg-pink-900/20 mb-4">
                    <Megaphone className="h-10 w-10 text-pink-500 opacity-60" />
                  </div>
                  <p className="text-base font-semibold text-pink-700 dark:text-pink-300 mb-1">No Updates Available</p>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">There are no institutional updates or news items at this time. Check back later!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
          </>
        )}
      <div className="fixed bottom-4 right-4 no-print">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
      </div>
    </div>
    
    <ProfileEditModal 
      user={currentUser} 
      open={isEditModalOpen} 
      onClose={() => setIsEditModalOpen(false)} 
      onSuccess={async () => {
        // 1. Optimistically update status to show 'Requested' immediately
        const now = new Date();
        setCurrentUser(prev => ({ 
          ...prev, 
          profileUpdateStatus: "Pending",
          profileRequestDate: now.toISOString()
        }));
        
        // 2. Invalidate React Query to update any visible tables immediately
        queryClient.invalidateQueries({ queryKey: ["users"] });
        
        // 3. Re-fetch full user data to ensure state is in sync with server
        try {
          const res = await fetch(`/api/users?_id=${currentUser._id}`, {
             headers: { "x-api-key": apiKey }
          });
          const data = await res.json();
          // The API returns { users: [...], pagination: ... }
          if (data && data.users && Array.isArray(data.users) && data.users.length > 0) {
            setCurrentUser(data.users[0]);
          } else if (data && Array.isArray(data) && data.length > 0) {
            setCurrentUser(data[0]);
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }

        // 4. Trigger router refresh for any server components
        router.refresh();
      }}
    />
    <ShareModal
      open={!!sharedArticle}
      onOpenChange={(open) => !open && setSharedArticle(null)}
      title={sharedArticle?.title || ""}
      text={sharedArticle?.content || ""}
      url={
        sharedArticle
          ? `${typeof window !== "undefined" ? window.location.origin : ""}/articles/${sharedArticle._id}`
          : ""
      }
      category="Article"
    />
  </>
  );
}
