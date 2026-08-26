"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Edit3,
  X,
  Download,
  Printer,
  FileText,
  BookOpen,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
} from "lucide-react";
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
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyPrintStyles, removePrintStyles } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";
import Header from "@/components/Header";

const InstructionsComponent = ({ data = "", isInstructionsVisible = true, apiKey, readOnly = false }) => {
  const [instructions, setInstructions] = useState(data);
  const [originalInstructions, setOriginalInstructions] = useState(data);
  const [isVisible, setIsVisible] = useState(isInstructionsVisible);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { useUpdateItem } = useCrud("settings", apiKey);

  const updateItem = useUpdateItem();

  const printRef = useRef();
  const isMobile = useIsMobile();

  // Handle save instructions
  const handleSave = useCallback(async () => {
    try {
      setLoading(true);

      const data = await updateItem.mutateAsync({
        data: {
          instructions,
        },
      });

      setOriginalInstructions(instructions);
      setIsEditing(false);
      toast.success("Instructions updated successfully!");
    } catch (error) {
      console.error("Error saving instructions:", error);
      toast.error("Failed to save instructions");
    } finally {
      setLoading(false);
    }
  }, [instructions, apiKey]);

  // Handle cancel editing
  const handleCancel = useCallback(() => {
    setInstructions(originalInstructions);
    setIsEditing(false);
  }, [originalInstructions]);

  // Handle delete instructions
  const handleDelete = useCallback(async () => {
    try {
      setLoading(true);

      const data = await updateItem.mutateAsync({
        data: {
          instructions: "",
        },
      });

      setInstructions("");
      setOriginalInstructions("");
      setIsEditing(false);
      toast.success("Instructions deleted successfully!");
    } catch (error) {
      console.error("Error deleting instructions:", error);
      toast.error("Failed to delete instructions");
    } finally {
      setLoading(false);
    }
  }, [updateItem]);

  // Handle start editing
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setIsExpanded(true);
  }, []);

  // Handle text change
  const handleInstructionsChange = useCallback((e) => {
    setInstructions(e.target.value);
  }, []);

  // Check if there are unsaved changes
  const hasUnsavedChanges = instructions !== originalInstructions;

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Festival Instructions",
  });

  // Handle PDF download
  const handleDownloadPDF = useCallback(async () => {
    try {
      applyPrintStyles();

      const html2pdf = (await import("html2pdf.js")).default;
      const element = printRef.current;

      const options = {
        filename: "Festival_Instructions.pdf",
        margin: 0.5,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: {
          unit: "in",
          format: "a4",
          orientation: "portrait",
        },
      };

      await html2pdf().set(options).from(element).save();
      removePrintStyles();
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  }, []);

  const toggleVisibility = useCallback(async () => {
    try {
      const newVisibility = !isVisible;
      setIsVisible(newVisibility);
      
      await updateItem.mutateAsync({
        data: {
          isInstructionsVisible: newVisibility,
        },
      });
      
      toast.success(newVisibility ? "Instructions are now visible to Program Leaders" : "Instructions are now hidden from Program Leaders");
    } catch (error) {
      setIsVisible(isVisible); // revert on error
      toast.error("Failed to update visibility");
    }
  }, [isVisible, updateItem]);

  const actionControls = (
    <div className="flex items-center gap-2">
      {!isEditing && originalInstructions && !readOnly && (
        <Button
          variant="outline"
          size="sm"
          onClick={toggleVisibility}
          title={isVisible ? "Hide from Program Leaders" : "Show to Program Leaders"}
        >
          {isVisible ? (
            <>
              <Eye className="w-4 h-4 mr-1 text-green-600" />
              Visible
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 mr-1 text-red-600" />
              Hidden
            </>
          )}
        </Button>
      )}

      {!readOnly && !isEditing && (
        <>
          <Button variant="outline" onClick={handleEdit} size="sm">
            <Edit3 className="w-4 h-4 mr-1" />
            Edit
          </Button>
          {originalInstructions && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span>Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden">
                <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-destructive/5 dark:bg-destructive/10 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
                  <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 text-left space-y-0.5">
                    <AlertDialogTitle className="text-xl font-bold m-0 text-destructive">
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="m-0 text-sm text-muted-foreground">
                      This will permanently delete the festival instructions. This action cannot be undone.
                    </AlertDialogDescription>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="p-5 border-t bg-muted/20 flex justify-between gap-4 sm:space-x-0">
                  <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </>
      )}

      {!isEditing && (
        <Button
          onClick={isMobile ? handleDownloadPDF : handlePrint}
          size="sm"
        >
          {isMobile ? (
            <>
              <Download className="w-4 h-4 mr-1" />
              PDF
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 mr-1" />
              Print
            </>
          )}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="print:hidden">
        <Header
          title="FESTIVAL INSTRUCTIONS"
          subTitle="Guidelines and Important Information"
          rightAction={<div className="hidden md:block">{actionControls}</div>}
        />
      </div>

      {/* Header Controls - Hidden in Print */}
      <div className="print:hidden space-y-4">
        {/* Status Alerts */}
        {hasUnsavedChanges && isEditing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Remember to save your edits.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Controls for Mobile */}
        <div className="md:hidden flex items-center justify-end gap-3">
          {actionControls}
        </div>
      </div>

      {/* Main Content */}
      <div ref={printRef} className="space-y-4 sm:space-y-6 print:space-y-2 print:pt-4">
        <PrintHeader
          apiKey={apiKey}
          title="FESTIVAL INSTRUCTIONS"
          subtitle="Guidelines and Important Information"
          isFestival={true}
        />

        <div className="space-y-4 pt-2">
            {isEditing ? (
              <div className="space-y-4 print:hidden">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-5 h-5 text-primary" />
                  General Instructions
                </h2>
                <div className="space-y-2">
                  <Textarea
                    value={instructions}
                    onChange={handleInstructionsChange}
                    placeholder="Enter festival instructions and guidelines here...

Examples:
• Registration deadline and process
• Dress code requirements  
• Reporting time and venue details
• Contact information for queries
• Rules and regulations
• Prize distribution details
• Certificate collection information
• COVID-19 safety protocols
• Parking and transportation details"
                    className="min-h-[250px] sm:min-h-[350px] resize-y text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Use bullet points (•) or numbers for better readability
                  </p>
                </div>

                <div className="flex flex-row justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    size="sm"
                    disabled={loading}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading || !instructions.trim()}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {loading ? "Saving..." : "Save Instructions"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {readOnly && !isVisible ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <FileText className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">
                      Instructions Unavailable
                    </h3>
                    <p className="text-sm mb-4 px-4">
                      Instructions are currently hidden by the program committee.
                    </p>
                  </div>
                ) : (
                  <div>
                    {originalInstructions ? (
                      <div className="space-y-4">
                        {/* Instructions Content */}
                        <div className="bg-muted/30 p-4 sm:p-6 rounded-lg border-l-4 border-primary">
                          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-4 text-foreground">
                            <BookOpen className="w-5 h-5 text-primary" />
                            General Instructions
                          </h2>
                          <div 
                            className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed break-words font-google-sans"
                          >
                            {originalInstructions.split('\n').map((line, i, arr) => {
                              const trimmedLine = line.trim();
                              if (/^[a-zA-Z]\)/.test(trimmedLine)) {
                                return (
                                  <div key={i} className="font-bold text-lg md:text-xl mt-4 mb-2 text-foreground">
                                    {line}
                                  </div>
                                );
                              }
                              return (
                                <span key={i}>
                                  {line}
                                  {i < arr.length - 1 && <br />}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-12 text-muted-foreground">
                        <FileText className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-base sm:text-lg font-semibold mb-2">
                          No Instructions Added
                        </h3>
                        <p className="text-sm mb-4 px-4">
                          Add festival instructions to help participants
                          understand the guidelines and requirements.
                        </p>
                        {!readOnly && (
                          <Button onClick={handleEdit} size="sm">
                            <Edit3 className="w-4 h-4 mr-1" />
                            Add Instructions
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block text-center text-xs text-muted-foreground mt-8 pt-4 border-t">
        <p>
          Generated on {mounted ? new Date().toLocaleDateString() : ""} | Festival Instructions
        </p>
      </div>
    </div>
  );
};

export default InstructionsComponent;
