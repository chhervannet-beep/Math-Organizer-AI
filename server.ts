import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Helper to make Gemini API requests robust against transient errors (like 503 Service Unavailable, 429 Too Many Requests, or 500s)
// with exponential backoff and dual-model fallback (trying 'gemini-3.5-flash', then 'gemini-3.1-flash-lite').
async function generateContentWithRetry(aiClient: GoogleGenAI, params: any, maxRetries = 3) {
  let attempt = 0;
  let delay = 1000; // initial delay of 1s
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    attempt = 0;
    delay = 1000;
    while (attempt < maxRetries) {
      try {
        console.log(`[Gemini] Calling API model "${model}" - Attempt ${attempt + 1}/${maxRetries}...`);
        const response = await aiClient.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (error: any) {
        attempt++;
        lastError = error;
        const errMsg = error.message || String(error);
        console.warn(`[Gemini] Attempt ${attempt} with model "${model}" failed/errored:`, errMsg);
        
        if (attempt >= maxRetries) {
          console.warn(`[Gemini] Model "${model}" retries exhausted. Moving to next fallback if available.`);
          break;
        }

        const normMsg = errMsg.toLowerCase();
        const isRetriable = 
          normMsg.includes("503") || 
          normMsg.includes("unavailable") || 
          normMsg.includes("demand") ||
          normMsg.includes("429") || 
          normMsg.includes("limit") ||
          normMsg.includes("rate") ||
          normMsg.includes("timeout") ||
          normMsg.includes("500") ||
          normMsg.includes("internal");

        if (isRetriable) {
          console.log(`[Gemini] Retriable error encountered. Backing off for ${delay}ms before next retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        } else {
          // Non-retriable (e.g. prompt compliance blockers or key issue). Try next model in sequence.
          break;
        }
      }
    }
  }

  throw lastError || new Error("Gemini API calls failed on all attempted models after retries. The model might be temporarily offline or experiencing high demand.");
}

// API Route to organize uploaded custom math structure
app.post("/api/organize", async (req, res) => {
  try {
    const { pastedText, docType, grade, stream, customPrompt } = req.body;

    if (!pastedText || pastedText.trim() === "") {
      return res.status(400).json({ error: "សូមបញ្ចូលអត្ថបទគណិតវិទ្យាដើម្បីរៀបចំ។" });
    }

    if (!ai) {
      return res.status(500).json({
        error: "រកមិនឃើញគន្លឹះសម្ងាត់ API លំដាប់ Gemini ទេ។ សូមកំណត់វាទិន្នន័យក្នុង Secrets Panel (GEMINI_API_KEY)។",
      });
    }

    const streamKhmer = stream === "social" ? "វិទ្យាសាស្ត្រសង្គម" : "វិទ្យាសាស្ត្រពិត";
    const systemPrompt = `You are an elite Cambodian mathematics professor and expert LaTeX typesetter.
Your role is to analyze a raw paste of mathematical lessons, exercises, exams, or summaries (which might be unstructured, containing typed equations, legacy notation, or rough Khmer text) and organize it into a pristine, beautifully structured JSON document that holds structured elements.

INSTRUCTIONS:
1. Identify if the content is primarily a Mathematics Exam ("exam") or a Lesson/Lecture Note ("lesson"). Use the 'docType' hint: "${docType}" (either 'exam', 'lesson', or 'auto').
2. Classify and infer: Document Title, Subtitle, Grade Level (use hint Grade "ថ្នាក់ទី${grade}"), Study Stream/Track (use hint "${streamKhmer}"), Subject, Duration, Total Points, Date, and School/Institution. Translate them into elegant, educational Khmer unless raw content specifies English.
3. Organize into logical "sections" (e.g., "ផ្នែកទី១: គណនាលីមីត", "រមាំង I. សមីការលីនេអ៊ែរ", "មេរៀនទី១: ដេរីវេ").
4. Under each section, parse distinct math questions, exercises, or subsections as "items".
5. CRITICAL: Format ALL mathematical expressions, symbols, equations, and variables strictly into standard LaTeX syntax.
   - Inline equations (variables, simple expressions) MUST be wrapped in single dollar signs, e.g. $x^2 + 2x + 1 = 0$ or $\\lim_{x \\to \\infty} f(x) = 3$.
   - Multi-line or display equations MUST be wrapped in double dollar signs, e.g., $$\\int_0^1 x^2 \\,dx = \\frac{1}{3}$$.
   - Ensure to escape backslashes correctly in the standard JSON representation (for example, double backslash \\\\ in JSON represents a single backslash for LaTeX commands, like \\\\alpha or \\\\frac{a}{b}).
   - Never use Unicode symbols for standard operations if LaTeX can do it (e.g., use $\\\\pm$ instead of ±, $\\\\sqrt{x}$ instead of √x, $\\\\lim_{x \\\\to 0}$ instead of lim x->0).
6. AUTO-SOLVER ACTION: For every question/item parsed, if the pasted text does not contain a step-by-step solution, you MUST solve it yourself! Write a rigorous, highly-explained, step-by-step mathematical solution in Khmer under the "solution" property. Present the solution beautifully, showing properties, theorems used, intermediate algebra steps, and the final boxed solution like $$\\boxed{\\text{ចម្លើយ: } x = 2}$$.
   - Note for study track selection: Mathematics for the Social sciences stream ("វិទ្យាសាស្ត្រសង្គម") is typically simpler, focusing more on basic equations, statistics, simple derivatives, sequences, or algebra suitable for Grade 10/11/12 social sciences. Provide clear, straightforward explanations.
7. If the question is Multiple Choice, extract the options into the 'options' array. Ensure math inside options is also LaTeX formatted.
8. DETAILED PEDAGOGICAL TIPS: For every exercise or question item, you MUST generate a comprehensive, highly helpful, and detailed pedagogical tip, hint, formula reminder, key conceptual methodology, or step-by-step cue in Khmer under the "tip" property. Instead of a trivial one-sentence hint, write a robust explanation that outlines the key mathematical principles, formulas to recall, step-by-step thinking strategies (e.g. "គន្លឹះ៖ ដើម្បីគណនាលីមីតរាងមនកំណត់ $\\frac{0}{0}$ ចំពោះអនុគមន៍អសនិទាន យើងត្រូវគុណនឹងកន្សោមឆ្លាស់..."), and any common pitfalls to avoid. Format any math beautifully with LaTeX. It must be highly pedagogical, structured, and informative.

Optional customization from user: ${customPrompt || "None"}.`;

    const documentSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Elegant title of the document in Khmer (e.g. វិញ្ញាសាគណិតវិទ្យាត្រៀមប្រលងបាក់ឌុប or មេរៀនសង្ខេបៈ ចំនួនកុំផ្លិច)" },
        subtitle: { type: Type.STRING, description: "Inferred or generated elegant subtitle in Khmer" },
        type: { type: Type.STRING, description: "Strictly either 'exam' or 'lesson' based on content structure" },
        metadata: {
          type: Type.OBJECT,
          properties: {
            grade: { type: Type.STRING, description: "Grade of math, e.g. ថ្នាក់ទី១២, ថ្នាក់ទី១១, ថ្នាក់ទី១០" },
            stream: { type: Type.STRING, description: "Study Stream/Track, e.g. វិទ្យាសាស្ត្រពិត or វិទ្យាសាស្ត្រសង្គម" },
            subject: { type: Type.STRING, description: "General Math Subtopic, e.g. វិភាគ (Analysis), អាកាសគណិត (Algebra) or ធរណីមាត្រ (Geometry)" },
            duration: { type: Type.STRING, description: "Duration, e.g. ១២០ នាទី or ៩០ នាទី" },
            totalPoints: { type: Type.STRING, description: "Total score/points, e.g. ៥០ ពិន្ទុ or ១០០ ពិន្ទុ" },
            date: { type: Type.STRING, description: "Suitable date or date placeholder" },
            institution: { type: Type.STRING, description: "School/Ministry, e.g. វិទ្យាល័យ... or ក្រសួងអប់រំ យុវជន និងកីឡា" },
          },
          required: ["grade", "subject"]
        },
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Section unique identifier e.g. s1, s2" },
              title: { type: Type.STRING, description: "Section Title in Khmer (e.g. ផ្នែកទី១, វិញ្ញាសាអនុវត្ត, លំហាត់ទី១...)" },
              introduction: { type: Type.STRING, description: "Optional introduction or direction text, e.g. ចូរគណនាលីមីតខាងក្រោម៖" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Item unique ID e.g. q1, q2" },
                    number: { type: Type.STRING, description: "Item indicator (e.g. ១, ២, ក, ខ, A, B)" },
                    content: { type: Type.STRING, description: "Content text with KaTeX formulas inside. Use $ for inline formulas and $$ for multiline formulas." },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of multiple choice alternatives if applicable. All equations inside options must be in LaTeX $...$ form."
                    },
                    solution: { type: Type.STRING, description: "Detailed, correct, mathematical solution block in Khmer. Write formulas in LaTeX. Provide step-by-step logical reasoning so it is perfect for teaching." },
                    points: { type: Type.STRING, description: "Allocated points if applicable, e.g. (១០ ពិន្ទុ) or empty" },
                    tip: { type: Type.STRING, description: "Detailed pedagogical tip/hint, step-by-step thinking concept, standard formula guidelines or mnemonic explanation in Khmer. Format equations in LaTeX." }
                  },
                  required: ["id", "number", "content", "solution", "tip"]
                }
              }
            },
            required: ["id", "title", "items"]
          }
        }
      },
      required: ["title", "type", "sections"]
    };

    const response = await generateContentWithRetry(ai, {
      contents: `Here is the raw math data to organize:\n\n${pastedText}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: documentSchema,
        temperature: 0.1, // low temperature for precise mathematical coding and translation
      },
    });

    const parsedResult = JSON.parse(response.text || "{}");
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Error organizing math with Gemini:", error);
    res.status(500).json({
      error: `ការរៀបចំឯកសារមានបញ្ហា៖ ${error.message || error}`,
    });
  }
});

// Start server and handle Vite / production assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
