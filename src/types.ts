export interface MathItem {
  id: string;
  number: string;
  content: string;
  options?: string[];
  solution: string;
  points?: string;
  tip?: string;
}

export interface MathSection {
  id: string;
  title: string;
  introduction?: string;
  items: MathItem[];
}

export interface MathDocumentMetadata {
  grade: string;
  stream?: string;
  subject: string;
  duration?: string;
  totalPoints?: string;
  date?: string;
  institution?: string;
}

export interface MathDocument {
  title: string;
  subtitle: string;
  type: "exam" | "lesson";
  metadata: MathDocumentMetadata;
  sections: MathSection[];
}

export interface SavedDraft {
  id: string;
  name: string;
  dateUpdated: string;
  document: MathDocument;
}
