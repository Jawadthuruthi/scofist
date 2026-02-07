import React from "react";

export const getStudentColumns = ({ classes, pageTitle, onNameClick, excludeColumns = [] }) => {
    return [
        {
            id: "select",
            header: "Select",
            type: ["checkbox"],
            width: 50,
            maxWidth: 50,
            minWidth: 50,
        },
        {
            accessorKey: "serialNo",
            header: "Sl.No",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
        },
        {
            accessorKey: "profilePic",
            header: "Image",
            type: ["avatar"],
            width: 70,
            maxWidth: 70,
            minWidth: 70,
        },
        {
            accessorKey: "_id",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Student<br />ID</div> : "Student ID",
            type: ["sortable"]
        },
        {
            accessorKey: "name",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Student Name &<br />Contact Number</div> : "Name",
            cell: ({ row }) => (
                <div
                    className={`flex flex-col ${onNameClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
                    onClick={() => {
                        if (onNameClick) {
                            onNameClick(row.original);
                        }
                    }}
                >
                    <span className={`font-medium ${onNameClick ? "text-blue-600 hover:underline" : ""}`}>{row.original.name}</span>
                    {pageTitle === "ADMISSION REGISTER" && (
                        <div className="flex flex-col gap-0.5 mt-1">
                            {row.original.contactNumber && <span className="text-xs text-muted-foreground">Ph: {row.original.contactNumber}</span>}
                            {row.original.alternativeNumber && <span className="text-xs text-muted-foreground">Alt: {row.original.alternativeNumber}</span>}
                        </div>
                    )}
                </div>
            ),
        },
        { accessorKey: "email", header: "Email" },
        {
            accessorKey: "contactNumber",
            header: "Contact Number",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span>{row.original.contactNumber}</span>
                    {row.original.alternativeNumber && (
                        <span className="text-xs text-muted-foreground">{row.original.alternativeNumber}</span>
                    )}
                </div>
            )
        },
        { accessorKey: "aadharNo", header: "Aadhar Number" },
        { accessorKey: "batchName", header: "Batch" },
        { accessorKey: "className", header: "Class" },
        {
            accessorKey: "admissionClassName",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Admission<br />Class</div> : "Admission Class"
        },
        {
            accessorKey: "admissionDate",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Admission<br />Date & Class</div> : "Admission Date",
            cell: ({ row }) => {
                const date = row.getValue("admissionDate");
                const formattedDate = date ? new Date(date).toLocaleDateString() : "";
                return (
                    <div className="flex flex-col">
                        <span>{formattedDate}</span>
                        {pageTitle === "ADMISSION REGISTER" && row.original.admissionClassName && (
                            <span className="text-xs text-muted-foreground">{row.original.admissionClassName}</span>
                        )}
                    </div>
                );
            },
        },
        { accessorKey: "dateOfBirth", header: "Date Of Birth", type: ["date"] },
        { accessorKey: "bloodGroup", header: "Blood Group" },
        { accessorKey: "roles", header: "Roles", type: ["array"] },

        {
            accessorKey: "guardianName",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Guardian Name &<br />Contact Number</div> : "Guardian Name",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.guardianName}</span>
                    <span className="text-xs text-muted-foreground">({row.original.relationship})</span>
                    {pageTitle === "ADMISSION REGISTER" && (
                        <div className="flex flex-col gap-0.5 mt-1">
                            {row.original.guardianContactNumber && <span className="text-xs text-muted-foreground">Ph: {row.original.guardianContactNumber}</span>}
                            {row.original.guardianAlternativeNumber && <span className="text-xs text-muted-foreground">Alt: {row.original.guardianAlternativeNumber}</span>}
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "guardianContactNumber",
            header: "G. Contact Number",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span>{row.original.guardianContactNumber}</span>
                    {row.original.guardianAlternativeNumber && (
                        <span className="text-xs text-muted-foreground">{row.original.guardianAlternativeNumber}</span>
                    )}
                </div>
            )
        },
        {
            accessorKey: "address",
            header: "Address",
            minWidth: 180,
            width: 200,
            cell: ({ row }) => {
                const addr = row.original.address || {};
                return (
                    <div className="flex flex-col text-xs gap-0.5 whitespace-normal break-words leading-tight py-1">
                        {addr.houseName && <span>{addr.houseName}</span>}
                        {addr.place && <span>{addr.place}</span>}
                        {addr.postOffice && <span>{addr.postOffice}</span>}
                        {addr.district && <span>{addr.district}</span>}
                        {(addr.state || addr.pin) && <span>{addr.state}{addr.pin ? ` - ${addr.pin}` : ''}</span>}
                    </div>
                );
            }
        },

        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status;
                let colorClass = "bg-gray-100 text-gray-800";
                if (status === "Active") colorClass = "bg-green-100 text-green-800";
                if (status === "Graduated") colorClass = "bg-blue-100 text-blue-800";
                if (status === "Dropped Out") colorClass = "bg-red-100 text-red-800";

                return (
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${colorClass}`}>
                        {status}
                    </div>
                )
            }
        },
        {
            id: "statusDetails",
            header: "Status Details",
            minWidth: 250,
            width: 300,
            cell: ({ row }) => {
                const {
                    status,
                    graduatedYear,
                    islamicQualification,
                    academicQualification,
                    droppedOutDate,
                    droppedOutClass,
                    droppedOutReason,
                } = row.original;

                if (status === "Graduated") {
                    return (
                        <div className="flex flex-col text-xs gap-0.5 whitespace-normal break-words leading-tight py-1">
                            <span className="font-semibold text-blue-600">Graduated: {graduatedYear}</span>
                            {islamicQualification && <span>Islamic: {islamicQualification}</span>}
                            {academicQualification && <span>Academic: {academicQualification}</span>}
                        </div>
                    );
                } else if (status === "Dropped Out") {
                    const formattedDate = droppedOutDate ? new Date(droppedOutDate).toLocaleDateString() : 'N/A';
                    const classObj = classes?.find((c) => c._id === droppedOutClass);
                    const className = classObj ? classObj.name : droppedOutClass;
                    return (
                        <div className="flex flex-col text-xs gap-0.5 whitespace-normal break-words leading-tight py-1">
                            <span className="font-semibold text-red-600">Dropped Out: {formattedDate}</span>
                            {droppedOutClass && <span>Class: {className}</span>}
                            {droppedOutReason && droppedOutReason.toLowerCase() !== 'unknown' && <span>Reason: {droppedOutReason}</span>}
                        </div>
                    );
                }
                return <span className="text-muted-foreground">-</span>;
            },
        },
        {
            id: "liabilities",
            header: "Liabilities",
            cell: ({ row }) => {
                const funds = row.original.funds || [];
                const coupons = row.original.coupons || [];
                const pendingRentals = row.original.pendingRentals || [];

                const itLabFund = funds.find(f => f.department === "IT Lab");
                const stationaryFund = funds.find(f => f.department === "Stationary");

                // Calculate coupon liability (Total Coupon Amount - Total Paid)
                const couponLiability = coupons.reduce((sum, coupon) => {
                    // Use virtual balance if available, otherwise calculate manually
                    if (typeof coupon.balance === 'number') return sum + coupon.balance;

                    const totalPaid = coupon.payments?.reduce((pSum, p) => pSum + (p.amount || 0), 0) || 0;
                    return sum + ((coupon.couponAmount || 0) - totalPaid);
                }, 0);

                const items = [];

                // Show balances if they are not 0
                if (itLabFund && itLabFund.balance !== 0) {
                    items.push({
                        label: "IT Lab",
                        amount: itLabFund.balance,
                        // Red for minus (debt/due), Green for plus (surplus/credit) - based on user request
                        color: itLabFund.balance < 0 ? "text-red-600" : "text-green-600"
                    });
                }

                if (stationaryFund && stationaryFund.balance !== 0) {
                    items.push({
                        label: "Stationary",
                        amount: stationaryFund.balance,
                        color: stationaryFund.balance < 0 ? "text-red-600" : "text-green-600"
                    });
                }

                // Coupon is always red as per request
                if (couponLiability !== 0) {
                    items.push({
                        label: "Coupon",
                        amount: couponLiability,
                        color: "text-red-600"
                    });
                }

                // Add Pending Rentals to items
                if (pendingRentals.length > 0) {
                    pendingRentals.forEach(rental => {
                        const bookId = rental.bookId?.id ||
                            (rental.bookId?.prefix ? `${rental.bookId.prefix}-${rental.bookId.number}` : rental.bookId?.number) ||
                            "N/A";
                        items.push({
                            label: "Library",
                            value: `(${bookId})`,
                            color: "text-red-600",
                            isText: true // Flag to render as text value
                        });
                    });
                }

                if (items.length === 0) return <span className="text-muted-foreground">-</span>;

                return (
                    <div className="flex flex-col text-xs gap-1">
                        {items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center gap-2">
                                <span className="text-muted-foreground">{item.label}:</span>
                                {item.isText ? (
                                    <span className={`font-medium ${item.color}`}>
                                        {item.value}
                                    </span>
                                ) : (
                                    <span className={`font-medium ${item.color}`}>
                                        {item.amount > 0 ? "+" : ""}{item.amount}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                );
            },
        },

        {
            id: "remarks",
            header: "Remarks",
            cell: ({ row }) => {
                const isVerified = row.original.isVerified;
                const verifiedAt = row.original.verifiedAt;

                // Assuming isVerified is boolean or strictly "true"/"false" if string
                // Adjust logic if it's different (e.g. check for null/undefined)
                const verified = isVerified === true || isVerified === "true";

                return (
                    <div className="flex flex-col items-center gap-1">
                        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${verified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {verified ? "Verified" : "Not Verified"}
                        </div>
                        {verified && verifiedAt && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(verifiedAt).toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                );
            }
        },
    ].filter(column => {
        const key = column.id || column.accessorKey;
        return !excludeColumns.includes(key);
    });
};
