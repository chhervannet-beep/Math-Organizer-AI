import React, { useMemo } from "react";
import katex from "katex";

interface MathRendererProps {
  text: string;
  className?: string;
  block?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = "", block = false }) => {
  const renderedContent = useMemo(() => {
    if (!text) return null;

    // Normalize newlines for stable regex matching and rendering
    const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Helper to safely render LaTeX to HTML string
    const renderMath = (latex: string, displayMode: boolean) => {
      try {
        // Clean backslashes which can get doubled in markdown/JSON translation
        const cleaned = latex.replace(/\\\\/g, "\\").trim();
        return katex.renderToString(cleaned, {
          displayMode,
          throwOnError: false,
          trust: true,
        });
      } catch (err) {
        console.error("KaTeX rendering error for:", latex, err);
        return `<span class="bg-red-50 text-red-600 px-1 py-0.5 rounded font-mono text-xs">${latex}</span>`;
      }
    };

    // If block is explicitly requested
    if (block) {
      return (
        <div
          className="math-scroll py-2 text-center"
          dangerouslySetInnerHTML={{ __html: renderMath(normalizedText, true) }}
        />
      );
    }

    // Step 1: Split by display math ($$...$$)
    const displayParts = normalizedText.split(/(\$\$.*?\$\$)/gs);

    return displayParts.map((part, pIdx) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const formula = part.slice(2, -2);
        return (
          <div
            key={`display-${pIdx}`}
            className="math-scroll my-3 text-center overflow-x-auto select-all"
            dangerouslySetInnerHTML={{ __html: renderMath(formula, true) }}
          />
        );
      }

      // Step 2: Split standard parts by inline math ($...$)
      // Use regex that avoids splitting on single \$ which is escaped currency.
      // Set the 's' flag to cross multi-line content for robust inline parsing.
      const inlineParts = part.split(/(\$.*?\$)/gs);

      return (
        <span key={`text-block-${pIdx}`} className="leading-relaxed">
          {inlineParts.map((subPart, sIdx) => {
            if (subPart.startsWith("$") && subPart.endsWith("$")) {
              const formula = subPart.slice(1, -1);
              return (
                <span
                  key={`inline-${sIdx}`}
                  className="inline select-all font-serif px-0.5"
                  dangerouslySetInnerHTML={{ __html: renderMath(formula, false) }}
                />
              );
            }
            return <React.Fragment key={`txt-${sIdx}`}>{subPart}</React.Fragment>;
          })}
        </span>
      );
    });
  }, [text, block]);

  return <div className={`inline-block w-full max-w-full ${className}`}>{renderedContent}</div>;
};
