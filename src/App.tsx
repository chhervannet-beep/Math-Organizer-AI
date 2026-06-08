import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  CheckCircle,
  Code,
  Edit2,
  Download,
  Printer,
  PlusCircle,
  Trash2,
  Sparkles,
  ArrowLeft,
  Save,
  Eye,
  Settings,
  HelpCircle,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { MathDocument, MathSection, MathItem, SavedDraft } from "./types";
import { MathRenderer } from "./components/MathRenderer";
import { RAW_MATH_TEMPLATES, RawTemplate } from "./data/templates";
import { exportLatex, exportWord } from "./utils/exporters";

export default function App() {
  // Application Modes
  // 'input' -> Paste & Select Options
  // 'view' -> View organized draft, customize elements, live render, print/export
  const [appMode, setAppMode] = useState<"input" | "view">("input");

  // Input States
  const [pastedText, setPastedText] = useState("");
  const [docType, setDocType] = useState<"exam" | "lesson" | "auto">("auto");
  const [grade, setGrade] = useState("12");
  const [stream, setStream] = useState<"real" | "social">("real");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);

  // Active Document State
  const [activeDocument, setActiveDocument] = useState<MathDocument | null>(null);

  // View settings
  const [activeTab, setActiveTab] = useState<"preview" | "editor" | "latex">("preview");
  const [showSolutions, setShowSolutions] = useState(true);
  const [showTips, setShowTips] = useState(true);

  // Local storage templates / draft histories
  const [history, setHistory] = useState<SavedDraft[]>([]);

  // Editing State (if in 'editor' tab)
  const [editedDoc, setEditedDoc] = useState<MathDocument | null>(null);

  // Load drafts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("math-ai-drafts");
      if (stored) {
        const parsed: SavedDraft[] = JSON.parse(stored);
        const seenIds = new Set<string>();
        const uniqueHistory: SavedDraft[] = [];
        parsed.forEach((item) => {
          let itemId = item.id;
          if (!itemId || seenIds.has(itemId)) {
            itemId = `${item.document?.title?.toLowerCase()?.replace(/[^a-z0-9]/g, "-") || "saved-draft"}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            item.id = itemId;
          }
          seenIds.add(itemId);
          uniqueHistory.push(item);
        });
        setHistory(uniqueHistory);
      }
    } catch (e) {
      console.error("Localstorage recovery failed:", e);
    }
  }, []);

  // Save drafts helper
  const saveToHistory = (docToSave: MathDocument) => {
    try {
      let updatedHistory = [...history];
      const matchIdx = updatedHistory.findIndex((h) => h.name === docToSave.title);
      
      let finalId = "";
      if (matchIdx !== -1) {
        finalId = updatedHistory[matchIdx].id;
      } else {
        finalId = `${docToSave.title?.toLowerCase()?.replace(/[^a-z0-9]/g, "-") || "draft"}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }

      const newDraft: SavedDraft = {
        id: finalId,
        name: docToSave.title,
        dateUpdated: new Date().toLocaleDateString("km-KH", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        document: docToSave,
      };

      if (matchIdx !== -1) {
        updatedHistory[matchIdx] = newDraft;
      } else {
        updatedHistory = [newDraft, ...updatedHistory];
      }

      setHistory(updatedHistory);
      localStorage.setItem("math-ai-drafts", JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Failed to persist draft:", e);
    }
  };

  // Delete draft from history
  const deleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = history.filter((h) => h.id !== draftId);
      setHistory(updated);
      localStorage.setItem("math-ai-drafts", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete draft:", e);
    }
  };

  // Load draft from history
  const loadDraft = (saved: SavedDraft) => {
    setActiveDocument(saved.document);
    setEditedDoc(saved.document);
    setAppMode("view");
    setActiveTab("preview");
  };

  // Mock template paste handler
  const loadTemplateValue = (tpl: RawTemplate) => {
    setPastedText(tpl.content);
    setDocType(tpl.category);
    setGrade(tpl.grade);
  };

  // AI Organize trigger API handler
  const handleOrganizeDocument = async () => {
    if (!pastedText.trim()) {
      setApiError("សូមបញ្ចូលអត្ថបទគណិតវិទ្យា ឬលំហាត់របស់អ្នកជាមុនសិន។");
      return;
    }

    setIsProcessing(true);
    setApiError(null);

    // Dynamic loading messages to delight user while calling server
    const loadingTexts = [
      "កំពុងវិភាគទិន្នន័យគណិតវិទ្យាដែលបានរកឃើញ...",
      "កំពុងបំប្លែងរូបមន្ត និងសញ្ញាគណិតវិទ្យាទៅជាទម្រង់ LaTeX...",
      "កំពុងដោះស្រាយសមីការ និងលំហាត់គណិតវិទ្យាដោយប្រុងប្រយ័ត្ន...",
      "កំពុងរៀបចំរចនាសម្ព័ន្ធ ផ្នែក និងលំដាប់លំហាត់ជាភាសាខ្មែរ...",
      "កំពុងបង្កើតដំណោះស្រាយលម្អិតមួយជំហានម្តងៗសម្រាប់អំនាន...",
      "រួចរាល់ហើយ! កំពុងបើកបង្ហាញឯកសារដ៏ស្រស់ស្អាតរបស់អ្នក...",
    ];

    let stepIdx = 0;
    setLoadingStep(loadingTexts[0]);
    const timer = setInterval(() => {
      stepIdx++;
      if (stepIdx < loadingTexts.length) {
        setLoadingStep(loadingTexts[stepIdx]);
      }
    }, 2500);

    try {
      const response = await fetch("/api/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedText, docType, grade, stream, customPrompt }),
      });

      const parsedJSON = await response.json();

      if (!response.ok || parsedJSON.error) {
        throw new Error(parsedJSON.error || "ការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេមានកំហុស។");
      }

      // Success! Set doc and enter view state
      setActiveDocument(parsedJSON);
      setEditedDoc(parsedJSON);
      saveToHistory(parsedJSON);
      setAppMode("view");
      setActiveTab("preview");
    } catch (err: any) {
      console.error("Error organizing math with AI:", err);
      setApiError(err.message || "មានបញ្ហាបច្ចេកទេសក្នុងដំណើរការរៀបចំឯកសាររបស់អ្នក។");
    } finally {
      clearInterval(timer);
      setIsProcessing(false);
    }
  };

  // Local updating handler inside Interactive editor
  const handleUpdateField = (field: string, val: any) => {
    if (!editedDoc) return;
    const next = { ...editedDoc, [field]: val };
    setEditedDoc(next);
    setActiveDocument(next);
  };

  const handleUpdateMetadataField = (metaKey: string, val: string) => {
    if (!editedDoc) return;
    const next = {
      ...editedDoc,
      metadata: { ...editedDoc.metadata, [metaKey]: val },
    };
    setEditedDoc(next);
    setActiveDocument(next);
  };

  const handleUpdateSectionTitle = (secId: string, titleVal: string, introVal?: string) => {
    if (!editedDoc) return;
    const nextSections = editedDoc.sections.map((sec) => {
      if (sec.id === secId) {
        return { ...sec, title: titleVal, introduction: introVal };
      }
      return sec;
    });
    const next = { ...editedDoc, sections: nextSections };
    setEditedDoc(next);
    setActiveDocument(next);
  };

  const handleUpdateItem = (secId: string, itemId: string, itemData: Partial<MathItem>) => {
    if (!editedDoc) return;
    const nextSections = editedDoc.sections.map((sec) => {
      if (sec.id === secId) {
        const nextItems = sec.items.map((it) => {
          if (it.id === itemId) {
            return { ...it, ...itemData };
          }
          return it;
        });
        return { ...sec, items: nextItems };
      }
      return sec;
    });

    const next = { ...editedDoc, sections: nextSections };
    setEditedDoc(next);
    setActiveDocument(next);
  };

  const handleItemOptionChange = (secId: string, itemId: string, optIdx: number, val: string) => {
    if (!editedDoc) return;
    const nextSections = editedDoc.sections.map((sec) => {
      if (sec.id === secId) {
        const nextItems = sec.items.map((it) => {
          if (it.id === itemId && it.options) {
            const nextOpts = [...it.options];
            nextOpts[optIdx] = val;
            return { ...it, options: nextOpts };
          }
          return it;
        });
        return { ...sec, items: nextItems };
      }
      return sec;
    });

    const next = { ...editedDoc, sections: nextSections };
    setEditedDoc(next);
    setActiveDocument(next);
  };

  const handleAddNewItem = (secId: string) => {
    if (!editedDoc) return;
    const newItem: MathItem = {
      id: "it-" + Date.now(),
      number: "១",
      content: "សូមសរសេរប្រធានលំហាត់ថ្មី ឬរូបមន្ត $E = mc^2$ ទីនេះ...",
      solution: "ដំណោះស្រាយសង្ខេប៖ ...",
      tip: "គន្លឹះដោះស្រាយ៖ ...",
    };

    const nextSections = editedDoc.sections.map((sec) => {
      if (sec.id === secId) {
        return { ...sec, items: [...sec.items, newItem] };
      }
      return sec;
    });

    const next = { ...editedDoc, sections: nextSections };
    setEditedDoc(next);
    setActiveDocument(next);
  };

  const handleAddNewSection = () => {
    if (!editedDoc) return;
    const nextSection: MathSection = {
      id: "sec-" + Date.now(),
      title: "ផ្នែក/រមាំងថ្មី",
      introduction: "គណនាលំហាត់គណិតវិទ្យាខាងក្រោមដោយបង្ហាញវិធីធ្វើឱ្យបានច្បាស់លាស់៖",
      items: [
        {
          id: "it-new-" + Date.now(),
          number: "១",
          content: "លំហាត់គំរូ $f(x) = \\sin(x)$",
          solution: "ចម្លើយលម្អិត៖ $\\sin(0) = 0$",
        },
      ],
    };
    const next = { ...editedDoc, sections: [...editedDoc.sections, nextSection] };
    setEditedDoc(next);
    setActiveDocument(next);
  };

  const handleDeleteItem = (secId: string, itemId: string) => {
    if (!editedDoc) return;
    const nextSections = editedDoc.sections.map((sec) => {
      if (sec.id === secId) {
        return { ...sec, items: sec.items.filter((it) => it.id !== itemId) };
      }
      return sec;
    });
    const next = { ...editedDoc, sections: nextSections };
    setEditedDoc(next);
    setActiveDocument(next);
  };

  const handleDeleteSection = (secId: string) => {
    if (!editedDoc) return;
    const next = { ...editedDoc, sections: editedDoc.sections.filter((s) => s.id !== secId) };
    setEditedDoc(next);
    setActiveDocument(next);
  };

  // Trigger manual history persistence saving
  const handleSaveDocToLocal = () => {
    if (activeDocument) {
      saveToHistory(activeDocument);
      alert("រក្សាទុកឯកសារបានជោគជ័យក្នុងប្រព័ន្ធប្រវត្តិ!");
    }
  };

  // Generate plain LaTeX textual listing for viewer
  const getInlineAndDisplayLatexTextCode = (): string => {
    if (!activeDocument) return "";
    return `% XeLaTeX Mathematics Document Code Compiled by Math Organizer AI
\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath,amssymb}
\\usepackage{fontspec}
\\setmainfont{Nokora}

\\begin{document}
\\begin{center}
  {\\Large\\bf ${activeDocument.title}} \\\\
  \\vspace{5pt}
  ${activeDocument.subtitle}
\\end{center}

\\vspace{15pt}
\\noindent
\\textbf{កម្រិតថ្នាក់:} ${activeDocument.metadata.grade} \\hfill \\textbf{រយៈពេល:} ${activeDocument.metadata.duration || "N/A"}

\\vspace{15pt}
${activeDocument.sections
  .map(
    (sec) => `
\\section*{${sec.title}}
${sec.introduction ? `{\\it ${sec.introduction}}\\\\` : ""}

\\begin{enumerate}
${sec.items
  .map(
    (item) => `  \\item \\textbf{${item.number}} ${item.content}
${
  item.options && item.options.length > 0
    ? `  \\begin{itemize}\n${item.options.map((opt) => `    \\item ${opt}`).join("\n")}\n  \\end{itemize}`
    : ""
}
  \\\\ \\textbf{ដំណោះស្រាយ:} ${item.solution}`
  )
  .join("\n\n")}
\\end{enumerate}`
  )
  .join("\n")}
\\end{document}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5f9] text-slate-800">
      {/* 1. APP NAVBAR header — Hidden strictly during browser A4 printing */}
      <header className="no-print sticky top-0 bg-slate-900 text-white z-40 border-b border-slate-800 shadow-md">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setAppMode("input")}>
            <div className="bg-emerald-500 text-white p-2 rounded-lg shadow-inner">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold tracking-tight">Math Organizer AI</h1>
              <p className="text-xs text-slate-400 font-sans hidden sm:block">
                កម្មវិធីរៀបចំមេរៀន និងវិញ្ញាសាគណិតវិទ្យាដ៏ឆ្លាតវៃ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {appMode === "view" && (
              <button
                onClick={() => setAppMode("input")}
                className="flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> ត្រឡប់ក្រោយ (Back)
              </button>
            )}
            <a
              href="#help"
              className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800"
              title="ជំនួយ"
              onClick={() => {
                alert(
                  "របៀបប្រើ៖\n១. ចម្លង (Paste) អត្ថបទលំហាត់គណិតវិទ្យារូបមន្តចូល\n២. ចុច 'រៀបចំឯកសារ (AI Organize)' ដើម្បីបំលែង និងដោះស្រាយលំហាត់បោះពុម្ព\n៣. ទាញយកជា Word គាំទ្រ MathType ឬកូដ LaTeX និង PDF បោះពុម្ព។"
                );
              }}
            >
              <HelpCircle className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main body viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col">
        {appMode === "input" ? (
          /* ========================================================== */
          /*                       A. INPUT SCREEN                      */
          /* ========================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar with draft histories */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Draft list card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2 text-slate-800 font-bold font-serif text-sm">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>ប្រវត្តិឯកសារដែលបានរក្សាទុក</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    {history.length}
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs leading-relaxed">
                    <FileText className="w-10 h-10 mx-auto opacity-20 mb-2" />
                    មិនទាន់មានឯកសារចាស់ៗត្រូវបានរក្សាទុកនៅឡើយទេ។
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        onClick={() => loadDraft(h)}
                        className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition hover:border-slate-200"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-sm font-semibold text-slate-700 truncate font-serif">
                            {h.name || "វិញ្ញាសាគណិតគ្មានចំណងជើង"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">កែប្រែ៖ {h.dateUpdated}</p>
                        </div>
                        <button
                          onClick={(e) => deleteDraft(h.id, e)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-200 opacity-60 group-hover:opacity-100 transition"
                          title="លុប"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sample Templates Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center space-x-2 text-slate-800 font-bold font-serif text-base mb-3 pb-2 border-b border-slate-100">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span>គំរូឯកសារ (Click to Past Text)</span>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  ជ្រើសរើសទិន្នន័យគំរូគណិតវិទ្យាស្អាតៗខាងក្រោមដើម្បីធ្វើការសាកល្បងបំពេញលឿន៖
                </p>

                <div className="space-y-3">
                  {RAW_MATH_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => loadTemplateValue(tpl)}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 active:bg-emerald-50 transition flex flex-col"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-700 font-serif leading-tight">
                          {tpl.name}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          ថ្នាក់ទី{tpl.grade}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 lines-clamp-2 leading-relaxed">
                        {tpl.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input and Configuration form */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                {/* Welcomer headers */}
                <div className="mb-6">
                  <span className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 mb-3">
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> AI Math Typesetter
                  </span>
                  <h2 className="text-2xl font-serif font-semibold text-slate-800 tracking-tight">
                    បំលែងទិន្នន័យគណិតវិទ្យា និងរៀបចំវិញ្ញាសាដ៏លឿនបំផុត
                  </h2>
                  <p className="text-slate-500 font-sans text-sm mt-1 leading-relaxed">
                    គ្រាន់តែចម្លងអត្ថបទលំហាត់ ឬកូដរដុបៗរបស់អ្នក past ចូលខាងក្រោម។
                    ប្រព័ន្ធបញ្ញាសិប្បនិម្មិតនឹងរៀបចំទម្រង់ LaTeX, ដោះស្រាយលំហាត់លម្អិត,
                    និងបង្កើតរចនាបទបោះពុម្ពភ្លាមៗ!
                  </p>
                </div>

                {/* Main text paste */}
                <div className="mb-5">
                  <label className="block text-slate-700 text-sm font-bold font-serif mb-2">
                    បញ្ចូល ឬចម្លងប្រធានលំហាត់ (Paste raw math text)
                  </label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="បញ្ចូលលំហាត់គណិតវិទ្យារូបមន្តទីនេះ... ឧទាហរណ៍៖
១. រកលីមីតនៃ x^2/(x - 1) ពេល x កៀក ១
២. រកដេរីវេនៃ sin(x)..."
                    className="w-full h-80 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-sans text-sm leading-relaxed"
                    id="raw-math-textarea"
                  ></textarea>
                </div>

                {/* Grid configs options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-slate-700 text-xs font-bold font-serif mb-1.5">
                      ប្រភេទឯកសារដែលចង់បាន
                    </label>
                    <select
                      value={docType}
                      onChange={(e: any) => setDocType(e.target.value)}
                      className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    >
                      <option value="auto">ស្វែងរកលំដាប់ដោយស្វ័យប្រវត្តិ (Auto Detect)</option>
                      <option value="exam">វិញ្ញាសា ឬលំហាត់សាកល្បង (Exam Paper)</option>
                      <option value="lesson">សង្ខេបមេរៀន និងនិយមន័យ (Math Lesson)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 text-xs font-bold font-serif mb-1.5">
                      កម្រិតថ្នាក់ (Mathematics Grade)
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    >
                      <option value="12">ថ្នាក់ទី១២ (Advanced Highschool Math)</option>
                      <option value="11">ថ្នាក់ទី១១ (Pre-Calculus & Algebra)</option>
                      <option value="10">ថ្នាក់ទី១០ (Coordinated Geometry & Equations)</option>
                      <option value="9">ថ្នាក់ទី៩ (Basic Algebra/Fractions)</option>
                    </select>
                  </div>
                </div>

                {/* Study Track stream options (Science vs Social Science) */}
                {["10", "11", "12"].includes(grade) && (
                  <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-slate-700 text-xs font-bold font-serif mb-2">
                      សមាសភាពថ្នាក់ / ផ្នែកសិក្សា (Study Stream)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setStream("real")}
                        className={`py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition border ${
                          stream === "real"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        🧬 ថ្នាក់វិទ្យាសាស្ត្រពិត (Real Science)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStream("social")}
                        className={`py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition border ${
                          stream === "social"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        📖 ថ្នាក់វិទ្យាសាស្ត្រសង្គម (Social Science)
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional helper prompt for AI */}
                <div className="mb-6">
                  <label className="block text-slate-700 text-xs font-bold font-serif mb-1.5">
                    ការណែនាំបន្ថែមពិសេសផ្សេងៗ (Custom instruction - Optional)
                  </label>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="ឧទាហរណ៍៖ សូមប្រើភាសាខ្មែរសុទ្ធ, បន្ថែមចំណុចសំខាន់ៗ, ដោះស្រាយល្បិចគណនា..."
                    className="w-full px-3.5 py-2 text-xs md:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>

                {/* API Error state fallback */}
                {apiError && (
                  <div className="p-4 mb-6 rounded-lg bg-red-50 text-red-700 text-xs md:text-sm border border-red-100 flex items-start space-x-2">
                    <div className="text-red-500 font-bold">⛔</div>
                    <div>{apiError}</div>
                  </div>
                )}

                {/* Submitting button */}
                <button
                  onClick={handleOrganizeDocument}
                  disabled={isProcessing || !pastedText.trim()}
                  className="w-full h-12 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-serif tracking-wide font-bold rounded-xl transition shadow-lg hover:shadow-emerald-200"
                  id="organize-btn"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>រៀបចំ និងដោះស្រាយដោយឆ្លាតវៃ (AI Organize)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /*                       B. VIEW SCREEN                       */
          /* ========================================================== */
          <div className="flex flex-col gap-6">
            {/* Action Bar controls - Hidden strictly during print layout */}
            <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setAppMode("input")}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition"
                  title="ថយក្រោយ"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-serif font-bold text-slate-800 text-base md:text-lg">
                    {activeDocument?.title || "ឯកសារដែលបានវិភាគរួចរាល់"}
                  </h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-slate-500">
                      ប្រភេទ៖ {activeDocument?.type === "exam" ? "វិញ្ញាសា" : "មេរៀនសង្ខេប"}
                    </span>
                    <span className="text-xs text-slate-500">
                      ថ្នាក់៖ ថ្នាក់ទី {activeDocument?.metadata.grade}
                    </span>
                    {activeDocument?.metadata.stream && (
                      <span className="text-xs text-slate-500">
                        ផ្នែក៖ {activeDocument.metadata.stream}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Central download/print exporters buttons list */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => activeDocument && exportWord(activeDocument)}
                  className="flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#2b579a] text-white hover:bg-[#204377] active:scale-95 transition cursor-pointer"
                  title="ទាញយកជាឯកសារ Word គាំទ្ររូបមន្ត"
                >
                  <FileDown className="w-4 h-4 mr-1.5" /> ទាញយក Word (.docx)
                </button>

                <button
                  onClick={() => activeDocument && exportLatex(activeDocument)}
                  className="flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition cursor-pointer"
                  title="ទាញយកកូដសម្រាប់ការចងក្រង LaTeX ផ្ទាល់"
                >
                  <Code className="w-4 h-4 mr-1.5" /> ទាញយក LaTeX (.tex)
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition cursor-pointer"
                  title="បោះពុម្ពឯកសារចេញជា PDF ស្រស់ស្អាត"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> បោះពុម្ពជា PDF
                </button>

                <button
                  onClick={handleSaveDocToLocal}
                  className="flex items-center px-3 px-2 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition"
                  title="រក្សាទិន្នន័យបច្ចុប្បន្នទុកក្នុងប្រវត្តិ"
                >
                  <Save className="w-4 h-4 mr-1.5" /> រក្សាទុក (Save)
                </button>
              </div>
            </div>

            {/* Interactive Layout: Sidebars or editors tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Output Tab switcher header bar (no-print) */}
              <div className="no-print lg:col-span-12 flex space-x-1.5 border-b border-slate-200 pb-1">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-4 py-2 text-xs md:text-sm font-semibold font-serif rounded-t-lg transition flex items-center space-x-1.5 ${
                    activeTab === "preview"
                      ? "bg-white text-emerald-600 border-t-2 border-emerald-500 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>ទិដ្ឋភាពមើលមុន (Live Paper View)</span>
                </button>

                <button
                  onClick={() => setActiveTab("editor")}
                  className={`px-4 py-2 text-xs md:text-sm font-semibold font-serif rounded-t-lg transition flex items-center space-x-1.5 ${
                    activeTab === "editor"
                      ? "bg-white text-emerald-600 border-t-2 border-emerald-500 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Edit2 className="w-4 h-4" />
                  <span>ផ្ទាំងកែសម្រួលលម្អិត (Interactive Editor)</span>
                </button>

                <button
                  onClick={() => setActiveTab("latex")}
                  className={`px-4 py-2 text-xs md:text-sm font-semibold font-serif rounded-t-lg transition flex items-center space-x-1.5 ${
                    activeTab === "latex"
                      ? "bg-white text-emerald-600 border-t-2 border-emerald-500 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Code className="w-4 h-4" />
                  <span>ប្រភពកូដ LaTeX (XeLaTeX Text)</span>
                </button>
              </div>

              {/* LEFT/RIGHT Content Boxes */}
              <div className="lg:col-span-12 w-full">
                {activeTab === "preview" && (
                  /* ========================================================== */
                  /*                       1. LIVE PREVIEW                      */
                  /* ========================================================== */
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* View options sidebar card (no-print) */}
                    <div className="no-print w-full md:w-80 flex flex-col gap-4 shrink-0">
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center space-x-1.5 text-slate-800 font-bold font-serif text-sm mb-4 pb-1 border-b">
                          <Settings className="w-4 h-4 text-emerald-500" />
                          <span>លក្ខខណ្ឌការបង្ហាញក្រដាស</span>
                        </div>

                        {/* Toggle state to show/hide solution files */}
                        <div className="space-y-4">
                          <label className="flex items-center space-x-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={showSolutions}
                              onChange={(e) => setShowSolutions(e.target.checked)}
                              className="w-4.5 h-4.5 text-emerald-500 border-slate-300 rounded focus:ring-emerald-400"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700 font-serif">
                                បង្ហាញចម្លើយ / ដំណោះស្រាយ
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                បត់បែនសម្រាប់ការបោះពុម្ពដាច់ដោយឡែក
                              </span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={showTips}
                              onChange={(e) => setShowTips(e.target.checked)}
                              className="w-4.5 h-4.5 text-amber-500 border-slate-300 rounded focus:ring-amber-400"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700 font-serif">
                                បង្ហាញគន្លឹះដោះស្រាយ (Show Tips)
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                បន្ថែមការណែនាំគន្លឹះ ឬរូបមន្តគណនាអូតូ
                              </span>
                            </div>
                          </label>

                          <div className="pt-2">
                            <button
                              onClick={() => window.print()}
                              className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-serif font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
                            >
                              <Printer className="w-4 h-4" />
                              <span>បោះពុម្ពឬរក្សាទុកជា PDF</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Formatting Guide Note Card */}
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-500 leading-relaxed font-sans">
                        <div className="font-bold font-serif text-slate-700 mb-2 flex items-center">
                          💡 ជំនួយការមើល equations
                        </div>
                        ការប្រើប្រាស់រូបមន្ត LaTeX ជួយឲ្យសមីការមានរូបរាងស្អាតឥតខ្ចោះ។
                        ប្រសិនបើត្រូវការកែវា ចុចផ្ទាំង <strong className="text-slate-700">កែសម្រួល</strong> រួចប្រើប្រាស់សញ្ញាដុល្លារ <code className="bg-slate-200 px-1 rounded">$...$</code> ឧទាហរណ៍ដូចជា {"$x^2 + \\sqrt{y}$"}។
                      </div>
                    </div>

                    {/* RENDERED ACADEMIC PAPER MOCKUP CONTAINER - Beautiful A4 mockup style */}
                    <div className="flex-1">
                      <div className="print-area bg-white rounded-2xl shadow-sm border border-slate-300 p-8 md:p-12 min-h-[11in] math-paper selection:bg-emerald-100 select-all">
                        {/* Elegant academic Cambodian school style header block with Candidate info container */}
                        <div className="print-header mb-8 select-none">
                          {/* Standard high-fidelity national Bac II letterhead */}
                          <div className="flex justify-between items-start font-serif text-slate-900 mb-6 text-xs md:text-sm select-all">
                            {/* Left Side: Ministry of Education */}
                            <div className="text-center font-bold flex flex-col items-center">
                              <span className="leading-relaxed">ក្រសួងអប់រំ យុវជន និងកីឡា</span>
                              <div className="w-24 h-0.5 border-t border-dotted border-slate-400 mt-1.5 opacity-80"></div>
                            </div>

                            {/* Right Side: Kingdom Motto with official divider signature */}
                            <div className="text-center font-bold flex flex-col items-center">
                              <span className="leading-relaxed tracking-wider">ព្រះរាជាណាចក្រកម្ពុជា</span>
                              <span className="text-xs md:text-sm leading-relaxed tracking-wide">ជាតិ សាសនា ព្រះមហាក្សត្រ</span>
                              <div className="mt-1 flex justify-center">
                                <svg width="120" height="12" viewBox="0 0 120 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80 text-slate-700">
                                  <path d="M10,5 Q35,0 60,5 T110,5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                                  <path d="M20,7 Q42,3 60,7 T100,7" stroke="currentColor" strokeWidth="0.8" fill="none" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Main Title of exam category */}
                          <div className="text-center mb-4">
                            <span className="font-serif font-bold text-lg md:text-xl text-[#1e3a8a] tracking-normal">
                              {activeDocument?.metadata.grade?.includes("៩") || activeDocument?.metadata.grade?.includes("9")
                                ? "ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិ"
                                : "ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ"}
                            </span>{" "}
                            {!(activeDocument?.metadata.grade?.includes("៩") || activeDocument?.metadata.grade?.includes("9")) && (
                              <span className="font-serif font-semibold text-base md:text-lg text-[#ec4899]">
                                ({activeDocument?.metadata.stream ? activeDocument.metadata.stream : "វិទ្យាសាស្ត្រពិត"})
                              </span>
                            )}
                          </div>

                          {/* Candidates Fields split into 2 high-fidelity side-by-side boxes */}
                          <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto mb-3 text-[11px] md:text-xs">
                            <div className="border-[3px] border-double border-[#eab308] rounded-xl p-3 bg-[#fffdfa] text-left font-serif text-slate-800 shadow-sm flex flex-col justify-between print:p-2.5" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                              <div className="space-y-2">
                                <div className="flex items-end">
                                  <span className="shrink-0 font-bold text-slate-900 pr-1">សម័យប្រឡង ៖</span>
                                  <span className="flex-1 border-b border-dotted border-slate-400 pb-0.5 min-h-[1.2rem]"></span>
                                </div>
                                <div className="flex items-end">
                                  <span className="shrink-0 font-bold text-slate-900 pr-1">មណ្ឌលប្រឡង ៖</span>
                                  <span className="flex-1 border-b border-dotted border-slate-400 pb-0.5 min-h-[1.2rem]"></span>
                                </div>
                                <div className="flex items-end">
                                  <span className="shrink-0 font-bold text-slate-900 pr-1">នាមត្រកូល និងនាមខ្លួន ៖</span>
                                  <span className="flex-1 border-b border-dotted border-slate-400 pb-0.5 min-h-[1.2rem]"></span>
                                </div>
                              </div>
                            </div>

                            <div className="border-[3px] border-double border-[#eab308] rounded-xl p-3 bg-[#fffdfa] text-left font-serif text-slate-800 shadow-sm flex flex-col justify-between print:p-2.5" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                              <div className="space-y-2">
                                <div className="flex items-end">
                                  <span className="shrink-0 font-bold text-slate-900 pr-1">លេខបន្ទប់ ៖</span>
                                  <span className="flex-1 border-b border-dotted border-slate-400 pb-0.5 min-h-[1.2rem]"></span>
                                </div>
                                <div className="flex items-end">
                                  <span className="shrink-0 font-bold text-slate-900 pr-1">លេខតុ ៖</span>
                                  <span className="flex-1 border-b border-dotted border-slate-400 pb-0.5 min-h-[1.2rem]"></span>
                                </div>
                                <div className="flex items-end">
                                  <span className="shrink-0 font-bold text-slate-900 pr-1">ហត្ថលេខា ៖</span>
                                  <span className="flex-1 border-b border-dotted border-slate-400 pb-0.5 min-h-[1.2rem]"></span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bullet rule warning styled compactly below the 2 boxes */}
                          <div className="max-w-4xl mx-auto mb-4 text-center text-[10px] md:text-[11px] font-medium text-amber-800 px-1 select-none">
                            <p className="leading-relaxed font-serif">
                              ✦ បេក្ខជនទាំងអស់មិនត្រូវធ្វើសញ្ញាសម្គាល់អ្វីមួយនៅលើសន្លឹកប្រឡងឡើយ។ សន្លឹកប្រឡងណា ដែលមានសញ្ញាសម្គាល់នឹងត្រូវបានពិន្ទុសូន្យ។
                            </p>
                          </div>

                          {/* Spaced details metadata strip with colored headings and underline */}
                          <div className="grid grid-cols-3 gap-2 items-center text-center font-serif text-xs md:text-sm py-2 px-1 border-b-2 border-slate-800 select-all">
                            <div className="text-left font-bold flex items-center space-x-1">
                              <span className="text-blue-600">វិញ្ញាសាឆ្នាំ</span>
                              <span className="text-[#10b981]">{activeDocument?.metadata.date || "២០២៥"}</span>
                            </div>
                            <div className="text-center font-bold flex items-center justify-center space-x-1">
                              <span className="text-slate-800">ពិន្ទុសរុប</span>
                              <span className="text-[#ec4899] font-mono">{activeDocument?.metadata.totalPoints || "១៥៥"}</span>
                              <span className="text-[#ec4899]">ពិន្ទុ</span>
                            </div>
                            <div className="text-right font-bold flex items-center justify-end space-x-1">
                              <span className="text-slate-800">រយៈពេល</span>
                              <span className="text-[#f97316] font-mono">{activeDocument?.metadata.duration || "១៥០"}</span>
                              <span className="text-[#f97316]">នាទី</span>
                            </div>
                          </div>

                          {/* Render title & subtitle/subject nicely under the divider */}
                          <div className="text-center mt-6 mb-2 select-all">
                            <h2 className="text-lg md:text-[20px] font-bold font-serif text-slate-950 tracking-tight leading-normal uppercase">
                              {activeDocument?.title}
                            </h2>
                            {activeDocument?.subtitle && (
                              <p className="text-xs md:text-sm text-slate-500 font-serif mt-1 max-w-2xl mx-auto">
                                {activeDocument?.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Rendering core mathematical exercises modules */}
                        <div className="space-y-8 mt-6">
                          {activeDocument?.sections.map((sec, sIdx) => (
                            <div key={sec.id} className="print-section">
                              {/* Section Title Heading */}
                              <h3 className="text-sm md:text-base font-bold font-serif text-slate-900 flex items-center border-l-4 border-emerald-500 pl-3 py-1 bg-slate-50 mb-3 print:bg-slate-50 print:border-slate-800" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                                {sec.title}
                              </h3>

                              {sec.introduction && (
                                <p className="text-xs md:text-sm text-slate-500 italic mb-4 ml-1 pl-1 leading-relaxed">
                                  {sec.introduction}
                                </p>
                              )}

                              {/* Section items array list rendering */}
                              <div className="space-y-5 ml-4">
                                {sec.items.map((item, iIdx) => (
                                  <div
                                    key={item.id}
                                    className="border-b border-transparent pb-4 print:pb-3"
                                  >
                                    <div className="flex items-start gap-2 text-xs md:text-sm leading-relaxed">
                                      <span className="font-serif font-bold text-slate-800 shrink-0">
                                        លំហាត់ {item.number}៖
                                      </span>
                                      <div className="flex-1">
                                        <MathRenderer
                                          text={item.content}
                                          className="text-slate-800 font-serif text-xs md:text-sm"
                                        />

                                        {item.points && (
                                          <span className="text-[10px] md:text-xs text-slate-400 italic ml-1 select-none">
                                            ({item.points})
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Multiple choice options block if present in document */}
                                    {item.options && item.options.length > 0 && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 ml-7 text-xs md:text-sm">
                                        {item.options.map((opt, oIdx) => (
                                          <div key={oIdx} className="flex items-center space-x-2">
                                            <span className="font-bold text-slate-600 font-serif">
                                              ({String.fromCharCode(97 + oIdx)})
                                            </span>
                                            <MathRenderer text={opt} className="text-slate-700" />
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Cumulative Automated Tips / Hints */}
                                    {showTips && item.tip && (
                                      <div className="mt-3 ml-7 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs md:text-sm relative overflow-hidden break-inside-avoid print:border-amber-400" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                                        <div className="text-[10px] md:text-xs text-amber-800 font-bold font-serif mb-1.5 flex items-center">
                                          💡 គន្លឹះដោះស្រាយ (Exercise Tip)៖
                                        </div>
                                        <MathRenderer
                                          text={item.tip}
                                          className="text-amber-900 leading-relaxed font-sans"
                                        />
                                      </div>
                                    )}

                                    {/* Dynamic Toggleable Answer solutions rendering block */}
                                    {showSolutions && item.solution && (
                                      <div className="mt-3 ml-7 p-3 md:p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-xs md:text-sm relative overflow-hidden break-inside-avoid print:border-emerald-300" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                                        <div className="text-[10px] md:text-xs text-emerald-700 font-semibold font-serif mb-1 flex items-center">
                                          🔑 ដំណោះស្រាយលម្អិត (Solved Formula)៖
                                        </div>
                                        <MathRenderer
                                          text={item.solution}
                                          className="text-slate-600 italic font-sans print:not-italic"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Beautiful academic footer block */}
                        <div className="mt-12 pt-4 border-t border-slate-200 text-center flex flex-col items-center justify-center text-xs md:text-sm text-slate-500 font-serif">
                          <div className="flex items-center space-x-2 text-slate-700 bg-[#f8fafc] py-1.5 px-4 rounded-full border border-slate-100 print:border-none print:py-0 print:px-0">
                            <span className="font-bold">បង្រៀនដោយ លោកគ្រូ ឆយ សុវ៉ាន់ណេត</span>
                            <span className="text-slate-400">|</span>
                            <span>Tel: 016 567 437</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "editor" && (
                  /* ========================================================== */
                  /*                     2. INTERACTIVE EDITOR                  */
                  /* ========================================================== */
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 flex flex-col gap-6">
                    {/* Header edit meta controls */}
                    <div className="pb-4 border-b border-slate-100">
                      <h4 className="font-serif font-bold text-slate-800 text-sm mb-3 text-emerald-600 uppercase tracking-wider">
                        កែប្រែព័ត៌មានក្បាលទំព័រ (Main Metadata)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-slate-600 text-[11px] font-bold font-serif mb-1 uppercase">
                            ចំណងជើងធំ (Main Title)
                          </label>
                          <input
                            type="text"
                            value={editedDoc?.title || ""}
                            onChange={(e) => handleUpdateField("title", e.target.value)}
                            className="w-full px-3 py-2 text-xs md:text-sm rounded border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-bold font-serif mb-1 uppercase">
                            ចំណងជើងរង (Subtitle)
                          </label>
                          <input
                            type="text"
                            value={editedDoc?.subtitle || ""}
                            onChange={(e) => handleUpdateField("subtitle", e.target.value)}
                            className="w-full px-3 py-2 text-xs md:text-sm rounded border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-bold font-serif mb-1 uppercase">
                            គ្រឹះស្ថានសិក្សា / ស្ថាប័ន (School name)
                          </label>
                          <input
                            type="text"
                            value={editedDoc?.metadata.institution || ""}
                            onChange={(e) => handleUpdateMetadataField("institution", e.target.value)}
                            className="w-full px-3 py-2 text-xs md:text-sm rounded border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Grade and timings parameters edit inside metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
                        <div>
                          <label className="block text-slate-600 text-[11px] font-bold font-serif mb-1 uppercase">
                            កម្រិតថ្នាក់ (Grade)
                          </label>
                          <input
                            type="text"
                            value={editedDoc?.metadata.grade || ""}
                            onChange={(e) => handleUpdateMetadataField("grade", e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-bold font-serif mb-1 uppercase">
                            ផ្នែកសិក្សា (Study Track)
                          </label>
                          <input
                            type="text"
                            value={editedDoc?.metadata.stream || ""}
                            onChange={(e) => handleUpdateMetadataField("stream", e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none"
                            placeholder="ឧ. វិទ្យាសាស្ត្រពិត ឬ វិទ្យាសាស្ត្រសង្គម"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-bold font-serif mb-1 uppercase">
                            មុខវិជ្ជា/មាតិកា (Subject)
                          </label>
                          <input
                            type="text"
                            value={editedDoc?.metadata.subject || ""}
                            onChange={(e) => handleUpdateMetadataField("subject", e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-bold font-serif mb-1 uppercase">
                            រយៈពេលអនុវត្ត (Duration)
                          </label>
                          <input
                            type="text"
                            value={editedDoc?.metadata.duration || ""}
                            onChange={(e) => handleUpdateMetadataField("duration", e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-bold font-serif mb-1 uppercase">
                            ពិន្ទុសរុប (Total Points)
                          </label>
                          <input
                            type="text"
                            value={editedDoc?.metadata.totalPoints || ""}
                            onChange={(e) => handleUpdateMetadataField("totalPoints", e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sequential Sections Interactive elements controls list */}
                    <div className="space-y-6">
                      {editedDoc?.sections.map((sec, sIdx) => (
                        <div
                          key={sec.id}
                          className="p-5 border border-slate-200 bg-[#f8fafc] rounded-xl relative group-section"
                        >
                          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                            <div className="flex items-center space-x-2 flex-1 max-w-xl">
                              <span className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded font-bold font-serif">
                                ផ្នែកទី {sIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={sec.title}
                                onChange={(e) => handleUpdateSectionTitle(sec.id, e.target.value, sec.introduction)}
                                className="w-full px-2 py-1 text-xs font-bold font-serif rounded border border-slate-300 focus:outline-none bg-white"
                                placeholder="ចំណងជើងផ្នែក (Section Title)"
                              />
                            </div>
                            <button
                              onClick={() => handleDeleteSection(sec.id)}
                              className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1 rounded ml-4 transition flex items-center text-xs"
                              title="លុបផ្នែកនេះ"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> លុបបំបាត់
                            </button>
                          </div>

                          {/* Section Introdution Line */}
                          <div className="mb-4">
                            <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">
                              សេចក្ដីណែនាំ / Introduction text
                            </label>
                            <input
                              type="text"
                              value={sec.introduction || ""}
                              onChange={(e) => handleUpdateSectionTitle(sec.id, sec.title, e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                              placeholder="ចូរគណនាលំហាត់ដូចតទៅ៖"
                            />
                          </div>

                          {/* Exercises items mapping lists */}
                          <div className="space-y-4 pl-3 border-l-2 border-slate-300">
                            {sec.items.map((item, iIdx) => (
                              <div
                                key={item.id}
                                className="p-4 bg-white rounded-lg border border-slate-100 flex flex-col gap-3 relative"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-slate-700 font-serif">
                                      លំហាត់សន្ទស្សន៍
                                    </span>
                                    <input
                                      type="text"
                                      value={item.number}
                                      onChange={(e) =>
                                        handleUpdateItem(sec.id, item.id, { number: e.target.value })
                                      }
                                      className="w-12 text-center px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs"
                                    />
                                    <span className="text-xs font-bold text-slate-700 font-serif pl-2">
                                      ពិន្ទុ៖
                                    </span>
                                    <input
                                      type="text"
                                      value={item.points || ""}
                                      onChange={(e) =>
                                        handleUpdateItem(sec.id, item.id, { points: e.target.value })
                                      }
                                      placeholder="ឧទាហរណ៍៖ ១០ ពិន្ទុ"
                                      className="w-24 text-center px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs"
                                    />
                                  </div>

                                  <button
                                    onClick={() => handleDeleteItem(sec.id, item.id)}
                                    className="text-slate-400 hover:text-red-500 hover:bg-slate-50 p-1 rounded transition"
                                    title="លុបលំហាត់"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Text content statement edit */}
                                <div>
                                  <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">
                                    ប្រធានលំហាត់ / Math content (អាចប្រើប្រាស់ LaTeX $...$)
                                  </label>
                                  <textarea
                                    value={item.content}
                                    onChange={(e) =>
                                      handleUpdateItem(sec.id, item.id, { content: e.target.value })
                                    }
                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-sans leading-relaxed focus:outline-none h-16"
                                  ></textarea>
                                </div>

                                {/* Multiple Choice edits if present */}
                                {item.options && item.options.length > 0 && (
                                  <div>
                                    <span className="block text-slate-500 text-[10px] uppercase font-bold mb-1">
                                      ជម្រើសពហុជ្រើសរើស (Multiple Choices options)
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {item.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center space-x-1.5">
                                          <span className="font-bold text-xs">
                                            ({String.fromCharCode(97 + oIdx)})
                                          </span>
                                          <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) =>
                                              handleItemOptionChange(sec.id, item.id, oIdx, e.target.value)
                                            }
                                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Solution solver edit */}
                                <div>
                                  <label className="block text-emerald-700 text-[10px] uppercase font-bold mb-1">
                                    ដំណោះស្រាយលម្អិតរបស់ AI
                                  </label>
                                  <textarea
                                    value={item.solution}
                                    onChange={(e) =>
                                      handleUpdateItem(sec.id, item.id, { solution: e.target.value })
                                    }
                                    className="w-full text-xs px-2.5 py-1.5 border border-emerald-200 bg-emerald-50/10 rounded font-sans leading-relaxed focus:ring-1 focus:ring-emerald-400 focus:outline-none h-24 italic"
                                  ></textarea>
                                </div>

                                {/* Tip reminder edit */}
                                <div>
                                  <label className="block text-amber-700 text-[10px] uppercase font-bold mb-1">
                                    គន្លឹះ ឬរូបមន្តជំនួយអូតូ (Auto Tip / Hint)
                                  </label>
                                  <textarea
                                    value={item.tip || ""}
                                    onChange={(e) =>
                                      handleUpdateItem(sec.id, item.id, { tip: e.target.value })
                                    }
                                    placeholder="បញ្ចូលការណែនាំគន្លឹះដោះស្រាយលំហាត់នេះ..."
                                    className="w-full text-xs px-2.5 py-1.5 border border-amber-200 bg-amber-50/10 rounded font-sans leading-relaxed focus:ring-1 focus:ring-amber-400 focus:outline-none h-16"
                                  ></textarea>
                                </div>
                              </div>
                            ))}

                            <button
                              onClick={() => handleAddNewItem(sec.id)}
                              className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-lg hover:bg-emerald-50/10 text-slate-500 hover:text-emerald-700 flex items-center justify-center space-x-1 text-xs md:text-sm font-semibold transition"
                            >
                              <PlusCircle className="w-4 h-4" />
                              <span>បន្ថែមលំហាត់ថ្មីក្នុងផ្នែកនេះ</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add standard new section block altogether */}
                      <button
                        onClick={handleAddNewSection}
                        className="w-full h-12 border-2 border-dashed border-emerald-300 hover:border-emerald-600 rounded-xl hover:bg-emerald-50/20 text-emerald-700 flex items-center justify-center space-x-2 text-sm font-bold tracking-wide transition cursor-pointer"
                      >
                        <PlusCircle className="w-5 h-5" />
                        <span>បន្ថែមផ្នែកថ្មីទាំងស្រុង (Add Section)</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "latex" && (
                  /* ========================================================== */
                  /*                       3. LATEX VIEWER                      */
                  /* ========================================================== */
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-slate-800 text-sm md:text-base">
                          ប្រភពកូដ XeLaTeX បោះពុម្ពសៀវភៅលំដាប់ខ្ពស់
                        </h4>
                        <p className="text-slate-400 font-sans text-xs">
                          អ្នកអាចយកកូដខាងក្រោមនេះទៅចងក្រង (Compile) នៅក្នុងកម្មវិធី Overleaf ឬ TeXstudio
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const code = getInlineAndDisplayLatexTextCode();
                          navigator.clipboard.writeText(code);
                          alert("ចម្លងកូដ LaTeX បានសម្រេច!");
                        }}
                        className="flex items-center px-3.5 py-1.5 text-xs text-slate-700 font-semibold bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-300 rounded transition"
                      >
                        ចម្លងកូដ (Copy LaTeX)
                      </button>
                    </div>

                    <pre className="w-full font-mono text-xs text-slate-700 bg-slate-950 text-emerald-400 p-5 rounded-xl overflow-x-auto leading-relaxed border border-slate-800 select-all max-h-[500px]">
                      {getInlineAndDisplayLatexTextCode()}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Elegant Floating Spinner Overlays inside app action */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center flex-col px-4 text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
            <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-lg font-serif font-bold text-white tracking-wide">
            កំពុងរៀបចំជាមួយបញ្ញាសិប្បនិម្មិត (AI Processing)
          </p>
          <p className="text-emerald-400 text-sm mt-2 max-w-sm font-sans italic animate-pulse">
            {loadingStep}
          </p>
          <p className="text-slate-500 text-[11px] mt-6 max-w-xs leading-relaxed">
            ដំណើរការនេះអាចចំណាយពេលបន្តិច ដើម្បីដោះស្រាយយ៉ាងជាក់លាក់បំផុត និងរចនាសមីការ LaTeX។
          </p>
        </div>
      )}

      {/* Header and footers links */}
      <footer className="no-print mt-auto py-6 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
        <p className="font-sans leading-relaxed">
          © ២០២៦ Math Organizer AI • បង្កើតកម្រងមេរៀន និងវិញ្ញាសាគណិតវិទ្យាជាមួយនឹង KaTeX & XeLaTeX
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          រៀបចំដោយម៉ាស៊ីន server-side គណិតវិទ្យារឹងមាំ សហការជាមួយ Gemini
        </p>
      </footer>
    </div>
  );
}
