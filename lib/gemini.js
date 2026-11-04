/**
 * Google Gemini API integration for Scofist
 * Connects to Gemini using Google Generative Language REST API
 */

const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
];

/**
 * Get configured model or default to gemini-3-flash-preview
 * @returns {string}
 */
export function getGeminiModel() {
  const model = process.env.GEMINI_MODEL?.trim()?.replace(/^["']|["']$/g, "");
  return model || "gemini-3-flash-preview";
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
 * @param {Array<{ role: string, content?: string, text?: string }>} [options.messages] - Optional chat history
 * @param {string} [options.systemInstruction] - System instructions for Gemini
 * @param {object} [options.institution] - Institution metadata
 * @param {object} [options.stats] - Grounded stats if available
 * @param {string} [options.apiKey] - Optional custom API key
 * @param {Array<object>} [options.tools] - Optional function declarations for tool calling
 * @param {Function} [options.toolExecutor] - Optional async tool runner function(args)
 * @returns {Promise<{ text: string, model: string, toolCalls?: Array<object> }>}
 */
export async function generateGeminiContent({
  prompt,
  messages = [],
  systemInstruction,
  institution,
  stats,
  apiKey: customKey,
  tools = [],
  toolExecutor = null,
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

  // Build contents array supporting conversation history
  const contents = [];
  if (Array.isArray(messages) && messages.length > 0) {
    messages.forEach((m) => {
      const text = m.text || m.content || "";
      if (text) {
        contents.push({
          role: m.role === "assistant" || m.role === "model" ? "model" : "user",
          parts: [{ text }],
        });
      }
    });
  }

  // Ensure current prompt is appended
  if (prompt) {
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });
  }

  if (contents.length === 0) {
    throw new Error("Cannot send empty prompt to Gemini.");
  }

  const requestBody = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  };

  // Include tools declarations if provided
  if (Array.isArray(tools) && tools.length > 0) {
    requestBody.tools = [
      {
        functionDeclarations: tools,
      },
    ];
  }

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
      const currentContents = [...contents];
      const executedToolCalls = [];
      let finalResponseText = null;

      for (let turn = 0; turn < 3; turn++) {
        const passBody = {
          contents: currentContents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        };
        if (sysInstructionText) {
          passBody.systemInstruction = { parts: [{ text: sysInstructionText }] };
        }
        // Provide tool declarations so the model can invoke them
        if (Array.isArray(tools) && tools.length > 0 && turn < 2) {
          passBody.tools = [{ functionDeclarations: tools }];
        }

        let response;
        try {
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(passBody),
            signal: AbortSignal.timeout(turn === 0 ? 5000 : 7000),
          });
        } catch (fetchErr) {
          console.warn(`[Gemini API] Turn ${turn} fetch failed on ${model}: ${fetchErr.message}`);
          break;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message =
            errorData?.error?.message ||
            `Gemini API request failed with status ${response.status}`;
          lastError = new Error(`[${model}] ${message}`);

          // For authentication errors, throw immediately with user-friendly info
          if (response.status === 400 && message.toLowerCase().includes("api_key")) {
            throw new Error("Invalid Gemini API key. Please verify your GEMINI_API_KEY configuration.");
          }

          console.warn(`[Gemini API] Model ${model} returned ${response.status} (${message}). Trying next fallback...`);
          break;
        }

        const data = await response.json();
        const candidate = data?.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const functionCallParts = parts.filter((p) => p.functionCall);

        // Handle parallel or single function calls if present and within max turns
        if (functionCallParts.length > 0 && typeof toolExecutor === "function" && turn < 2) {
          const responseParts = await Promise.all(
            functionCallParts.map(async (fcp) => {
              const { name, args, id } = fcp.functionCall;
              executedToolCalls.push({ name, args, id });
              let toolResult;
              try {
                toolResult = await toolExecutor(args);
              } catch (toolError) {
                toolResult = { error: toolError.message };
              }
              const fnResp = {
                name,
                response: {
                  name,
                  content: toolResult,
                },
              };
              if (id) fnResp.id = id;
              return { functionResponse: fnResp };
            })
          );

          currentContents.push(
            {
              role: "model",
              parts: functionCallParts,
            },
            {
              role: "user",
              parts: responseParts,
            }
          );
          continue;
        }

        const text = parts.map((p) => p.text || "").join("") || "";
        if (text && text.trim()) {
          finalResponseText = text;
          break;
        }
      }

      if (finalResponseText) {
        return {
          text: finalResponseText,
          model,
          toolCalls: executedToolCalls,
        };
      }

      throw new Error("Gemini returned an empty response.");
    } catch (err) {
      lastError = err;
      if (err.message && err.message.includes("Invalid Gemini API key")) {
        throw err;
      }
      console.warn(`[Gemini API] Model ${model} attempt failed (${err.message}). Trying next fallback...`);
    }
  }

  throw lastError || new Error("Failed to generate response from Gemini API.");
}
