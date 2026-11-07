import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getAITools } from "@/libservices/aiTools/index.js";
import connectToDB from "@/lib/db";
import User from "@/models/User";

// Set maximum execution duration for Vercel serverless execution
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Initialize Google provider with project's GEMINI_API_KEY
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req) {
  try {
    // 1. Cryptographic JWT Role validation: College Admin Only
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value || cookieStore.get("custom-member-token")?.value;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: Please log in." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const verified = await verifyToken(token);
    const payload = verified?.payload;
    const userRoles = Array.isArray(payload?.roles)
      ? payload.roles
      : [payload?.role, payload?.activeRole].filter(Boolean);

    let isCollegeAdmin = userRoles.includes("College Admin");

    // Fallback: If token payload doesn't contain roles directly (e.g. legacy token),
    // verify the user identity against the database
    if (!isCollegeAdmin && payload?.userId) {
      await connectToDB();
      const dbUser = await User.findById(payload.userId).select("roles").lean();
      if (dbUser?.roles?.includes("College Admin")) {
        isCollegeAdmin = true;
      }
    }

    if (!isCollegeAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: This assistant is restricted to College Admins." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Connect to database singleton
    await connectToDB();

    // 3. Extract request body and enforce sliding window (last 6 messages) to prevent token ballooning & 10s timeouts
    const { messages = [], clientTime } = await req.json();
    const windowedMessages = Array.isArray(messages) ? messages.slice(-6) : [];

    // Format conversation history for Gemini:
    // Past assistant messages should only contain their text response so that UI tool parts
    // from earlier turns are not misparsed by convertToModelMessages into dangling tool calls without results.
    const modelMessages = windowedMessages
      .map((m) => {
        let text = m.content || "";
        if (!text && Array.isArray(m.parts)) {
          text = m.parts
            .filter((p) => p.type === "text" && p.text)
            .map((p) => p.text)
            .join("\n");
        }
        return {
          role: m.role,
          content: text || "",
        };
      })
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0);

    if (modelMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid message content provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

    // 4. Initialize streaming response with Gemini Flash Lite
    const result = streamText({
      model: google(modelName),
      system: `You are the Scofist EMS AI Assistant for College Administrators.
Current local date/time: ${clientTime || new Date().toISOString()}.

Institutional Structure:
- Known Classes: CLS-1 (PLUS ONE), CLS-2 (PLUS TWO), CLS-3 (DEGREE FIRST YEAR), CLS-4 (DEGREE 2ND YEAR), CLS-5 (DEGREE THIRD YEAR), CLS-6 (PG FIRST YEAR), CLS-7 (PG SECOND YEAR), CLS-8 (NINE), CLS-9 (TEN), CLS-10 (EIGHT), CLS-12 (PLUS TWO B).
- Known Batches: SINFONIA (BTC-15), FORTUNE (BTC-9), VERITY (BTC-12), CORNEA (BTC-10), EUPHORIA (BTC-16), BRILLO (BTC-13), INFORIA (BTC-14), BLUMEA (BTC-17), G-VIBE (BTC-18).

Guidelines:
- Always use the provided tools to fetch real database data. Never hallucinate or assume facts.
- When asked for students in a class or cohort (e.g. "PG first year students", "degree 3rd year", "sinfonia batch"), call lookupDirectory with className or batchName matching the structure above.
- When asked how many teachers or students there are, call lookupDirectory with role: "Teacher" or role: "Student".
- When asked for student attendance percentage (including for a specific month or year like "October 2026"), call checkAttendance with studentId, month, and year.
- When asked which teachers are free for substitution in a period today, call getTimetable with findFreeTeachers: true, periodNumber, and day: "today".
- When searching for school leadership or the Principal, call lookupDirectory with isPrincipal: true or query: "Principal".
- When asked about pending fees, debtors, dues, or cash flow, call getOperationsStatus with category: "debtor" or "finance".
- When searching for a person by name, always pass their name into the name or query parameter of the relevant tool.
- Present answers concisely with clean markdown (bullet points, tables, bold text).
- Tone & Vocabulary: The users are non-technical school staff and administrators. Never use technical jargon such as "database", "MongoDB", "backend", "tool calls", "API", or raw internal code IDs like "CLS-5" or "BTC-15" (always refer to human-readable names like "Degree Third Year" or "Sinfonia batch").
- Always explain and format the results nicely for the College Administrator.
- If attendance has not been submitted yet for today, clearly convey the date of the latest recorded session.
- Strictly cover the 5 Core Operations: Students/Staff Directory, Attendance & Leaves, Timetables & Schedules, Exams & Marks, and Fees/Gate Passes.
- For unrelated administrative settings (gallery, articles, rentals, system configs), politely inform the user to check the corresponding dashboard page directly.`,
      messages: modelMessages,
      tools: getAITools(),
      // Allow tool execution and always give the model a final turn to synthesize text
      stopWhen: ({ steps }) => {
        const lastStep = steps[steps.length - 1];
        const hasText = Boolean(lastStep?.text && lastStep.text.trim().length > 0);
        if (hasText) return true;
        return steps.length >= 4;
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI Chat API Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred while processing your request." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
