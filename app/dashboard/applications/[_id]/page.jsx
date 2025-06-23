"use client";
import React, { useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import PrintHeader from "@/components/PrintHeader";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useReactToPrint } from "react-to-print";

const ApplicationDisplayPage = () => {
  // Sample data - replace with actual props or API data
  const applicationData = {
    name: "Ahmed Hassan",
    profilePic: {
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      publicId: "sample_id_123",
    },
    dateOfBirth: new Date("1998-05-15"),
    address: {
      houseName: "Al-Noor Villa",
      place: "Kozhikode",
      postOffice: "Calicut University P.O",
      district: "Kozhikode",
      state: "Kerala",
      pin: "673635",
    },
    guardianName: "Mohammed Hassan",
    guardianContactNumber: "+91-9876543210",
    guardianAlternativeNumber: "+91-8765432109",
    relationship: "Father",
    sslcRegistrationNumber: "KL2016123456",
    sslcGraduationYear: 2016,
    islamicEducationQualification: "Dars-e-Nizami, Jamia Nooriyya",
    academicEducationQualification: "Bachelor of Arts, Calicut University",
    status: "Pending",
  };

  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const searchParams = useSearchParams();

  const queryParams = useMemo(
    () => ({
      apiKey: searchParams.get("apiKey"),
    }),
    [searchParams]
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center py-4">
      {/* A4 Container */}
      <div
        className="bg-white shadow-lg border border-gray-200 print:fixed print:top-0 print:left-0 print:right-0 print:z-[9999] print:bg-white"
        style={{
          width: "210mm",
          minHeight: "297mm",
          maxWidth: "210mm",
          padding: "15mm",
          fontSize: "11px",
          lineHeight: "1.3",
        }}
        ref={printRef}
      >
        {/* College Header Section */}
        <PrintHeader apiKey={queryParams.apiKey} />

        {/* Application Content */}
        <div className="space-y-4">
          {/* Personal Information Header with Photo */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1">
                  PERSONAL INFORMATION
                </h3>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(applicationData.status)} text-xs px-2 py-1`}
                >
                  {applicationData.status}
                </Badge>
              </div>
            </div>
            <Avatar className="h-16 w-16 border-2 border-gray-300">
              <AvatarImage
                src={applicationData.profilePic?.url}
                alt={applicationData.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold">
                {getInitials(applicationData.name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Personal Details Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
            <div>
              <span className="font-semibold text-gray-700">Name:</span>
              <span className="ml-2 text-gray-900">{applicationData.name}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">
                Date of Birth:
              </span>
              <span className="ml-2 text-gray-900">
                {formatDate(applicationData.dateOfBirth)}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">
                Guardian Name:
              </span>
              <span className="ml-2 text-gray-900">
                {applicationData.guardianName || "N/A"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Relationship:</span>
              <span className="ml-2 text-gray-900">
                {applicationData.relationship || "N/A"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">
                Primary Contact:
              </span>
              <span className="ml-2 text-gray-900">
                {applicationData.guardianContactNumber || "N/A"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">
                Alternative Contact:
              </span>
              <span className="ml-2 text-gray-900">
                {applicationData.guardianAlternativeNumber || "N/A"}
              </span>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Address Information */}
          <div className="mb-4">
            <h3 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-3">
              ADDRESS DETAILS
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <span className="font-semibold text-gray-700">House Name:</span>
                <span className="ml-2 text-gray-900">
                  {applicationData.address.houseName || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Place:</span>
                <span className="ml-2 text-gray-900">
                  {applicationData.address.place}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">
                  Post Office:
                </span>
                <span className="ml-2 text-gray-900">
                  {applicationData.address.postOffice || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">District:</span>
                <span className="ml-2 text-gray-900">
                  {applicationData.address.district}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">State:</span>
                <span className="ml-2 text-gray-900">
                  {applicationData.address.state}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">PIN Code:</span>
                <span className="ml-2 text-gray-900">
                  {applicationData.address.pin || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Educational Information */}
          <div className="mb-4">
            <h3 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-3">
              EDUCATIONAL QUALIFICATIONS
            </h3>

            {/* SSLC Details */}
            <div className="mb-3">
              <h4 className="font-semibold text-gray-800 text-sm mb-2">
                SSLC Details:
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 pl-4">
                <div>
                  <span className="font-medium text-gray-700">
                    Registration Number:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData.sslcRegistrationNumber || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Graduation Year:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData.sslcGraduationYear}
                  </span>
                </div>
              </div>
            </div>

            {/* Islamic Education */}
            <div className="mb-3">
              <h4 className="font-semibold text-gray-800 text-sm mb-1">
                Islamic Education:
              </h4>
              <div className="pl-4">
                <p className="text-gray-900">
                  {applicationData.islamicEducationQualification || "N/A"}
                </p>
              </div>
            </div>

            {/* Academic Education */}
            <div className="mb-3">
              <h4 className="font-semibold text-gray-800 text-sm mb-1">
                Academic Education:
              </h4>
              <div className="pl-4">
                <p className="text-gray-900">
                  {applicationData.academicEducationQualification || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="mt-8 pt-4 border-t border-gray-300 space-y-2">
            <h3 className="text-center text-base font-bold text-gray-800">
              Declaration
            </h3>
            <p className="text-justify">
              I do hereby declare that the details given above are correct and
              that I shall abide by the rules and regulations of the
              institution.
            </p>
            <div className="flex">
              <div className="flex w-1/2 justify-between font-bold">
                <span>Date</span> <span>:</span>
              </div>
            </div>
            <div className="flex">
              <div className="flex w-1/2 justify-between font-bold">
                <span>Name and Signature of the Applicant</span> <span>:</span>
              </div>
            </div>
            <div className="flex">
              <div className="flex w-1/2 justify-between font-bold">
                <span>Name and Signature of the Guardian</span> <span>:</span>
              </div>
            </div>
            <h3 className="text-center text-base font-bold text-gray-800">
              Approval
            </h3>
            <p>
              The Applicant have been given provisional admission to this
              Institution
            </p>
            <div className="flex">
              <div className="font-bold w-full">Class Admitted:</div>
              <div className="font-bold w-1/3">Principal:</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-end">
        <Button
          variant="outline"
          onClick={handlePrint}
          className="order-2 sm:order-1"
        >
          Print
        </Button>
        <Button variant="outline" className="order-1 sm:order-2">
          Edit
        </Button>
        {applicationData.status === "Pending" && (
          <>
            <Button variant="destructive">Reject</Button>
            <Button className="bg-green-600 hover:bg-green-700">Approve</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ApplicationDisplayPage;
