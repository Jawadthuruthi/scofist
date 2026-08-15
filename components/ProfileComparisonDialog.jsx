"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ArrowRight, Save, X, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDateShort } from "@/lib/utils";

export default function ProfileComparisonDialog({ student, open, onClose, onActionComplete }) {
  const [loading, setLoading] = useState(false);
  const [fieldActions, setFieldActions] = useState({}); // { [path]: "approve" | "reject" }
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && student?.pendingProfileUpdate) {
      // Initialize fieldActions as empty so admin must explicitly approve/reject
      setFieldActions({});
    }
  }, [open, student]);

  if (!student || !student.pendingProfileUpdate) return null;

  const oldData = student;
  const newData = student.pendingProfileUpdate;

  function getChangedFields(oldData, newData) {
    const changed = [];
    
    // Check top level
    ["name", "email", "contactNumber", "alternativeNumber", "dateOfBirth", "profilePic"].forEach(field => {
      if (newData[field] !== undefined && JSON.stringify(oldData[field]) !== JSON.stringify(newData[field])) {
        changed.push(field);
      }
    });

    // Check studentSpecificField
    if (newData.studentSpecificField) {
      Object.keys(newData.studentSpecificField).forEach(key => {
        const oldVal = oldData.studentSpecificField?.[key] || oldData[key];
        const newVal = newData.studentSpecificField[key];
        if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changed.push(`studentSpecificField.${key}`);
        }
      });
    }

    // Check teacherSpecificField
    if (newData.teacherSpecificField) {
      Object.keys(newData.teacherSpecificField).forEach(key => {
        const oldVal = oldData.teacherSpecificField?.[key] || oldData[key];
        const newVal = newData.teacherSpecificField[key];
        if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changed.push(`teacherSpecificField.${key}`);
        }
      });
    }

    // Check address
    if (newData.address) {
      Object.keys(newData.address).forEach(key => {
        const oldVal = oldData.address?.[key] || oldData[key];
        const newVal = newData.address[key];
        if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changed.push(`address.${key}`);
        }
      });
    }

    return changed;
  }

  const handleAction = async (action, overrideFields = null) => {
    let approvedFields = [];
    
    if (action === "approve") {
      const changedFields = getChangedFields(oldData, newData);
      const actionsTakenCount = Object.keys(fieldActions).length;
      
      if (overrideFields) {
        approvedFields = overrideFields;
      } else {
        approvedFields = Object.entries(fieldActions)
          .filter(([_, act]) => act === "approve")
          .map(([path, _]) => path);
      }



      // If everything was rejected, switch the action to "reject" for the API
      // so it sets the status correctly as Rejected
      if (approvedFields.length === 0 && !overrideFields) {
        const anyRejections = Object.values(fieldActions).some(act => act === "reject");
        if (anyRejections) {
          action = "reject";
        }
      }
    }

    setLoading(true);
    try {
      const response = await fetch("/api/users/profile-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: student._id,
          action: action,
          approvedFields: approvedFields
        })
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        toast.success(`Request ${action === "approve" ? "processed" : "rejected"} successfully`);
        onActionComplete();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.message || "Action failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const setAllActions = (action) => {
    const changed = getChangedFields(oldData, newData);
    const newActions = {};
    changed.forEach(path => {
      newActions[path] = action;
    });
    setFieldActions(newActions);
  };

  const ComparisonRow = ({ label, fieldPath, oldVal, newVal }) => {
    // Normalize for comparison (treat null/undefined/"" as same, serialize objects)
    const norm = (v) => {
      if (v === null || v === undefined) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v).trim();
    };
    const isChanged = norm(oldVal) !== norm(newVal);
    
    const currentAction = fieldActions[fieldPath];

    return (
      <div 
        className={`grid grid-cols-12 py-2 border-b last:border-0 items-start gap-2 transition-colors ${
          isChanged ? (currentAction === "approve" ? "bg-green-50/30 dark:bg-green-900/10" : "bg-red-50/30 dark:bg-red-900/10") : ""
        }`}
      >
        <div className="col-span-3 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2 pt-1">{label}</div>
        <div className="col-span-4 text-sm break-all text-muted-foreground pt-0.5">
          {typeof oldVal === 'object' && oldVal?.url ? (
            <img src={oldVal.url} alt="Old" className="h-10 w-10 object-cover rounded-md" crossOrigin="anonymous" />
          ) : typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal || "-")}
        </div>
        <div className="col-span-1 flex justify-center pt-1">
          {isChanged && <ArrowRight className={`h-4 w-4 ${currentAction === "approve" ? "text-green-500" : "text-red-500 opacity-30"}`} />}
        </div>
        <div className="col-span-4 flex flex-col gap-2 pt-0.5">
          <div className={`text-sm break-all font-medium ${
            isChanged 
              ? (currentAction === "approve" 
                  ? "text-green-600 dark:text-green-400" 
                  : currentAction === "reject"
                    ? "text-red-600 dark:text-red-400 opacity-60 line-through"
                    : "text-blue-600 dark:text-blue-400"
                ) 
              : ""
          }`}>
            {typeof newVal === 'object' && newVal?.url ? (
              <img src={newVal.url} alt="New" className="h-10 w-10 object-cover rounded-md" crossOrigin="anonymous" />
            ) : typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal || "-")}
          </div>
          {isChanged && (
            <div className="flex gap-2 pb-1">
              <Button
                variant={currentAction === "approve" ? "default" : "outline"}
                size="sm"
                className={`h-7 px-2 text-[10px] gap-1 ${currentAction === "approve" ? "bg-green-600 hover:bg-green-700" : "text-green-600 border-green-200"}`}
                onClick={() => setFieldActions(prev => ({ ...prev, [fieldPath]: "approve" }))}
              >
                <CheckCircle className="h-3 w-3" /> <span className="hidden sm:inline">{currentAction === "approve" ? "Approved" : "Approve"}</span>
              </Button>
              <Button
                variant={currentAction === "reject" ? "default" : "outline"}
                size="sm"
                className={`h-7 px-2 text-[10px] gap-1 ${currentAction === "reject" ? "bg-red-600 hover:bg-red-700" : "text-red-600 border-red-200"}`}
                onClick={() => setFieldActions(prev => ({ ...prev, [fieldPath]: "reject" }))}
              >
                <XCircle className="h-3 w-3" /> <span className="hidden sm:inline">{currentAction === "reject" ? "Rejected" : "Reject"}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl sm:rounded-2xl max-w-6xl max-h-[70vh] sm:max-h-[95vh] [&>button.absolute]:hidden grid grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden p-0 gap-0">
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-left space-y-0.5">
            <DialogTitle className="text-xl font-bold m-0">Review Profile Changes</DialogTitle>
            <p className="text-sm text-muted-foreground m-0">Review the profile modified fields.</p>
          </div>
          <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-2 pb-2 border-b-2 font-bold text-xs uppercase tracking-widest text-muted-foreground bg-slate-50 dark:bg-slate-900/50 p-4 px-6 z-10 shadow-sm">
          <div className="col-span-3 pl-2">Field</div>
          <div className="col-span-4">Current Value</div>
          <div className="col-span-1 text-center"></div>
          <div className="col-span-4">Requested Value</div>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-6 bg-background">

          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2 border-l-4 border-primary">Personal Details</h4>
            <ComparisonRow label="ID" fieldPath="_id" oldVal={oldData._id} newVal={oldData._id} />
            <ComparisonRow label="Photo" fieldPath="profilePic" oldVal={oldData.profilePic} newVal={newData.profilePic ?? oldData.profilePic} />
            <ComparisonRow label="Name" fieldPath="name" oldVal={oldData.name} newVal={newData.name ?? oldData.name} />
            <ComparisonRow label="DOB" fieldPath="dateOfBirth" oldVal={formatDateShort(oldData.dateOfBirth)} newVal={newData.dateOfBirth ? formatDateShort(newData.dateOfBirth) : formatDateShort(oldData.dateOfBirth)} />
            
            {/* Student Specific */}
            {(oldData.studentSpecificField || newData.studentSpecificField) && (
              <>
                <ComparisonRow label="Blood Group" fieldPath="studentSpecificField.bloodGroup" oldVal={oldData.studentSpecificField?.bloodGroup || oldData.bloodGroup} newVal={newData.studentSpecificField?.bloodGroup ?? (oldData.studentSpecificField?.bloodGroup || oldData.bloodGroup)} />
                <ComparisonRow label="Aadhar" fieldPath="studentSpecificField.aadharNo" oldVal={oldData.studentSpecificField?.aadharNo || oldData.aadharNo} newVal={newData.studentSpecificField?.aadharNo ?? (oldData.studentSpecificField?.aadharNo || oldData.aadharNo)} />
              </>
            )}

            {/* Teacher Specific */}
            {(oldData.teacherSpecificField || newData.teacherSpecificField) && (
              <>
                <ComparisonRow label="Joining Date" fieldPath="teacherSpecificField.dateOfJoining" oldVal={formatDateShort(oldData.teacherSpecificField?.dateOfJoining)} newVal={newData.teacherSpecificField?.dateOfJoining ? formatDateShort(newData.teacherSpecificField?.dateOfJoining) : formatDateShort(oldData.teacherSpecificField?.dateOfJoining)} />
              </>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2 border-l-4 border-primary">Contact Details</h4>
            <ComparisonRow label="Email" fieldPath="email" oldVal={oldData.email} newVal={newData.email ?? oldData.email} />
            <ComparisonRow label="Contact" fieldPath="contactNumber" oldVal={oldData.contactNumber} newVal={newData.contactNumber ?? oldData.contactNumber} />
            <ComparisonRow label="Alt. Contact" fieldPath="alternativeNumber" oldVal={oldData.alternativeNumber} newVal={newData.alternativeNumber ?? oldData.alternativeNumber} />
            
            {(oldData.studentSpecificField || newData.studentSpecificField) && (
              <>
                <ComparisonRow label="Guardian" fieldPath="studentSpecificField.guardianName" oldVal={oldData.studentSpecificField?.guardianName || oldData.guardianName} newVal={newData.studentSpecificField?.guardianName ?? (oldData.studentSpecificField?.guardianName || oldData.guardianName)} />
                <ComparisonRow label="Relationship" fieldPath="studentSpecificField.relationship" oldVal={oldData.studentSpecificField?.relationship || oldData.relationship} newVal={newData.studentSpecificField?.relationship ?? (oldData.studentSpecificField?.relationship || oldData.relationship)} />
                <ComparisonRow label="G. Contact" fieldPath="studentSpecificField.guardianContactNumber" oldVal={oldData.studentSpecificField?.guardianContactNumber || oldData.guardianContactNumber} newVal={newData.studentSpecificField?.guardianContactNumber ?? (oldData.studentSpecificField?.guardianContactNumber || oldData.guardianContactNumber)} />
                <ComparisonRow label="G. Alt. Contact" fieldPath="studentSpecificField.guardianAlternativeNumber" oldVal={oldData.studentSpecificField?.guardianAlternativeNumber || oldData.guardianAlternativeNumber} newVal={newData.studentSpecificField?.guardianAlternativeNumber ?? (oldData.studentSpecificField?.guardianAlternativeNumber || oldData.guardianAlternativeNumber)} />
              </>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2 border-l-4 border-primary">Address Details</h4>
            <ComparisonRow label="House" fieldPath="address.houseName" oldVal={oldData.address?.houseName || oldData.houseName} newVal={newData.address?.houseName ?? (oldData.address?.houseName || oldData.houseName)} />
            <ComparisonRow label="Place" fieldPath="address.place" oldVal={oldData.address?.place || oldData.place} newVal={newData.address?.place ?? (oldData.address?.place || oldData.place)} />
            <ComparisonRow label="Location Point" fieldPath="address.locationPoint" oldVal={oldData.address?.locationPoint || oldData.locationPoint} newVal={newData.address?.locationPoint ?? (oldData.address?.locationPoint || oldData.locationPoint)} />
            <ComparisonRow label="Post Office" fieldPath="address.postOffice" oldVal={oldData.address?.postOffice || oldData.postOffice} newVal={newData.address?.postOffice ?? (oldData.address?.postOffice || oldData.postOffice)} />
            <ComparisonRow label="District" fieldPath="address.district" oldVal={oldData.address?.district || oldData.district} newVal={newData.address?.district ?? (oldData.address?.district || oldData.district)} />
            <ComparisonRow label="State" fieldPath="address.state" oldVal={oldData.address?.state || oldData.state} newVal={newData.address?.state ?? (oldData.address?.state || oldData.state)} />
            <ComparisonRow label="PIN" fieldPath="address.pin" oldVal={oldData.address?.pin || oldData.pin} newVal={newData.address?.pin ?? (oldData.address?.pin || oldData.pin)} />
          </div>

          {student.status === "Graduated" && (
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2 border-l-4 border-primary">Academic Details</h4>
              <ComparisonRow label="Admission No" fieldPath="studentSpecificField.admissionNumber" oldVal={oldData.studentSpecificField?.admissionNumber || oldData.admissionNumber} newVal={newData.studentSpecificField?.admissionNumber ?? (oldData.studentSpecificField?.admissionNumber || oldData.admissionNumber)} />
              <ComparisonRow label="Islamic Qual." fieldPath="studentSpecificField.islamicQualification" oldVal={oldData.studentSpecificField?.islamicQualification || oldData.islamicQualification} newVal={newData.studentSpecificField?.islamicQualification ?? (oldData.studentSpecificField?.islamicQualification || oldData.islamicQualification)} />
              <ComparisonRow label="Academic Qual." fieldPath="studentSpecificField.academicQualification" oldVal={oldData.studentSpecificField?.academicQualification || oldData.academicQualification} newVal={newData.studentSpecificField?.academicQualification ?? (oldData.studentSpecificField?.academicQualification || oldData.academicQualification)} />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-background">
          <DialogFooter className="gap-3 sm:gap-0">
            <div className="flex-1 text-xs text-muted-foreground italic">
              * Select an action for each modified field to save changes.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button disabled={loading} onClick={() => handleAction("approve")} className="gap-2 bg-blue-600 hover:bg-blue-700 min-w-[150px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Selected Changes
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
