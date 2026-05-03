"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatDateShort } from "@/lib/utils";

export default function ProfileComparisonDialog({ student, open, onClose, onActionComplete }) {
  const [loading, setLoading] = useState(false);

  if (!student || !student.pendingProfileUpdate) return null;

  const oldData = student;
  const newData = student.pendingProfileUpdate;

  const handleAction = async (action) => {
    setLoading(true);
    try {
      const response = await fetch("/api/users/profile-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: student._id,
          action: action
        })
      });

      if (response.ok) {
        toast.success(`Request ${action === "approve" ? "approved" : "rejected"} successfully`);
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

  const ComparisonRow = ({ label, oldVal, newVal }) => {
    const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
    if (!isChanged && !oldVal && !newVal) return null;

    return (
      <div className={`grid grid-cols-12 py-3 border-b last:border-0 items-center gap-2 ${isChanged ? "bg-yellow-50/30 dark:bg-yellow-900/10" : ""}`}>
        <div className="col-span-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="col-span-4 text-sm break-all">{typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal || "-")}</div>
        <div className="col-span-1 flex justify-center">
          {isChanged && <ArrowRight className="h-4 w-4 text-blue-500" />}
        </div>
        <div className={`col-span-4 text-sm break-all font-medium ${isChanged ? "text-blue-600 dark:text-blue-400" : ""}`}>
          {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal || "-")}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between pr-8">
            Review Profile Changes
            <span className="text-sm font-normal text-muted-foreground">ID: {student._id}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-12 gap-2 pb-2 border-b-2 font-bold text-xs uppercase tracking-widest text-muted-foreground">
            <div className="col-span-3">Field</div>
            <div className="col-span-4">Current Value</div>
            <div className="col-span-1"></div>
            <div className="col-span-4">Requested Value</div>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-tighter mb-2">Personal Details</h4>
            <ComparisonRow label="Name" oldVal={oldData.name} newVal={newData.name} />
            <ComparisonRow label="DOB" oldVal={formatDateShort(oldData.dateOfBirth)} newVal={formatDateShort(newData.dateOfBirth)} />
            <ComparisonRow label="Blood Group" oldVal={oldData.studentSpecificField?.bloodGroup || oldData.bloodGroup} newVal={newData.studentSpecificField?.bloodGroup || newData.bloodGroup} />
            <ComparisonRow label="Aadhar" oldVal={oldData.studentSpecificField?.aadharNo || oldData.aadharNo} newVal={newData.studentSpecificField?.aadharNo || newData.aadharNo} />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-tighter mb-2">Contact Information</h4>
            <ComparisonRow label="Email" oldVal={oldData.email} newVal={newData.email} />
            <ComparisonRow label="Contact" oldVal={oldData.contactNumber} newVal={newData.contactNumber} />
            <ComparisonRow label="Alt. Contact" oldVal={oldData.alternativeNumber} newVal={newData.alternativeNumber} />
            <ComparisonRow label="Guardian" oldVal={oldData.studentSpecificField?.guardianName || oldData.guardianName} newVal={newData.studentSpecificField?.guardianName || newData.guardianName} />
            <ComparisonRow label="Relationship" oldVal={oldData.studentSpecificField?.relationship || oldData.relationship} newVal={newData.studentSpecificField?.relationship || newData.relationship} />
            <ComparisonRow label="G. Contact" oldVal={oldData.studentSpecificField?.guardianContactNumber || oldData.guardianContactNumber} newVal={newData.studentSpecificField?.guardianContactNumber || newData.guardianContactNumber} />
            <ComparisonRow label="G. Alt. Contact" oldVal={oldData.studentSpecificField?.guardianAlternativeNumber || oldData.guardianAlternativeNumber} newVal={newData.studentSpecificField?.guardianAlternativeNumber || newData.guardianAlternativeNumber} />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-tighter mb-2">Address Details</h4>
            <ComparisonRow label="House" oldVal={oldData.address?.houseName || oldData.houseName} newVal={newData.address?.houseName || newData.houseName} />
            <ComparisonRow label="Place" oldVal={oldData.address?.place || oldData.place} newVal={newData.address?.place || newData.place} />
            <ComparisonRow label="Location Point" oldVal={oldData.address?.locationPoint || oldData.locationPoint} newVal={newData.address?.locationPoint || newData.locationPoint} />
            <ComparisonRow label="Post Office" oldVal={oldData.address?.postOffice || oldData.postOffice} newVal={newData.address?.postOffice || newData.postOffice} />
            <ComparisonRow label="District" oldVal={oldData.address?.district || oldData.district} newVal={newData.address?.district || newData.district} />
            <ComparisonRow label="State" oldVal={oldData.address?.state || oldData.state} newVal={newData.address?.state || newData.state} />
            <ComparisonRow label="PIN" oldVal={oldData.address?.pin || oldData.pin} newVal={newData.address?.pin || newData.pin} />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-tighter mb-2">Academic Information</h4>
            <ComparisonRow label="Admission No" oldVal={oldData.studentSpecificField?.admissionNumber || oldData.admissionNumber} newVal={newData.studentSpecificField?.admissionNumber || newData.admissionNumber} />
            <ComparisonRow label="Islamic Qual." oldVal={oldData.studentSpecificField?.islamicQualification || oldData.islamicQualification} newVal={newData.studentSpecificField?.islamicQualification || newData.islamicQualification} />
            <ComparisonRow label="Academic Qual." oldVal={oldData.studentSpecificField?.academicQualification || oldData.academicQualification} newVal={newData.studentSpecificField?.academicQualification || newData.academicQualification} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={loading} onClick={() => handleAction("reject")} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
          <Button disabled={loading} onClick={() => handleAction("approve")} className="gap-2 bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Approve & Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
