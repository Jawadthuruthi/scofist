"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Trophy, Loader2, Download, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

export default function StarOfTheMonthModal({ classes = [] }) {
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [loading, setLoading] = useState(false);
  const [starData, setStarData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef(null);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(posterRef.current, { useCORS: true, scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.href = imgData;
      const monthLabel = months.find(m => m.value === selectedMonth)?.label || "Month";
      link.download = `Star_of_the_Month_${monthLabel}_${selectedYear}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      toast.error("Failed to download poster");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(posterRef.current, { useCORS: true, scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          setExporting(false);
          return;
        }
        const monthLabel = months.find(m => m.value === selectedMonth)?.label || "Month";
        const file = new File([blob], `Star_of_the_Month_${monthLabel}_${selectedYear}.jpg`, { type: "image/jpeg" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: "Star of the Month",
              text: `Check out the Star of the Month for ${monthLabel} ${selectedYear}!`,
              files: [file]
            });
          } catch (shareErr) {
            console.error("Share failed", shareErr);
          }
        } else {
          toast.error("Sharing is not supported on this device/browser");
        }
        setExporting(false);
      }, "image/jpeg", 0.9);
    } catch (err) {
      console.error(err);
      toast.error("Failed to share poster");
      setExporting(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString("default", { month: "long" })
  }));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleGenerate = async () => {
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }

    setLoading(true);
    setStarData(null);

    try {
      const response = await axios.get(`/api/performance/star`, {
        params: {
          classId: selectedClass,
          month: selectedMonth,
          year: selectedYear
        }
      });

      if (response.data.success) {
        setStarData(response.data.data);
      } else {
        toast.error(response.data.message || "Failed to calculate Star of the Month");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while calculating performance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setStarData(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 w-9 p-0 flex items-center justify-center shrink-0" title="Star of the Month">
          <Star className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md md:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-indigo-700">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" />
            Star of the Month
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          <div className="space-y-2 col-span-1">
            <label className="text-sm font-medium">Year</label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Month</label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 col-span-2 md:col-span-1">
            <label className="text-sm font-medium">Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.value || c._id} value={c.value || c._id}>{c.label || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={loading || !selectedClass}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
          Calculate & Generate Poster
        </Button>

        {starData && (
          <div className="mt-6 flex flex-col gap-4">
            <div ref={posterRef} className="p-6 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-lg flex flex-col items-center justify-center relative overflow-hidden">
              {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-yellow-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
            
            {starData.student ? (
              <>
                <div className="text-center z-10 w-full mb-2 border-b border-indigo-100/50 pb-2">
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest">{starData.institutionName}</h2>
                </div>

                <div className="text-center z-10 mb-4 mt-2">
                  <h3 className="text-3xl font-extrabold text-indigo-800 mb-1" style={{ color: "#3730a3" }}>
                    STAR OF THE MONTH
                  </h3>
                  <p className="text-indigo-800/80 font-medium tracking-wider uppercase text-sm">
                    {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </p>
                </div>
                
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-50 animate-pulse"></div>
                  <div className="relative bg-white w-32 h-32 rounded-full border-4 border-yellow-400 shadow-xl flex items-center justify-center overflow-hidden">
                    {starData.student.profilePic ? (
                      <img 
                        src={starData.student.profilePic} 
                        alt={starData.student.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Trophy className="h-16 w-16 text-yellow-500" />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-lg font-bold">
                    #1
                  </div>
                </div>

                <div className="text-center z-10 space-y-1 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{starData.student.name}</h2>
                  <p className="text-gray-500 font-medium">{starData.className}</p>
                </div>

                <div className="w-full bg-white/90 backdrop-blur-md rounded-xl p-5 shadow-sm border border-indigo-50 z-10" data-html2canvas-ignore="true">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                    <span className="font-semibold text-gray-700 tracking-wide uppercase text-xs">Total Score</span>
                    <span className="text-3xl font-black text-indigo-600 drop-shadow-sm">{starData.totalScore} pts</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Regular Att.</span>
                      <span className="font-semibold">{starData.breakdown.regularAttendance} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Masjid Att.</span>
                      <span className="font-semibold">{starData.breakdown.masjidAttendance} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Literary Att.</span>
                      <span className="font-semibold">{starData.breakdown.literaryAttendance} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Remarks</span>
                      <span className="font-semibold">{starData.breakdown.remarks} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Performance</span>
                      <span className="font-semibold">{starData.breakdown.performance} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Leaves</span>
                      <span className="font-semibold">{starData.breakdown.leaves} pts</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-10 text-center z-10">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No performance data found for this class in the selected month.</p>
              </div>
            )}
            </div>
            
            {starData.student && (
              <div className="flex justify-center gap-4 mt-2">
                <Button 
                  onClick={handleDownload} 
                  disabled={exporting}
                  className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  Download JPEG
                </Button>
                <Button 
                  onClick={handleShare} 
                  disabled={exporting}
                  className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                  Share Poster
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
