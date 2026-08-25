"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Trophy, Loader2, Download, Share2, ImagePlus, Printer, Image as ImageIcon, X } from "lucide-react";
import html2canvas from "html2canvas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { useReactToPrint } from "react-to-print";
import PrintHeader from "@/components/PrintHeader";

export default function StarOfTheMonthModal({ classes = [] }) {
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [loading, setLoading] = useState(false);
  const [starData, setStarData] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
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

  const printTableRef = useRef(null);
  const printStarsTableRef = useRef(null);
  
  const handlePrintAction = useReactToPrint({
    content: () => printTableRef.current,
    contentRef: printTableRef,
    documentTitle: 'Star of the Month - Students List',
  });

  const handlePrintStarsAction = useReactToPrint({
    content: () => printStarsTableRef.current,
    contentRef: printStarsTableRef,
    documentTitle: 'Star of the Month - Top Stars',
  });

  const handlePrintTable = () => {
    if (!allStudents || allStudents.length === 0) {
      toast.error("No students to print");
      return;
    }
    handlePrintAction();
  };

  const handlePrintStars = () => {
    if (!starData || starData.length === 0) {
      toast.error("No stars to print");
      return;
    }
    handlePrintStarsAction();
  };

  const handlePrintAll = async () => {
    if (!filteredStarData || filteredStarData.length === 0) return;
    
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
      for (let i = 0; i < filteredStarData.length; i++) {
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
              @page { size: A4 portrait; margin: 0; }
              body { margin: 0; padding: 0; box-sizing: border-box; background: #fff; }
              .page {
                width: 210mm;
                page-break-after: always;
                break-after: page;
                padding: 5mm;
                box-sizing: border-box;
                overflow: hidden;
              }
              .poster {
                width: 95mm;
                height: 135mm;
                margin: 2.5mm;
                float: left;
                object-fit: fill;
              }
            </style>
          </head>
          <body>
            ${images.reduce((acc, img, i) => {
              if (i % 4 === 0) acc += '<div class="page">';
              acc += '<img src="' + img + '" class="poster" />';
              if (i % 4 === 3 || i === images.length - 1) acc += '</div>';
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

  const formatPoints = (pts) => {
    const value = Number(pts) || 0;
    if (value > 0) return <span className="font-semibold text-green-600">+{value} pts</span>;
    if (value < 0) return <span className="font-semibold text-red-500">{value} pts</span>;
    return <span className="font-semibold text-gray-700">{value} pts</span>;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setStarData(null);
    setAllStudents([]);

    try {
      const response = await axios.get(`/api/performance/star`, {
        params: {
          classId: 'all',
          month: selectedMonth,
          year: selectedYear,
          _t: Date.now()
        }
      });

      if (response.data.success) {
        let sortedData = response.data.data || [];
        if (classes && classes.length > 0) {
          const classOrderMap = new Map();
          classes.forEach((c, idx) => {
            classOrderMap.set((c.label || c.name), idx);
          });
          
          sortedData.sort((a, b) => {
            const indexA = classOrderMap.has(a.className) ? classOrderMap.get(a.className) : 9999;
            const indexB = classOrderMap.has(b.className) ? classOrderMap.get(b.className) : 9999;
            return indexA - indexB;
          });
        }
        setStarData(sortedData);
        setAllStudents(response.data.allStudents || []);
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

  useEffect(() => {
    if (open) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, open]);

  const filteredStudents = useMemo(() => {
    if (!allStudents) return [];
    if (selectedClass === 'all' || !selectedClass) return allStudents;
    return allStudents.filter(s => s.classId === selectedClass);
  }, [allStudents, selectedClass]);

  const filteredStarData = useMemo(() => {
    if (!starData) return null;
    if (selectedClass === 'all' || !selectedClass) return starData;
    return starData.filter(data => data.classId === selectedClass);
  }, [starData, selectedClass]);

  const currentMonthLabel = months.find(m => m.value === selectedMonth)?.label || '';
  const currentClassLabel = selectedClass === 'all' ? 'All Classes' : (classes.find(c => (c.value || c._id) === selectedClass)?.label || classes.find(c => (c.value || c._id) === selectedClass)?.name || '');

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setStarData(null); setAllStudents([]); setSelectedStudentForDetails(null); } }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-9 w-9 p-0 flex items-center justify-center shrink-0" title="Star of the Month">
            <Star className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      
      <DialogContent className="rounded-2xl sm:rounded-2xl max-w-3xl max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0">
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
            <div className="p-2 rounded-lg bg-primary/10 transition-colors">
              <Star className="h-5 w-5 text-primary fill-primary" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0 text-foreground">
                Star of the Month
              </DialogTitle>
              <DialogDescription className="m-0">
                Top performer of the month.
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
        </DialogHeader>
        
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 pb-0 pt-1">
          <div className="space-y-1 md:space-y-2 col-span-1">
            <label className="text-xs md:text-sm font-medium">Year</label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent className="max-h-96 overflow-y-auto">
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1 md:space-y-2 col-span-1">
            <label className="text-xs md:text-sm font-medium">Month</label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent className="max-h-96 overflow-y-auto">
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-2">
            <label className="text-xs md:text-sm font-medium">Class</label>
            <div className="flex gap-1 md:gap-2">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent className="max-h-96 overflow-y-auto">
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.value || c._id} value={c.value || c._id}>{c.label || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredStudents && filteredStudents.length > 0 && (
                <Button 
                  onClick={handlePrintTable}
                  className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 shrink-0 px-3 md:px-4"
                  title="Print Table"
                >
                  <Printer className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Print</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 md:gap-2 mb-4">
          <label className="text-xs md:text-sm font-medium flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-gray-500" />
            Poster Background Image (Optional)
          </label>
          <div className="flex flex-row items-center gap-1 md:gap-2 w-full">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleBgImageUpload}
              className="text-xs md:text-sm file:mr-1 md:file:mr-4 file:py-1 md:file:py-2 file:px-2 md:file:px-4 file:rounded-md file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-200 rounded-md p-1 flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
            />
            <div className="flex flex-row gap-2 shrink-0">
              <Button 
                onClick={handlePrintAll}
                disabled={exporting || !filteredStarData || filteredStarData.length === 0}
                variant="outline"
                className="bg-white border-indigo-600 text-indigo-700 hover:bg-indigo-50 h-9 w-9 p-0 md:h-10 md:w-auto md:px-4 md:py-2 flex items-center justify-center shrink-0"
                title="Print Posters"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <ImageIcon className="h-4 w-4 md:mr-2" />}
                <span className="hidden md:inline">Posters</span>
              </Button>
              <Button 
                onClick={handlePrintStars}
                disabled={exporting || !filteredStarData || filteredStarData.length === 0}
                variant="outline"
                className="bg-white border-indigo-600 text-indigo-700 hover:bg-indigo-50 h-9 w-9 p-0 md:h-10 md:w-auto md:px-4 md:py-2 flex items-center justify-center shrink-0"
                title="Print Stars"
              >
                <Star className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Stars</span>
              </Button>
            </div>
          </div>
        </div>

        {filteredStudents && filteredStudents.length > 0 && (
          <div ref={printTableRef} className="w-full print:bg-white print:text-black print:p-8">
            <PrintHeader 
              title={`Points of the Month - ${currentClassLabel} - ${currentMonthLabel} - ${selectedYear}`} 
            />
            
            <div className="overflow-x-auto overflow-y-auto max-h-96 mt-0 mb-6 border rounded-lg print:border-none print:overflow-visible print:max-h-none">
              <table className="w-full text-sm text-left border-collapse print:border print:border-gray-300">
                <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 print:static">
                  <tr>
                    <th className="pl-4 pr-2 py-2 w-12 leading-tight print:border print:border-gray-300">Sl<br/>No</th>
                    <th className="px-2 py-2 print:border print:border-gray-300">Name</th>
                    <th className="px-4 py-2 print:hidden">Class</th>
                    <th className="px-4 py-2 text-center print:border print:border-gray-300">Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredStudents].sort((a,b) => b.totalScore - a.totalScore).map((s, idx) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50 print:border print:border-gray-300">
                      <td className="pl-4 pr-2 py-2 print:border print:border-gray-300">{idx + 1}</td>
                      <td className="px-2 py-2 font-medium print:border print:border-gray-300">{s.name} <span className="text-gray-500 text-xs">({s.admnNo})</span></td>
                      <td className="px-4 py-2 print:hidden">{s.className}</td>
                      <td className="px-4 py-2 text-center print:border print:border-gray-300">
                        <button 
                           onClick={() => setSelectedStudentForDetails(s)}
                           className={`${s.totalScore > 0 ? 'text-green-600 hover:text-green-800 bg-green-50' : s.totalScore < 0 ? 'text-red-600 hover:text-red-800 bg-red-50' : 'text-gray-600 hover:text-gray-800 bg-gray-50'} hover:underline font-bold px-2 py-1 rounded print:p-0 print:bg-transparent`}
                        >
                          {s.totalScore > 0 ? '+' : ''}{s.totalScore}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredStarData && Array.isArray(filteredStarData) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {filteredStarData.map((data, index) => (
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
                      <div className="relative text-center z-10 w-full mb-2 border-b border-indigo-100/50 pb-2">
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest">{data.institutionName}</h2>
                      </div>

                      <div className="relative text-center z-10 mb-4 mt-2">
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
                        <div className="absolute -top-2 -left-2 bg-yellow-500 text-white w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                          <Star className="h-5 w-5 fill-white text-white" />
                        </div>
                      </div>

                      <div className="relative text-center z-10 space-y-1 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">{data.student.name}</h2>
                        <p className="text-gray-500 font-medium">{data.className}</p>
                      </div>

                      <div className="relative w-full bg-white/90 backdrop-blur-md rounded-xl p-5 shadow-sm border border-indigo-50 z-10">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-700 tracking-wide uppercase text-xs">Total Score</span>
                          <span className={`text-xl md:text-2xl font-black drop-shadow-sm ${data.totalScore > 0 ? 'text-green-600' : data.totalScore < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                            {data.totalScore > 0 ? '+' : ''}{data.totalScore} pts
                          </span>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 gap-y-2 text-sm" data-html2canvas-ignore="true">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Class Attendance</span>
                            {formatPoints(data.breakdown.regularAttendance)}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Masjid Attendance</span>
                            {formatPoints(data.breakdown.masjidAttendance)}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Literary Attendance</span>
                            {formatPoints(data.breakdown.literaryAttendance)}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Remarks</span>
                            {formatPoints(data.breakdown.remarks)}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Performance</span>
                            {formatPoints(data.breakdown.performance)}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Leaves</span>
                            {formatPoints(data.breakdown.leaves)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative mt-auto pt-6 pb-2 w-full flex flex-col items-center justify-center z-10 text-center">
                        <div className="px-3 md:px-5 py-1.5 md:py-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-full shadow-lg border-2 border-white transform hover:scale-105 transition-transform">
                          <span className="text-base md:text-lg font-black tracking-wider uppercase text-indigo-900 drop-shadow-sm block">
                            Congratulations!
                          </span>
                        </div>
                        <span className="mt-2 text-[10px] md:text-xs font-bold text-indigo-400 tracking-wider md:tracking-widest uppercase text-center px-2">Keep up the great work</span>
                      </div>
                    </>
                  ) : (
                    <div className="relative py-10 text-center z-10">
                      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No performance data found for {data.className} in the selected month.</p>
                    </div>
                  )}
                </div>
                
                {data.student && (
                  <div className="flex flex-row flex-wrap justify-center gap-2 mt-2 w-full">
                    <Button 
                      onClick={() => handleDownload(index, data)} 
                      disabled={exporting}
                      className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex-1 min-w-[120px] text-xs px-2 md:text-sm md:px-4"
                    >
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1 md:mr-2" /> : <Download className="h-4 w-4 mr-1 md:mr-2" />}
                      Download
                    </Button>
                    <Button 
                      onClick={() => handleShare(index, data)} 
                      disabled={exporting}
                      className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex-1 min-w-[120px] text-xs px-2 md:text-sm md:px-4"
                    >
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1 md:mr-2" /> : <Share2 className="h-4 w-4 mr-1 md:mr-2" />}
                      Share
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Hidden Printable Table for Top Stars */}
        <div className="hidden print:block">
          <div ref={printStarsTableRef} className="w-full print:bg-white print:text-black print:p-8">
            <PrintHeader title={`Stars of the Month - ${currentMonthLabel} - ${selectedYear}`} />
            <table className="w-full text-sm text-left mt-6 border-collapse print:border print:border-gray-300">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="print:border print:border-gray-300 px-4 py-2 w-12 text-center">Sl No</th>
                  <th className="print:border print:border-gray-300 px-4 py-2">Class</th>
                  <th className="print:border print:border-gray-300 px-4 py-2">Name</th>
                  <th className="print:border print:border-gray-300 px-4 py-2 text-center">Points</th>
                </tr>
              </thead>
              <tbody>
                {filteredStarData && filteredStarData.map((data, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50 print:border print:border-gray-300">
                    <td className="print:border print:border-gray-300 px-4 py-2 text-center">{idx + 1}</td>
                    <td className="print:border print:border-gray-300 px-4 py-2">{data.className}</td>
                    <td className="print:border print:border-gray-300 px-4 py-2 font-medium">{data.student?.name} <span className="text-gray-500 text-xs">({data.student?.admnNo})</span></td>
                    <td className="print:border print:border-gray-300 px-4 py-2 text-center font-bold">
                      <span className={data.totalScore > 0 ? 'text-green-600' : data.totalScore < 0 ? 'text-red-600' : 'text-gray-600'}>
                        {data.totalScore > 0 ? '+' : ''}{data.totalScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStudentForDetails} onOpenChange={(open) => !open && setSelectedStudentForDetails(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-indigo-700">Point Details - {selectedStudentForDetails?.name}</DialogTitle>
          </DialogHeader>
          {selectedStudentForDetails && (
            <div className="space-y-3 py-4">
               <div className="flex flex-col border-b pb-2">
                 <div className="flex justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors" onClick={() => setExpandedDetail(expandedDetail === 'classAtt' ? null : 'classAtt')}>
                   <span className="text-gray-600">Class Attendance</span>
                   {formatPoints(selectedStudentForDetails.scores.regularAttendance)}
                 </div>
                 {expandedDetail === 'classAtt' && selectedStudentForDetails.details && (
                   <div className="text-sm bg-gray-50 p-2 rounded mt-1 text-gray-700">
                     Attendance Percentage: <span className="font-medium">{selectedStudentForDetails.details.attendance?.regular?.percentage?.toFixed(1) || 0}%</span>
                   </div>
                 )}
               </div>
               <div className="flex flex-col border-b pb-2">
                 <div className="flex justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors" onClick={() => setExpandedDetail(expandedDetail === 'masjidAtt' ? null : 'masjidAtt')}>
                   <span className="text-gray-600">Masjid Attendance</span>
                   {formatPoints(selectedStudentForDetails.scores.masjidAttendance)}
                 </div>
                 {expandedDetail === 'masjidAtt' && selectedStudentForDetails.details && (
                   <div className="text-sm bg-gray-50 p-2 rounded mt-1 text-gray-700">
                     Attendance Percentage: <span className="font-medium">{selectedStudentForDetails.details.attendance?.masjid?.percentage?.toFixed(1) || 0}%</span>
                   </div>
                 )}
               </div>
               <div className="flex flex-col border-b pb-2">
                 <div className="flex justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors" onClick={() => setExpandedDetail(expandedDetail === 'literaryAtt' ? null : 'literaryAtt')}>
                   <span className="text-gray-600">Literary Attendance</span>
                   {formatPoints(selectedStudentForDetails.scores.literaryAttendance)}
                 </div>
                 {expandedDetail === 'literaryAtt' && selectedStudentForDetails.details && (
                   <div className="text-sm bg-gray-50 p-2 rounded mt-1 text-gray-700">
                     Attendance Percentage: <span className="font-medium">{selectedStudentForDetails.details.attendance?.literary?.percentage?.toFixed(1) || 0}%</span>
                   </div>
                 )}
               </div>
               <div className="flex flex-col border-b pb-2">
                 <div className="flex justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors" onClick={() => setExpandedDetail(expandedDetail === 'remarks' ? null : 'remarks')}>
                   <span className="text-gray-600">Remarks</span>
                   {formatPoints(selectedStudentForDetails.scores.remarks)}
                 </div>
                 {expandedDetail === 'remarks' && selectedStudentForDetails.details && (
                     <div className="text-sm bg-gray-50 p-2 rounded mt-1 max-h-48 overflow-y-auto">
                       {selectedStudentForDetails.details.remarks?.length > 0 ? (
                         <ul className="space-y-2">
                           {selectedStudentForDetails.details.remarks.map((r, i) => (
                             <li key={i} className="flex flex-col border-b border-gray-200 last:border-0 pb-1">
                               <div className="flex justify-between">
                                 <span><span className="font-medium">{r.status}</span> <span className="text-xs text-gray-400">({new Date(r.date).toLocaleDateString()})</span></span>
                                 <span className={r.points > 0 ? "text-green-600" : "text-red-500"}>{r.points > 0 ? `+${r.points}` : r.points} pts</span>
                               </div>
                               {r.comments && <p className="text-xs text-gray-600 mt-0.5"><span className="font-semibold">Comment:</span> {r.comments}</p>}
                               {r.teacherName && <p className="text-xs text-gray-500"><span className="font-semibold">Teacher:</span> {r.teacherName}</p>}
                             </li>
                           ))}
                         </ul>
                     ) : (
                       <p className="text-gray-500 italic">No remarks in this month.</p>
                     )}
                   </div>
                 )}
               </div>
               <div className="flex flex-col border-b pb-2">
                 <div className="flex justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors" onClick={() => setExpandedDetail(expandedDetail === 'performance' ? null : 'performance')}>
                   <span className="text-gray-600">Performance</span>
                   {formatPoints(selectedStudentForDetails.scores.performance)}
                 </div>
                 {expandedDetail === 'performance' && selectedStudentForDetails.details && (
                     <div className="text-sm bg-gray-50 p-2 rounded mt-1 max-h-48 overflow-y-auto">
                       {selectedStudentForDetails.details.performance?.length > 0 ? (
                         <ul className="space-y-2">
                           {selectedStudentForDetails.details.performance.map((p, i) => (
                             <li key={i} className="flex flex-col border-b border-gray-200 last:border-0 pb-1">
                               <div className="flex justify-between">
                                 <span><span className="font-medium">{p.status}</span> <span className="text-xs text-gray-400">({new Date(p.date).toLocaleDateString()})</span></span>
                                 <span className={p.points > 0 ? "text-green-600" : "text-red-500"}>{p.points > 0 ? `+${p.points}` : p.points} pts</span>
                               </div>
                               {p.comments && <p className="text-xs text-gray-600 mt-0.5"><span className="font-semibold">Comment:</span> {p.comments}</p>}
                               {p.teacherName && <p className="text-xs text-gray-500"><span className="font-semibold">Teacher:</span> {p.teacherName}</p>}
                             </li>
                           ))}
                         </ul>
                     ) : (
                       <p className="text-gray-500 italic">No performance records in this month.</p>
                     )}
                   </div>
                 )}
               </div>
               <div className="flex flex-col border-b pb-2">
                 <div className="flex justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors" onClick={() => setExpandedDetail(expandedDetail === 'leaves' ? null : 'leaves')}>
                   <span className="text-gray-600">Leaves</span>
                   {formatPoints(selectedStudentForDetails.scores.leaves)}
                 </div>
                 {expandedDetail === 'leaves' && selectedStudentForDetails.details && (
                     <div className="text-sm bg-gray-50 p-2 rounded mt-1 max-h-48 overflow-y-auto">
                       <p className="text-xs text-gray-500 mb-1">Base score: 10 pts (lost if leaves taken)</p>
                       {selectedStudentForDetails.details.leaves?.length > 0 ? (
                         <ul className="space-y-2">
                           {selectedStudentForDetails.details.leaves.map((l, i) => (
                             <li key={i} className="flex flex-col border-b border-gray-200 last:border-0 pb-1">
                               <div className="flex justify-between">
                                 <span><span className="font-medium">{l.status}</span> <span className="text-xs text-gray-400">({new Date(l.date).toLocaleDateString()})</span></span>
                                 <span className={l.points > 0 ? "text-green-600" : "text-red-500"}>{l.points > 0 ? `+${l.points}` : l.points} pts</span>
                               </div>
                               {l.leaveReason && <p className="text-xs text-gray-600 mt-0.5"><span className="font-semibold">Reason:</span> {l.leaveReason}</p>}
                             </li>
                           ))}
                         </ul>
                     ) : (
                       <p className="text-green-600 italic">No leaves taken.</p>
                     )}
                   </div>
                 )}
               </div>
               <div className="flex justify-between pt-2 text-lg font-bold">
                 <span>Total Score</span>
                  <span className={selectedStudentForDetails.totalScore > 0 ? 'text-green-600' : selectedStudentForDetails.totalScore < 0 ? 'text-red-500' : 'text-gray-700'}>
                    {selectedStudentForDetails.totalScore > 0 ? '+' : ''}{selectedStudentForDetails.totalScore} pts
                  </span>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
