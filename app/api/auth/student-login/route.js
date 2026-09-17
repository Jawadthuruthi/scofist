import jwt from "jsonwebtoken";
import connectToDB from "@/lib/db";
import { NextResponse } from "next/server";
import User from "@/models/User";

export async function POST(req) {
    const { studentId, dateOfBirth } = await req.json();

    if (!studentId || !dateOfBirth) {
        return NextResponse.json(
            { message: "Student ID and Date of Birth are required" },
            { status: 400 }
        );
    }

    // Validate date format DD-MM-YYYY
    const dobRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = dateOfBirth.match(dobRegex);
    if (!match) {
        return NextResponse.json(
            { message: "Invalid Date of Birth format. Use DD-MM-YYYY" },
            { status: 400 }
        );
    }

    const [, day, month, year] = match;
    const parsedDate = new Date(`${year}-${month}-${day}`);
    if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
            { message: "Invalid Date of Birth" },
            { status: 400 }
        );
    }

    try {
        await connectToDB();

        // Find user by _id (Student ID)
        const user = await User.findById(studentId.toUpperCase());

        if (!user) {
            return NextResponse.json(
                { message: "Invalid Student ID" },
                { status: 404 }
            );
        }

        // Check if user is a student
        if (!user.roles.includes("Student")) {
            return NextResponse.json(
                { message: "Access denied. Not a student account." },
                { status: 403 }
            );
        }

        // Validate date of birth
        const storedDob = new Date(user.dateOfBirth);
        const formattedProvidedDob = `${year}-${month}-${day}`;
        
        // 1. UTC Date String
        const actualDobUtc = storedDob.toISOString().split('T')[0];
        
        // 2. IST Date String
        const actualDobIST = new Intl.DateTimeFormat('en-CA', { 
          timeZone: 'Asia/Kolkata', 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        }).format(storedDob);
        
        // 3. Local Server Date String
        const localYear = storedDob.getFullYear();
        const localMonth = String(storedDob.getMonth() + 1).padStart(2, '0');
        const localDay = String(storedDob.getDate()).padStart(2, '0');
        const actualDobLocal = `${localYear}-${localMonth}-${localDay}`;
        
        const dobMatches = 
            formattedProvidedDob === actualDobUtc || 
            formattedProvidedDob === actualDobIST || 
            formattedProvidedDob === actualDobLocal;

        if (!dobMatches) {
            return NextResponse.json(
                { message: "Invalid Date of Birth" },
                { status: 401 }
            );
        }

        // Generate Token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            {
                expiresIn: "1y",
            }
        );

        const response = NextResponse.json({
            message: "Login successful",
            success: true,
            role: "Student",
        });

        response.cookies.set("auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
            sameSite: "strict",
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Student Login Error:", error.message);
        return NextResponse.json(
            { message: "Login failed. Please try again." },
            { status: 500 }
        );
    }
}
