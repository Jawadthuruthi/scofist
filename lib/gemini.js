/**
 * Google Gemini API integration for Scofist
 * Connects to Gemini using Google Generative Language REST API
 */

const FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

/**
 * Get configured model or default to gemini-3.8-flash
 * @returns {string}
 */
export function getGeminiModel() {
  const model = process.env.GEMINI_MODEL?.trim()?.replace(/^["']|["']$/g, "");
  return model || "gemini-3.8-flash";
}

/**
 * Check if the Gemini API key is configured
 * @param {string} [customKey]
 * @returns {boolean}
 */
export function isGeminiConfigured(customKey) {
  const key = customKey || process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() && key !== '""' && key !== "''");
}

/**
 * Get the sanitized Gemini API key
 * @param {string} [customKey]
 * @returns {string|null}
 */
export function getGeminiApiKey(customKey) {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return key.trim().replace(/^["']|["']$/g, "");
}

/**
 * Call Gemini REST API with fallback
 * @param {object} options
 * @param {string} options.prompt - User prompt
 * @param {string} [options.systemInstruction] - System instructions for Gemini
 * @param {object} [options.institution] - Institution metadata
 * @param {object} [options.stats] - Grounded stats if available
 * @param {string} [options.apiKey] - Optional custom API key
 * @returns {Promise<{ text: string, model: string }>}
 */
export async function generateGeminiContent({
  prompt,
  systemInstruction,
  institution,
  stats,
  apiKey: customKey,
}) {
  const apiKey = getGeminiApiKey(customKey);

  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured."
    );
  }

  const defaultSystemInstruction =
    `You are the official AI administrative assistant for ${
      institution?.name || "Sa-adiya College of Integrated Studies"
    } (${institution?.tagline || "Scofist Educational Management"}). ` +
    `Your role is to help college administrators, teachers, and staff with student queries, administrative reports, academic information, drafting announcements, summarizing records, and general institutional assistance. ` +
    `Always respond in clear, professional, well-structured GitHub-flavored Markdown. Use emojis, concise bullet points, and headings (###, ####) where appropriate. ` +
    (stats
      ? `\nActive Institution Context: Total Students: ${stats.students || 0}, Faculty: ${
          stats.teachers || 0
        }, Classes: ${stats.classes || 0}, Courses: ${stats.courses || 0}, Library Books: ${
          stats.books || 0
        }.`
      : "");

  const sysInstructionText = systemInstruction || defaultSystemInstruction;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  };

  // Include system instruction if supported
  if (sysInstructionText) {
    requestBody.systemInstruction = {
      parts: [{ text: sysInstructionText }],
    };
  }

  const primaryModel = getGeminiModel();
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS].filter(
    (m, i, arr) => arr.indexOf(m) === i
  );
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData?.error?.message ||
          `Gemini API request failed with status ${response.status}`;
        lastError = new Error(`[${model}] ${message}`);

        // If it's 404 (model unavailable) or 429 (quota exceeded on this model), try next model
        if (response.status === 404 || response.status === 429) {
          continue;
        }

        // For authentication errors, throw immediately with user-friendly info
        if (response.status === 400 && message.toLowerCase().includes("api_key")) {
          throw new Error("Invalid Gemini API key. Please verify your GEMINI_API_KEY configuration.");
        }

        continue;
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text).join("") || "";

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      return {
        text,
        model,
      };
    } catch (err) {
      lastError = err;
      if (err.message.includes("Invalid Gemini API key")) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Failed to generate response from Gemini API.");
}
