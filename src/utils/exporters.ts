import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx";
import { MathDocument } from "../types";

// ==========================================
// 1. LATEX EXPORTER (.tex download)
// ==========================================
export const exportLatex = (doc: MathDocument) => {
  const showStream = !(doc.metadata.grade?.includes("៩") || doc.metadata.grade?.includes("9"));
  const examTitle = (doc.metadata.grade?.includes("៩") || doc.metadata.grade?.includes("9"))
    ? "ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិ"
    : "ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ";
  const streamText = doc.metadata.stream || "វិទ្យាសាស្ត្រពិត";

  let tex = `% XeLaTeX Template for Beautiful Cambodian Cambodian Mathematical documents
% Compile with XeLaTeX engine to support Khmer Unicode characters
\\documentclass[12pt,a4paper]{article}

\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{geometry}
\\usepackage{fontspec}
\\usepackage{xcolor}
\\usepackage{geometry}
\\usepackage{tcolorbox}
\\usepackage{enumitem}

\\geometry{a4paper, left=2.0cm, right=2.0cm, top=2.2cm, bottom=2.2cm}

% Configure Khmer font (Change to Nokora or Khmer OS Siemreap depending on system)
\\setmainfont[
  BoldFont={Nokora-Bold},
 ]{Nokora}

\\definecolor{primary}{HTML}{0F172A}
\\definecolor{accent}{HTML}{10B981}

\\begin{document}

% ==================== HEADER ====================
\\noindent
\\begin{tabular*}{\\textwidth}{@{\\extracolsep{\\fill}}c c@{}}
    \\textbf{ក្រសួងអប់រំ យុវជន និងកីឡា} & \\textbf{ព្រះរាជាណាចក្រកម្ពុជា} \\\\
    \\makebox[4.8cm][c]{\\dotfill} & \\textbf{ជាតិ សាសនា ព្រះមហាក្សត្រ} \\\\
    & \\makebox[4.2cm][c]{\\hrulefill}
\\end{tabular*}

\\vspace{12pt}

\\begin{center}
    {\\fontsize{14}{17}\\selectfont \\textbf{\\color{blue}${examTitle}${showStream ? ` \\color{magenta}(${streamText})` : ""}}} \\\\
\\end{center}

\\vspace{3pt}

\\begin{tcolorbox}[colframe=orange, colback=white, arc=3mm, boxrule=1.5pt, width=\\textwidth]
    \\noindent
    \\begin{tabular}{@{}p{0.5\\textwidth} p{0.5\\textwidth}@{}}
        \\textbf{សម័យប្រឡង ៖} \\dotfill & \\textbf{លេខបន្ទប់ ៖} \\dotfill \\\\
        \\textbf{មណ្ឌលប្រឡង ៖} \\dotfill & \\textbf{លេខតុ ៖} \\dotfill \\\\
        \\textbf{នាមត្រកូល និងនាមខ្លួន ៖} \\dotfill & \\textbf{ហត្ថលេខា ៖} \\dotfill \\\\
    \\end{tabular}
    \\vspace{4pt}
    \\hrule
    \\vspace{4pt}
    {\\fontsize{8}{10}\\selectfont \\color{orange!80!black} ✦ បេក្ខជនទាំងអស់មិនត្រូវធ្វើសញ្ញាសម្គាល់អ្វីមួយនៅលើសន្លឹកប្រឡងឡើយ។ សន្លឹកប្រឡងណា ដែលមានសញ្ញាសម្គាល់នឹងត្រូវបានពិន្ទុសូន្យ។}
\\end{tcolorbox}

\\vspace{4pt}

\\noindent
\\begin{tabular}{@{}p{0.33\\textwidth} p{0.33\\textwidth} r@{}}
    \\textbf{\\color{blue}វិញ្ញាសាឆ្នាំ ៖} \\color{green!60!black}${doc.metadata.date || "២០២៥"} & \\hfill \\textbf{ពិន្ទុសរុប ៖} \\color{magenta}${doc.metadata.totalPoints || "១៥៥"} ពិន្ទុ & \\hfill \\textbf{រយៈពេល ៖} \\color{orange}${doc.metadata.duration || "១៥០"} នាទី
\\end{tabular}

\\vspace{8pt}
\\hrule height 1pt
\\vspace{10pt}

\\begin{center}
    {\\fontsize{15}{18}\\selectfont \\textbf{${doc.title}}} \\\\
    \\vspace{2pt}
    {\\fontsize{11}{13}\\selectfont ${doc.subtitle || ""}} \\\\
\\end{center}

\\vspace{15pt}

% ==================== CONTENT ====================
`;

  doc.sections.forEach((sec, sIdx) => {
    // Escape standard latex characters if required, but keep equations $...$ intact
    const cleanSectionTitle = cleanLatexText(sec.title);
    const cleanIntro = sec.introduction ? cleanLatexText(sec.introduction) : "";

    tex += `\n% ---------- Section: ${sec.title} ----------\n`;
    tex += `\\section*{${cleanSectionTitle}}\n`;
    if (cleanIntro) {
      tex += `{\\it ${cleanIntro}}\n\\vspace{8pt}\n`;
    }

    tex += `\\begin{enumerate}[label=\\bf ${sec.title.includes("ក") ? "ក" : "លំហាត់"} \\arabic*:]\n`;

    sec.items.forEach((item) => {
      // Process math structures internally
      const contentLatex = item.content.replace(/\\\\/g, "\\");
      tex += `  \\item \\textbf{${item.number}} ${item.points ? `\\hfill \\textit{${item.points}}` : ""}\n`;
      tex += `    ${contentLatex}\n`;

      if (item.options && item.options.length > 0) {
        tex += `    \\begin{enumerate}[label=(\\alph*), ncol=2]\n`;
        item.options.forEach((opt) => {
          tex += `      \\item ${opt.replace(/\\\\/g, "\\")}\n`;
        });
        tex += `    \\end{enumerate}\n`;
      }

      // Append tip block if available
      if (item.tip) {
        const tipLatex = item.tip.replace(/\\\\/g, "\\");
        tex += `    \\begin{tcolorbox}[colback=orange!5, colframe=orange!80, title=គន្លឹះដោះស្រាយ]\n`;
        tex += `      ${tipLatex}\n`;
        tex += `    \\end{tcolorbox}\n`;
      }

      // Append solution/explanation block
      if (item.solution) {
        const solutionLatex = item.solution.replace(/\\\\/g, "\\");
        tex += `    \\begin{tcolorbox}[colback=slate!5, colframe=slate!80, title=ដំណោះស្រាយ]\n`;
        tex += `      ${solutionLatex}\n`;
        tex += `    \\end{tcolorbox}\n`;
      }
      tex += `    \\vspace{10pt}\n`;
    });

    tex += `\\end{enumerate}\n\\vspace{15pt}\n`;
  });

  // Adding the requested signature footer
  tex += `\n\\vspace{20pt}\n\\begin{center}\n  \\hrule height 0.5pt\n  \\vspace{5pt}\n  {\\fontsize{10}{12}\\selectfont \\textbf{បង្រៀនដោយ លោកគ្រូ ឆយ សុវ៉ាន់ណេត} \\quad \\textbf{Tel: 016 567 437}}\n\\end{center}\n`;

  tex += `\n\\end{document}\n`;

  // Trigger web file download
  const blob = new Blob([tex], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${doc.title.replace(/\s+/g, "_") || "math_document"}.tex`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper utility to clean LaTeX characters roughly
function cleanLatexText(str: string): string {
  return str
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/#/g, "\\#");
}

// ==========================================
// 2. WORD EXPORTER (.docx download)
// ==========================================
export const exportWord = async (doc: MathDocument) => {
  // Construct sections for docx document using paragraphs
  const children: any[] = [];

  // 1. Double column Letterhead table in Word
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "ក្រសួងអប់រំ យុវជន និងកីឡា", bold: true, font: "Nokora", size: 20 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "........................................", color: "94A3B8", size: 16 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "ព្រះរាជាណាចក្រកម្ពុជា", bold: true, font: "Nokora", size: 20 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "ជាតិ សាសនា ព្រះមហាក្សត្រ", bold: true, font: "Nokora", size: 18 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "~~~~~~~~~~~~~~~~", color: "475569", size: 16 }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 120 } })
  );

  // Upper exam title line for Word
  const showStream = !(doc.metadata.grade?.includes("៩") || doc.metadata.grade?.includes("9"));
  const examTitle = (doc.metadata.grade?.includes("៩") || doc.metadata.grade?.includes("9"))
    ? "ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិ"
    : "ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ";
  const streamText = doc.metadata.stream || "វិទ្យាសាស្ត្រពិត";

  const upperExamChildren: any[] = [
    new TextRun({
      text: examTitle + " ",
      bold: true,
      font: "Nokora",
      size: 28, // 14pt
      color: "1e3a8a",
    }),
  ];

  if (showStream) {
    upperExamChildren.push(
      new TextRun({
        text: `(${streamText})`,
        bold: true,
        font: "Nokora",
        size: 24, // 12pt
        color: "ec4899",
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: upperExamChildren,
    })
  );

  // Candidates Fields Table with double amber boundary rules in Word
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.DOUBLE, size: 12, color: "eab308" },
        bottom: { style: BorderStyle.DOUBLE, size: 12, color: "eab308" },
        left: { style: BorderStyle.DOUBLE, size: 12, color: "eab308" },
        right: { style: BorderStyle.DOUBLE, size: 12, color: "eab308" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [new TextRun({ text: "សម័យប្រឡង ៖ ....................................", bold: true, font: "Nokora", size: 20 })],
                }),
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [new TextRun({ text: "មណ្ឌលប្រឡង ៖ ....................................", bold: true, font: "Nokora", size: 20 })],
                }),
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [new TextRun({ text: "នាមត្រកូល និងនាមខ្លួន ៖ ....................................", bold: true, font: "Nokora", size: 20 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [new TextRun({ text: "លេខបន្ទប់ ៖ ....................................", bold: true, font: "Nokora", size: 20 })],
                }),
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [new TextRun({ text: "លេខតុ ៖ ....................................", bold: true, font: "Nokora", size: 20 })],
                }),
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [new TextRun({ text: "ហត្ថលេខា ៖ ....................................", bold: true, font: "Nokora", size: 20 })],
                }),
              ],
            }),
          ],
        }),
        // Warning note row inside table
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              children: [
                new Paragraph({
                  spacing: { before: 120, after: 60 },
                  children: [
                    new TextRun({
                      text: "✦ បេក្ខជនទាំងអស់មិនត្រូវធ្វើសញ្ញាសម្គាល់អ្វីមួយនៅលើសន្លឹកប្រឡងឡើយ។ សន្លឹកប្រឡងណា ដែលមានសញ្ញាសម្គាល់នឹងត្រូវបានពិន្ទុសូន្យ។",
                      font: "Nokora",
                      size: 16,
                      color: "c2410c",
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 120 } })
  );

  // Stats Details Strip as a horizontal borderless table
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: "0F172A" },
        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({ text: "វិញ្ញាសាឆ្នាំ ៖ ", bold: true, font: "Nokora", size: 20, color: "2563eb" }),
                    new TextRun({ text: doc.metadata.date || "២០២៥", bold: true, font: "Nokora", size: 20, color: "10b981" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "ពិន្ទុសរុប ៖ ", bold: true, font: "Nokora", size: 20, color: "0F172A" }),
                    new TextRun({ text: `${doc.metadata.totalPoints || "១៥៥"} ពិន្ទុ`, bold: true, font: "Nokora", size: 20, color: "ec4899" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: "រយៈពេល ៖ ", bold: true, font: "Nokora", size: 20, color: "0F172A" }),
                    new TextRun({ text: `${doc.metadata.duration || "១៥០"} នាទី`, bold: true, font: "Nokora", size: 20, color: "f97316" }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 240 } })
  );

  // Document actual Title Block
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 120 },
      children: [
        new TextRun({
          text: doc.title,
          bold: true,
          font: "Nokora",
          size: 32, // 16pt
          color: "0F172A",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: doc.subtitle || "",
          font: "Kantumruy Pro",
          size: 22, // 11pt
          color: "475569",
          italics: true,
        }),
      ],
    })
  );

  // Items and Sections loop
  doc.sections.forEach((sec) => {
    // Section Header
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: sec.title,
            bold: true,
            font: "Nokora",
            size: 28, // 14pt
            color: "0F172A",
          }),
        ],
      })
    );

    if (sec.introduction) {
      children.push(
        new Paragraph({
          spacing: { after: 180 },
          children: [
            new TextRun({
              text: sec.introduction,
              italics: true,
              font: "Kantumruy Pro",
              size: 22,
              color: "334155",
            }),
          ],
        })
      );
    }

    sec.items.forEach((item) => {
      // Create exercise text runs
      const itemRuns: TextRun[] = [];

      itemRuns.push(
        new TextRun({
          text: `${item.number}. `,
          bold: true,
          font: "Kantumruy Pro",
          size: 22,
        })
      );

      // Clean equation backslashes before rendering
      const contentClean = item.content.replace(/\\\\/g, "\\");
      itemRuns.push(
        new TextRun({
          text: contentClean,
          font: "Kantumruy Pro",
          size: 22,
        })
      );

      if (item.points) {
        itemRuns.push(
          new TextRun({
            text: ` (${item.points})`,
            italics: true,
            font: "Kantumruy Pro",
            size: 20,
            color: "64748B",
          })
        );
      }

      children.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          children: itemRuns,
        })
      );

      // Render Multiple Choice Options
      if (item.options && item.options.length > 0) {
        item.options.forEach((opt, oIdx) => {
          const char = String.fromCharCode(97 + oIdx); // a, b, c, d
          children.push(
            new Paragraph({
              indent: { left: 360 }, // Indent options nicely
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: `(${char}) `,
                  bold: true,
                  font: "Kantumruy Pro",
                  size: 22,
                }),
                new TextRun({
                  text: opt.replace(/\\\\/g, "\\"),
                  font: "Kantumruy Pro",
                  size: 22,
                }),
              ],
            })
          );
        });
      }

      // Add Tip Block
      if (item.tip) {
        const tipClean = item.tip.replace(/\\\\/g, "\\");
        children.push(
          new Paragraph({
            indent: { left: 180 },
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: "គន្លឹះដោះស្រាយ (Tip)៖\n",
                bold: true,
                color: "D97706",
                font: "Kantumruy Pro",
                size: 20,
              }),
              new TextRun({
                text: tipClean,
                font: "Kantumruy Pro",
                size: 20,
                color: "78350F",
              }),
            ],
          })
        );
      }

      // Add Solution Block
      if (item.solution) {
        const solClean = item.solution.replace(/\\\\/g, "\\");
        children.push(
          new Paragraph({
            indent: { left: 180 },
            spacing: { before: 120, after: 180 },
            children: [
              new TextRun({
                text: "ដំណោះស្រាយលម្អិត៖\n",
                bold: true,
                color: "10B981",
                font: "Kantumruy Pro",
                size: 20,
              }),
              new TextRun({
                text: solClean,
                font: "Kantumruy Pro",
                size: 20,
                italics: true,
                color: "475569",
              }),
            ],
          })
        );
      }
    });
  });

  // Adding clean divider and teacher footer block
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: "_________________________________________________________",
          color: "CBD5E1",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({
          text: "បង្រៀនដោយ លោកគ្រូ ឆយ សុវ៉ាន់ណេត    Tel: 016 567 437",
          bold: true,
          font: "Nokora",
          size: 22,
          color: "0F172A",
        }),
      ],
    })
  );

  // Pack and download standard Word document (.docx)
  const wordDocument = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(wordDocument);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${doc.title.replace(/\s+/g, "_") || "math_document"}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
