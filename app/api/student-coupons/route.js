import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import StudentCoupon from "@/models/StudentCoupon";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const academicYear = url.searchParams.get("academicYear");
        const classId = url.searchParams.get("classId");
        const search = url.searchParams.get("search");
        const role = req.headers.get("active-role");

        // Build filter
        const filter = {};
        if (academicYear) filter.academicYear = academicYear;
        if (search) {
            filter.$or = [
                { couponNumber: { $regex: search, $options: "i" } },
                // Note: searching by student name requires lookup/aggregate, we'll handle simple populate filter first
            ];
        }

        // If searching by class, we need to find students first
        if (classId) {
            const studentsInClass = await User.find({ "studentSpecificField.classId": classId }).select("_id");
            filter.studentId = { $in: studentsInClass.map(s => s._id) };
        }

        // Fetch coupons
        const coupons = await StudentCoupon.find(filter)
            .populate({
                path: "studentId",
                select: "name studentSpecificField.classId _id",
                populate: {
                    path: "studentSpecificField.classId",
                    select: "name"
                }
            })
            .sort({ createdAt: -1 });

        // Client-side filtering for search text match on student name (if not handled by regex above)
        let filteredCoupons = coupons;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredCoupons = coupons.filter(coupon =>
                coupon.couponNumber.toLowerCase().includes(searchLower) ||
                coupon.studentId?.name?.toLowerCase().includes(searchLower)
            );
        }

        // Sort by Student ID Ascending
        filteredCoupons.sort((a, b) => {
            const idA = a.studentId?._id || "";
            const idB = b.studentId?._id || "";
            return idA.localeCompare(idB);
        });

        // Calculate Summary Stats
        const stats = {
            totalCouponAmount: 0,
            totalCollected: 0,
            totalPending: 0
        };

        filteredCoupons.forEach(coupon => {
            stats.totalCouponAmount += (coupon.couponAmount || 0);
            stats.totalCollected += (coupon.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0);
        });
        stats.totalPending = stats.totalCouponAmount - stats.totalCollected;

        return NextResponse.json({
            coupons: filteredCoupons,
            stats
        });

    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();
        const { id } = await req.json();

        if (!id) {
            return apiResponse.error("Coupon ID is required", 400);
        }

        const deletedCoupon = await StudentCoupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            return apiResponse.error("Coupon not found", 404);
        }

        return apiResponse.success(null, "Coupon deleted successfully");
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const body = await req.json();
        const { studentId, academicYear, couponNumber, couponAmount, payment } = body;

        // Check if coupon exists for this student + year
        let coupon = await StudentCoupon.findOne({ studentId, academicYear });

        if (coupon) {
            // Update existing coupon

            // If couponNumber is provided, update it (allow overwriting or setting if was empty)
            if (couponNumber) {
                coupon.couponNumber = couponNumber;
            }

            // check if we are adding a payment
            if (payment && payment.amount > 0) {
                coupon.payments.push(payment);
            }
            // Update coupon amount if changed
            if (couponAmount) coupon.couponAmount = couponAmount;

            await coupon.save();
        } else {
            // Create new coupon
            coupon = new StudentCoupon({
                studentId,
                academicYear,
                couponNumber, // can be undefined
                couponAmount,
                payments: payment && payment.amount > 0 ? [payment] : []
            });
            await coupon.save();
        }

        return apiResponse.success(coupon, "Student coupon funds updated successfully");

    } catch (error) {
        // handle duplicate key error for couponNumber
        if (error.code === 11000) {
            return apiResponse.error("Coupon number already exists!");
        }
        return apiResponse.error(error);
    }
}
