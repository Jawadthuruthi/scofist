import { NextResponse } from "next/server";

export async function POST(req, res) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Simulate a file upload and return a fake URL
    const fakeUrl = `https://fake-storage.com/uploads/${Date.now()}-${file.name}`;

    return NextResponse.json({ secure_url: fakeUrl }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
