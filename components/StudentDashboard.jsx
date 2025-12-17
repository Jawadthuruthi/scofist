"use client";
import React, { useMemo, useState, useEffect } from "react";
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
import { Calendar } from "lucide-react";
import { formatDateForDisplay } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "./ui/button";
import { Printer } from "lucide-react";
import dynamic from "next/dynamic";
import { getStudentFormFields } from "@/lib/studentFormConfig";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const PopupForm = dynamic(() => import("./PopupForm"), {
  ssr: false,
});

const ProfileField = ({ label, value, isBold }) =>
  value || value === 0 ? (
    <div className="flex justify-between py-2 border-b border-border">
      <span className={`text-sm font-medium ${isBold ? 'font-bold' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`text-sm ${isBold ? 'font-bold' : 'text-foreground'}`}>{value}</span>
    </div>
  ) : null;

export default function StudentDashboard({
  user,
  apiKey,
  classes,
  batches,
  attendanceData: initialData,
}) {
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    if (new Date(user?.updatedAt) > new Date(currentUser?.updatedAt)) {
      setCurrentUser(user);
    }
  }, [user, currentUser?.updatedAt]);

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
  const [pendingFunds, setPendingFunds] = useState(null);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const { useUpdateItem } = useCrud("users", apiKey);
  const updateProfile = useUpdateItem();
  const router = useRouter();

  const handleProfileUpdate = async (values) => {
    try {
      const response = await updateProfile.mutateAsync({
        data: {
          ids: [currentUser._id],
          ...values,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
      setCurrentUser(response.updatedUser);
      toast.success("Profile updated successfully!");
      router.refresh();
      return true;
    } catch (error) {
      console.error("Profile update failed:", error);
      toast.error(error.message || "Failed to update profile");
      throw error;
    }
  };

  const formFields = useMemo(() => {
    const fields = getStudentFormFields(batches, classes);
    const readOnlyFields = [
      "roles",
      "batchId",
      "classId",
      "admissionClassId",
      "status",
      "admissionDate",
      "graduatedYear",
    ];
    return fields.map((field) => ({
      ...field,
      readOnly: readOnlyFields.includes(field.name) ? true : field.readOnly,
    }));
  }, [batches, classes]);

  const flatUser = useMemo(() => {
    if (!currentUser) return null;
    return {
      ...currentUser,
      ...(currentUser.address || {}),
      ...(currentUser.studentSpecificField || {}),
      // Ensure we have the IDs if the fields are populated objects
      batchId: currentUser.studentSpecificField?.batchId?._id || currentUser.studentSpecificField?.batchId,
      classId: currentUser.studentSpecificField?.classId?._id || currentUser.studentSpecificField?.classId,
      admissionClassId: currentUser.studentSpecificField?.admissionClassId?._id || currentUser.studentSpecificField?.admissionClassId,
    };
  }, [currentUser]);

  const className = classes.find(
    (c) => c._id === currentUser?.studentSpecificField?.classId
  )?.name;

  const admissionClassName = classes.find(
    (c) => c._id === currentUser?.studentSpecificField?.admissionClassId
  )?.name;

  const batchName = batches.find(
    (b) => b._id === currentUser?.studentSpecificField?.batchId
  )?.name;

  useEffect(() => {
    const fetchFunds = async () => {
      setFundsLoading(true);
      const fundsToFetch = [
        { name: "IT Lab Fund", teacherId: "655c48737c229973bf1f4648" },
        { name: "Stationary Fund", teacherId: "655c487f7c229973bf1f464a" },
        { name: "Coupon Fund", teacherId: "655c488a7c229973bf1f464c" },
      ];

      const classInfo = classes.find(
        (c) => c._id === currentUser?.studentSpecificField?.classId
      );
      if (classInfo?.teacherId) {
        fundsToFetch.push({ name: "Others", teacherId: classInfo.teacherId });
      }

      try {
        const fundPromises = fundsToFetch.map(({ teacherId }) =>
          fetch(`/api/studentsFund?studentId=${currentUser._id}&teacherId=${teacherId}&batchId=${currentUser.studentSpecificField.batchId}`, {
            headers: {
              "Content-Type": "application/json",
              "api-key": apiKey,
            },
          }).then(res => {
            if (!res.ok) {
              console.error(`Error fetching fund for teacher ${teacherId}: ${res.statusText}`);
              return { studentFund: { balance: 0 } };
            }
            return res.json();
          })
        );

        const results = await Promise.all(fundPromises);

        const funds = results.reduce((acc, result, index) => {
          const fundName = fundsToFetch[index].name;
          acc[fundName] = result.studentFund?.balance || 0;
          return acc;
        }, {});

        setPendingFunds(funds);
      } catch (error) {
        console.error("Error fetching pending funds:", error);
        setPendingFunds({});
      } finally {
        setFundsLoading(false);
      }
    };

    if (currentUser?._id && currentUser?.studentSpecificField?.batchId && apiKey) {
      fetchFunds();
    } else {
      setFundsLoading(false);
    }
  }, [currentUser, classes, apiKey]);


  const academicYears = useMemo(() => {
    if (!batchName) return [new Date().getFullYear()];
    const years = batchName.match(/\d{4}/g);
    if (!years) return [new Date().getFullYear()];
    const startYear = parseInt(years[0], 10);
    const endYear = years[1] ? parseInt(years[1], 10) : startYear + 1;
    const allYears = [];
    for (let year = startYear; year <= endYear; year++) {
      allYears.push(year);
    }
    return allYears;
  }, [batchName]);

  const attendanceHistory = useMemo(() => {
    const records = attendanceData?.[0]?.attendanceRecords || [];

    const allMonthsMeta = [];
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const date = new Date(selectedYear, monthIndex, 1);
      const monthName = date.toLocaleString("en-US", { month: "long" });
      allMonthsMeta.push({ year: selectedYear, monthIndex, monthName });
    }

    return allMonthsMeta.map(({ year, monthIndex, monthName }) => {
      const recordsForMonth = records
        ? records.filter((r) => {
          const d = new Date(r.date);
          return d.getFullYear() === year && d.getMonth() === monthIndex;
        })
        : [];

      const totalPeriods = recordsForMonth.length;
      const presentPeriods = recordsForMonth.filter((r) => r.present).length;

      const details = recordsForMonth.map((r) => ({
        date: formatDateForDisplay(r.date),
        present: r.present,
      }));

      return {
        month: monthName,
        totalPeriods,
        presentPeriods,
        details,
        percentage:
          totalPeriods > 0
            ? ((presentPeriods / totalPeriods) * 100).toFixed(2)
            : 0,
      };
    });
  }, [attendanceData, batchName, selectedYear]);

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

  const totalPending = useMemo(() => {
    if (!pendingFunds) return 0;
    return Object.values(pendingFunds).reduce((acc, balance) => acc + balance, 0);
  }, [pendingFunds]);


  return (
    <div className="flex flex-col space-y-4">
      <Header
        title="DASHBOARD"
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />

      {/* Profile Header */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24 rounded-lg">
              <AvatarImage src={currentUser?.profilePic?.url} alt={currentUser?.name} />
              <AvatarFallback>{currentUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold">{currentUser?.name}</h2>
              <p className="text-muted-foreground">Admission ID: {currentUser?._id}</p>
              {currentUser?.studentSpecificField?.status === "Active" && (
                <p className="text-muted-foreground">Class: {className}</p>
              )}
              <p className="text-muted-foreground">
                Status:{" "}
                <span
                  className={`px-2 py-1 rounded-md ${getStatusClass(
                    currentUser?.studentSpecificField?.status
                  )}`}
                >
                  {currentUser?.studentSpecificField?.status}
                </span>
              </p>
            </div>
          </div>
          <Button onClick={() => setIsEditProfileOpen(true)}>
            Verify Profile
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileField
              label="Date of Birth"
              value={formatDateForDisplay(currentUser?.dateOfBirth)}
            />
            <ProfileField
              label="Blood Group"
              value={currentUser?.studentSpecificField?.bloodGroup}
            />
            <ProfileField
              label="Aadhar No"
              value={currentUser?.studentSpecificField?.aadharNo}
            />
            {currentUser?.address && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  Address
                </span>
                <div className="text-sm text-foreground text-right">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Info</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileField label="Batch" value={batchName} />
            <ProfileField
              label="Admission Class"
              value={admissionClassName}
            />
            <ProfileField
              label="Admission Date"
              value={formatDateForDisplay(
                currentUser?.studentSpecificField?.admissionDate
              )}
            />
            <ProfileField
              label="Islamic Qualification"
              value={currentUser?.studentSpecificField?.islamicQualification}
            />
            <ProfileField
              label="Academic Qualification"
              value={currentUser?.studentSpecificField?.academicQualification}
            />
            <ProfileField
              label="Graduated Year"
              value={currentUser?.studentSpecificField?.graduatedYear}
            />
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileField label="Email" value={currentUser?.email} />
            <ProfileField label="Contact Number" value={currentUser?.contactNumber} />
            <ProfileField
              label="Alternative Number"
              value={currentUser?.alternativeNumber}
            />
            <ProfileField
              label="Guardian Name"
              value={currentUser?.studentSpecificField?.guardianName}
            />
            <ProfileField
              label="Guardian Contact"
              value={currentUser?.studentSpecificField?.guardianContactNumber}
            />
            <ProfileField
              label="Guardian Alt. Contact"
              value={currentUser?.studentSpecificField?.guardianAlternativeNumber}
            />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Pending Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {fundsLoading ? (
              <p>Loading funds...</p>
            ) : pendingFunds ? (
              <>
                {Object.entries(pendingFunds).map(([fund, balance]) => (
                  <ProfileField key={fund} label={fund} value={balance.toFixed(2)} />
                ))}
                <ProfileField label="Total Pending" value={totalPending.toFixed(2)} isBold={true} />

              </>
            ) : (
              <p>Could not load pending funds.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Month-wise Attendance History</CardTitle>
            <Select
              onValueChange={(value) => setSelectedYear(parseInt(value))}
              defaultValue={selectedYear.toString()}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Total Periods</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceHistory.map((row) => (
                  <React.Fragment key={row.month}>
                    <TableRow
                      onClick={() =>
                        setExpandedMonth(
                          expandedMonth === row.month ? null : row.month
                        )
                      }
                      className="cursor-pointer"
                    >
                      <TableCell>{row.month}</TableCell>
                      <TableCell>{row.totalPeriods}</TableCell>
                      <TableCell>{row.presentPeriods}</TableCell>
                      <TableCell>{row.percentage}%</TableCell>
                    </TableRow>
                    {expandedMonth === row.month && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.details.map((detail) => (
                                <TableRow key={detail.date}>
                                  <TableCell>{detail.date}</TableCell>
                                  <TableCell>
                                    {detail.present ? "Present" : "Absent"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceHistory}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="percentage" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="fixed bottom-4 right-4 no-print">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      {isEditProfileOpen && (
        <PopupForm
          data={flatUser}
          formFields={formFields}
          onSubmit={handleProfileUpdate}
          title="Edit Profile"
          apiKey={apiKey}
          hideButton={true} // Since we trigger it manually
          open={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
        />
      )}
    </div>
  );
}
