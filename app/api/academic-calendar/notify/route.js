import { NextResponse } from "next/server";
import webpush from "web-push";
import connectToDB from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    webpush.setVapidDetails(
      "mailto:admin@scofist.com",
      process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const { eventName, date, time } = await req.json();

    if (!eventName || !date) {
      return NextResponse.json({ error: "Missing event details" }, { status: 400 });
    }

    await connectToDB();

    const teachers = await User.find({ roles: "Teacher" }).lean();
    let notificationCount = 0;

    const payload = JSON.stringify({
      title: "Special Day Alert 📅",
      body: `Event: ${eventName}\nDate: ${date}${time ? `\nTime: ${time}` : ''}`,
      url: "/dashboard/academic-calendar"
    });

    const pushPromises = teachers.map(async (teacher) => {
      if (!teacher.pushSubscriptions || teacher.pushSubscriptions.length === 0) {
        return;
      }

      const devicePromises = teacher.pushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          notificationCount++;
        } catch (error) {
          console.error(`Failed to send push to teacher ${teacher.name}:`, error.body || error);
        }
      });

      await Promise.all(devicePromises);
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ 
      success: true, 
      message: `Sent ${notificationCount} push notifications to teachers.` 
    });

  } catch (error) {
    console.error("Error in academic-calendar notify:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message
    }, { status: 500 });
  }
}
