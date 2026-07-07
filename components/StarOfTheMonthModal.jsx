"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Trophy, Loader2, Download, Share2, ImagePlus, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

export default function StarOfTheMonthModal({ classes = [] }) {
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [loading, setLoading] = useState(false);
  const [starData, setStarData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [bgImage, setBgImage] = useState(null);
  const posterRefs = useRef([]);

  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setBgImage(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setBgImage(null);
    }
  };

  const handleDownload = async (index, data) => {
    const posterRef = posterRefs.current[index];
    if (!posterRef) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(posterRef, { useCORS: true, scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.href = imgData;
      const monthLabel = months.find(m => m.value === selectedMonth)?.label || "Month";
      const classNameClean = (data.className || "Class").replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Star_of_the_Month_${classNameClean}_${monthLabel}_${selectedYear}.jpg`;
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

  const handleShare = async (index, data) => {
    const posterRef = posterRefs.current[index];
    if (!posterRef) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(posterRef, { useCORS: true, scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          setExporting(false);
          return;
        }
        const monthLabel = months.find(m => m.value === selectedMonth)?.label || "Month";
        const classNameClean = (data.className || "Class").replace(/[^a-zA-Z0-9]/g, '_');
        const file = new File([blob], `Star_of_the_Month_${classNameClean}_${monthLabel}_${selectedYear}.jpg`, { type: "image/jpeg" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Star of the Month - ${data.className}`,
              text: `Check out the Star of the Month for ${data.className} in ${monthLabel} ${selectedYear}!`,
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

  const handlePrintAll = async () => {
    if (!starData || starData.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }
    printWindow.document.write('<html><body><h2 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating posters for printing. Please wait...</h2></body></html>');

    setExporting(true);
    toast.info("Preparing posters for printing...");
    try {
      const images = [];
      for (let i = 0; i < starData.length; i++) {
        const posterRef = posterRefs.current[i];
        if (posterRef) {
          const canvas = await html2canvas(posterRef, { useCORS: true, scale: 2 });
          images.push(canvas.toDataURL('image/jpeg', 0.9));
        }
      }
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Posters</title>
            <style>
              @page { size: A4 landscape; margin: 0; }
              body { margin: 0; padding: 0; box-sizing: border-box; background: #fff; }
              .page {
                width: 297mm;
                height: 210mm;
                page-break-after: always;
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: center;
                gap: 10mm;
                padding: 0;
                box-sizing: border-box;
              }
              .poster {
                width: 143.5mm;
                height: 210mm;
                object-fit: fill; /* Stretches the generated image to fit the height while accommodating the center margin */
              }
            </style>
          </head>
          <body>
            ${images.reduce((acc, img, i) => {
              if (i % 2 === 0) acc += '<div class="page">';
              acc += '<img src="' + img + '" class="poster" />';
              if (i % 2 === 1 || i === images.length - 1) acc += '</div>';
              return acc;
            }, '')}
            <script>
              // Adding a small delay to ensure images are loaded
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

    } catch (err) {
      console.error(err);
      toast.error("Failed to generate print");
      printWindow.close();
    } finally {
      setExporting(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString("default", { month: "long" })
  }));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleGenerate = async () => {
    setLoading(true);
    setStarData(null);

    try {
      const response = await axios.get(`/api/performance/star`, {
        params: {
          classId: selectedClass,
          month: selectedMonth,
          year: selectedYear,
          _t: Date.now()
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
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => (
                  <SelectItem key={c.value || c._id} value={c.value || c._id}>{c.label || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-sm font-medium flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-gray-500" />
            Poster Background Image (Optional)
          </label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleBgImageUpload}
            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-200 rounded-md p-1"
          />
        </div>

        <div className="flex gap-2 w-full">
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
            Calculate & Generate Poster
          </Button>

          {starData && Array.isArray(starData) && starData.length > 0 && (
            <Button 
              onClick={handlePrintAll}
              disabled={exporting}
              variant="outline"
              className="bg-white border-indigo-600 text-indigo-700 hover:bg-indigo-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
              Print All
            </Button>
          )}
        </div>

        {starData && Array.isArray(starData) && (
          <div className="mt-6 flex flex-col gap-10">
            {starData.map((data, index) => (
              <div key={index} className="flex flex-col gap-4">
                <div ref={el => posterRefs.current[index] = el} className="p-6 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-lg flex flex-col items-center justify-center relative overflow-hidden">
                  {bgImage ? (
                    <img src={bgImage} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0" crossOrigin="anonymous" />
                  ) : (
                    <>
                      {/* Decorative background elements */}
                      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-yellow-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
                      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
                    </>
                  )}
                  
                  {data.student ? (
                    <>
                      <div className="text-center z-10 w-full mb-2 border-b border-indigo-100/50 pb-2">
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest">{data.institutionName}</h2>
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
                          {data.student.profilePic ? (
                            <img 
                              src={data.student.profilePic} 
                              alt={data.student.name} 
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
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
                        <h2 className="text-2xl font-bold text-gray-900">{data.student.name}</h2>
                        <p className="text-gray-500 font-medium">{data.className}</p>
                      </div>

                      <div className="w-full bg-white/90 backdrop-blur-md rounded-xl p-5 shadow-sm border border-indigo-50 z-10" data-html2canvas-ignore="true">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                          <span className="font-semibold text-gray-700 tracking-wide uppercase text-xs">Total Score</span>
                          <span className="text-3xl font-black text-indigo-600 drop-shadow-sm">{data.totalScore} pts</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Regular Att.</span>
                            <span className="font-semibold">{data.breakdown.regularAttendance} pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Masjid Att.</span>
                            <span className="font-semibold">{data.breakdown.masjidAttendance} pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Literary Att.</span>
                            <span className="font-semibold">{data.breakdown.literaryAttendance} pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Remarks</span>
                            <span className="font-semibold">{data.breakdown.remarks} pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Performance</span>
                            <span className="font-semibold">{data.breakdown.performance} pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Leaves</span>
                            <span className="font-semibold">{data.breakdown.leaves} pts</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-6 pb-2 w-full flex flex-col items-center justify-center z-10">
                        <div className="px-6 py-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-full shadow-lg border-2 border-white transform hover:scale-105 transition-transform">
                          <span className="text-xl sm:text-2xl font-black tracking-widest uppercase text-indigo-900 drop-shadow-sm">
                            Congratulations!
                          </span>
                        </div>
                        <span className="mt-2 text-xs font-bold text-indigo-400 tracking-[0.2em] uppercase">Keep up the great work</span>
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center z-10">
                      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No performance data found for {data.className} in the selected month.</p>
                    </div>
                  )}
                </div>
                
                {data.student && (
                  <div className="flex justify-center gap-4 mt-2">
                    <Button 
                      onClick={() => handleDownload(index, data)} 
                      disabled={exporting}
                      className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    >
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                      Download JPEG
                    </Button>
                    <Button 
                      onClick={() => handleShare(index, data)} 
                      disabled={exporting}
                      className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    >
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                      Share Poster
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
