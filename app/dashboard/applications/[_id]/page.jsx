"use client";
import React, { useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import PrintHeader from "@/components/PrintHeader";
import { useReactToPrint } from "react-to-print";
import { useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import useCrud from "@/hooks/use-crud";
import { Loader2 } from "lucide-react";

const ApplicationDisplayPage = () => {
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const params = useParams();
  const searchParams = useSearchParams();

  const _id = params._id;

  const queryParams = useMemo(
    () => ({
      apiKey: searchParams.get("apiKey"),
    }),
    [searchParams]
  );

  const { useFetchItems, useUpdateItem } = useCrud(
    "applications",
    queryParams.apiKey
  );
  const fetchApplicationQuery = useFetchItems(null, null, {
    _id,
  });

  const updateApplication = useUpdateItem();

  const applicationData = useMemo(
    () => fetchApplicationQuery.data?.applications[0],
    [fetchApplicationQuery.data]
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

  const handleApprove = async () => {
    await updateApplication.mutateAsync({ data: { _id, status: "Approved" } });
  };

  const handleReject = async () => {
    await updateApplication.mutateAsync({ data: { _id, status: "Rejected" } });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-2 px-2 sm:py-4 sm:px-4">
      {/* A4 Container - Responsive */}
      {applicationData ? (
        <div
          className="bg-white shadow-lg border border-gray-200 print:shadow-none print:border-none w-full max-w-[210mm] mx-auto text-xxs md:text-xs lg:text-sm print:text-sm"
          style={{
            minHeight: "297mm",
            padding: "12mm 15mm",
            lineHeight: "1.2",
          }}
          ref={printRef}
        >
          {/* College Header Section */}
          <div className="hidden md:block print:block">
            <PrintHeader apiKey={queryParams.apiKey} displayOnScreen={true} />
          </div>

          {/* Application Content */}
          <div className="space-y-3">
            {/* Personal Information Header with Photo */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-sm md:text-base lg:text-xl print:text-xl font-bold text-gray-800 border-b border-gray-400 pb-1">
                    PERSONAL INFORMATION
                  </h3>
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(applicationData?.status)} print:hidden text-xs md:text-sm lg:text-base print:text-base px-2 py-1`}
                  >
                    {applicationData?.status}
                  </Badge>
                </div>
              </div>
              <Avatar className="h-14 w-14 border-2 border-gray-300 flex-shrink-0">
                <AvatarImage
                  src={applicationData?.profilePic?.url}
                  alt={applicationData?.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-xs md:text-sm lg:text-base print:text-base">
                  {getInitials(applicationData?.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Personal Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-3">
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Full Name:
                </span>
                <span className="ml-2 text-gray-900 break-words">
                  {applicationData?.name}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Date of Birth:
                </span>
                <span className="ml-2 text-gray-900">
                  {formatDate(applicationData?.dateOfBirth)}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Guardian Name:
                </span>
                <span className="ml-2 text-gray-900 break-words">
                  {applicationData?.guardianName || "N/A"}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Relationship:
                </span>
                <span className="ml-2 text-gray-900">
                  {applicationData?.relationship || "N/A"}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Primary Contact:
                </span>
                <span className="ml-2 text-gray-900">
                  {applicationData?.guardianContactNumber || "N/A"}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Alternative Contact:
                </span>
                <span className="ml-2 text-gray-900">
                  {applicationData?.guardianAlternativeNumber || "N/A"}
                </span>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Address Information */}
            <div className="mb-3">
              <h3 className="text-sm md:text-base lg:text-xl print:text-xl font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">
                ADDRESS DETAILS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    House Name:
                  </span>
                  <span className="ml-2 text-gray-900 break-words">
                    {applicationData?.address.houseName || "N/A"}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    Place:
                  </span>
                  <span className="ml-2 text-gray-900 break-words">
                    {applicationData?.address.place}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    Post Office:
                  </span>
                  <span className="ml-2 text-gray-900 break-words">
                    {applicationData?.address.postOffice || "N/A"}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    District:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData?.address.district}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    State:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData?.address.state}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    PIN Code:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData?.address.pin || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Academic Information */}
            <div className="mb-3">
              <h3 className="text-sm md:text-base lg:text-xl print:text-xl font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">
                ACADEMIC EDUCATION
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-2">
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    Admission Class:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData?.admissionClass || "N/A"}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    Academic Stream:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData?.academicStream || "N/A"}
                  </span>
                </div>
              </div>
              {/* SSLC Details */}
              <div className="mb-2">
                <h4 className="font-semibold text-gray-800 text-xs md:text-sm lg:text-base print:text-base mb-1">
                  SSLC Details:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-3">
                  <div className="flex flex-wrap">
                    <span className="font-medium text-gray-700 min-w-fit">
                      Registration Number:
                    </span>
                    <span className="ml-2 text-gray-900 break-all">
                      {applicationData?.sslcRegistrationNumber || "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-wrap">
                    <span className="font-medium text-gray-700 min-w-fit">
                      Graduation Year:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {applicationData?.sslcGraduationYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* Islamic Education */}
              <div className="mb-2">
                <h4 className="font-semibold text-gray-800 text-xs md:text-sm lg:text-base print:text-base mb-1">
                  Islamic Education Qualification:
                </h4>
                <div className="pl-3">
                  <p className="text-gray-900 text-justify leading-tight">
                    {applicationData?.islamicEducationQualification || "N/A"}
                  </p>
                </div>
              </div>

              {/* Academic Education */}
              <div className="mb-2">
                <h4 className="font-semibold text-gray-800 text-xs md:text-sm lg:text-base print:text-base mb-1">
                  Academic Education Qualification:
                </h4>
                <div className="pl-3">
                  <p className="text-gray-900 text-justify leading-tight">
                    {applicationData?.academicEducationQualification || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-2" />

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
                  <span>Name and Signature of the Applicant</span>{" "}
                  <span>:</span>
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
      ) : fetchApplicationQuery.isLoading ? (
        <Loader2 />
      ) : (
        <div className="flex justify-center items-center h-full">
          <h1 className="text-2xl font-bold">Application Not Found</h1>
        </div>
      )}

      {/* Action Buttons - Hidden during print */}
      {applicationData && (
        <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center print:hidden w-full max-w-[210mm]">
          <Button
            variant="default"
            onClick={handlePrint}
            className="order-2 sm:order-1"
          >
            Print Application
          </Button>

          {applicationData?.status === "Pending" ? (
            <>
              <Button
                disabled={updateApplication.isPending}
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
              >
                Approve Application
              </Button>
              <Button
                variant="destructive"
                disabled={updateApplication.isPending}
                onClick={handleReject}
              >
                Reject Application
              </Button>
            </>
          ) : applicationData?.status === "Approved" ? (
            <Button
              variant="destructive"
              disabled={updateApplication.isPending}
              onClick={handleReject}
            >
              Reject Application
            </Button>
          ) : applicationData?.status === "Rejected" ? (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={updateApplication.isPending}
              onClick={handleApprove}
            >
              Approve Application
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={updateApplication.isPending}
              onClick={handleApprove}
            >
              Approve Application
            </Button>
          )}
        </div>
      )}

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 0;
          }

          .print\\:shadow-none {
            box-shadow: none !important;
          }

          .print\\:border-none {
            border: none !important;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ApplicationDisplayPage;
