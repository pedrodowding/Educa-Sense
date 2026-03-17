import { Question } from "../../types";

export type QuestionMode = 'multiple' | 'open' | 'mixed';

export const normalizeQuestions = (questions: any[]): Question[] => {
  return (Array.isArray(questions) ? questions : []).map((q: any, idx: number) => {
    const type = q?.type === 'open' || q?.type === 'multiple' || q?.type === 'sequence' ? q.type : 'multiple';
    const options = Array.isArray(q?.options) ? q.options.filter((x: any) => typeof x === 'string') : undefined;
    const base: Question = {
      id: q?.id ? String(q.id) : `${Date.now()}-${idx}-${Math.random().toString(16).slice(2)}`,
      text: q?.text ? String(q.text) : '',
      type,
      correctAnswer: q?.correctAnswer ? String(q.correctAnswer) : '',
      explanation: q?.explanation ? String(q.explanation) : ''
    };

    if (type === 'multiple') {
      return { ...base, options: (options && options.length > 0 ? options : undefined) };
    }
    return { ...base, options: undefined };
  });
};

export const parseJsonResponse = (rawText: string | undefined): any => {
  const text = (rawText || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(text || "{}");
};

const resolveMultipleCorrectAnswer = (correctAnswer: string, options: string[]): string => {
  const trimmed = (correctAnswer || '').trim();
  if (trimmed && options.includes(trimmed)) return trimmed;

  const letter = trimmed.toUpperCase();
  const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  if (letter in letterMap && options[letterMap[letter]]) return options[letterMap[letter]];

  const num = Number.parseInt(trimmed, 10);
  if (Number.isFinite(num) && num >= 1 && num <= 4 && options[num - 1]) return options[num - 1];

  return options[0] || '';
};

export const sanitizeQuestionsForMode = (questions: Question[], mode: QuestionMode): Question[] => {
  return (Array.isArray(questions) ? questions : []).map((q) => {
    if (mode === 'open') {
      return { ...q, type: 'open', options: undefined, correctAnswer: (q.correctAnswer || '').trim() };
    }

    if (mode === 'multiple') {
      const rawOptions = Array.isArray(q.options) ? q.options.filter(x => typeof x === 'string') : [];
      const options = rawOptions.length > 4 ? rawOptions.slice(0, 4) : rawOptions;
      const correctAnswer = resolveMultipleCorrectAnswer(q.correctAnswer || '', options);
      return { ...q, type: 'multiple', options: options.length > 0 ? options : undefined, correctAnswer };
    }

    if (q.type === 'open') {
      return { ...q, type: 'open', options: undefined, correctAnswer: (q.correctAnswer || '').trim() };
    }

    const rawOptions = Array.isArray(q.options) ? q.options.filter(x => typeof x === 'string') : [];
    const options = rawOptions.length > 4 ? rawOptions.slice(0, 4) : rawOptions;
    const correctAnswer = resolveMultipleCorrectAnswer(q.correctAnswer || '', options);
    return { ...q, type: 'multiple', options: options.length > 0 ? options : undefined, correctAnswer };
  });
};

const isValidMultiple = (q: Question): boolean => {
  const options = Array.isArray(q.options) ? q.options.filter(x => typeof x === 'string') : [];
  if (q.type !== 'multiple') return false;
  if (options.length !== 4) return false;
  if (!q.correctAnswer || !options.includes(q.correctAnswer)) return false;
  return true;
};

const isValidOpen = (q: Question): boolean => {
  if (q.type !== 'open') return false;
  if (q.options && q.options.length > 0) return false;
  if (!q.correctAnswer) return false;
  return true;
};

export const enforceQuestionConstraints = (
  questions: Question[],
  mode: QuestionMode,
  questionCount: number
): { questions: Question[]; needsRepair: boolean } => {
  const count = Number.isFinite(questionCount) ? Math.max(1, Math.floor(questionCount)) : 5;
  const sanitized = sanitizeQuestionsForMode(questions, mode);

  if (mode === 'multiple') {
    const valid = sanitized.filter(isValidMultiple);
    if (valid.length >= count) return { questions: valid.slice(0, count), needsRepair: false };
    return { questions: valid.slice(0, count), needsRepair: true };
  }

  if (mode === 'open') {
    const valid = sanitized.filter(isValidOpen);
    if (valid.length >= count) return { questions: valid.slice(0, count), needsRepair: false };
    return { questions: valid.slice(0, count), needsRepair: true };
  }

  const multipleTarget = Math.floor(count / 2);
  const openTarget = count - multipleTarget;

  const multiples = sanitized.filter(isValidMultiple).slice(0, multipleTarget);
  const opens = sanitized.filter(isValidOpen).slice(0, openTarget);
  const combined = [...multiples, ...opens].slice(0, count);

  const ok = multiples.length === multipleTarget && opens.length === openTarget && combined.length === count;
  return { questions: combined, needsRepair: !ok };
};
