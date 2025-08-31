import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin } from "../../utils/auth";
import {
  getQuizWithQuestions,
  updateQuiz,
  UpsertQuestionRequest,
  CreateQuizRequest,
} from "../../services/quizService";
import { QuizDto, QuestionDto, AnswerDto } from "../../models/Quiz";

const questionTypeOptions = [
  { value: 0, label: "Single Choice" },
  { value: 1, label: "Multiple Choice" },
  { value: 2, label: "True/False" },
  { value: 3, label: "Fill In The Blank" },
];

const QuizEdit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (user && !isAdmin(user)) {
      navigate("/");
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [quiz, setQuiz] = useState<QuizDto | null>(null);

  const [meta, setMeta] = useState<CreateQuizRequest>({
    title: "",
    description: "",
    category: "",
    difficulty: 1,
    timeLimitSeconds: 300,
  });

  const fetchQuiz = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getQuizWithQuestions(id);
      setQuiz(data);
      setMeta({
        title: data.title,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty ?? 1,
        timeLimitSeconds: data.timeLimitSeconds ?? 300,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz, id]);

  const onSaveAll = async () => {
    if (!id || !quiz) return;
    setSaving(true);
    setError("");
    try {
      // map current quiz state to UpdateQuizRequest
      const mappedQuestions: UpsertQuestionRequest[] = (quiz.questions || []).map((q) => ({
        id: q.id,
        text: q.text,
        questionType: q.questionType,
        answers: (q.answers || []).map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
      }));
      await updateQuiz(id, {
        title: meta.title.trim(),
        description: meta.description?.trim() || undefined,
        category: meta.category?.trim() || undefined,
        difficulty: meta.difficulty,
        timeLimitSeconds: meta.timeLimitSeconds,
        questions: mappedQuestions,
      });
      await fetchQuiz();
    } catch (e: any) {
      setError(e?.message || "Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  const questions = useMemo(() => quiz?.questions || [], [quiz]);

  const onAddQuestion = () => {
    const newQ: QuestionDto = {
      id: `temp-${Date.now()}`,
      text: "New question",
      questionType: 0,
      answers: [
        { id: `temp-a-${Date.now()}-1`, text: "Answer 1", isCorrect: true },
        { id: `temp-a-${Date.now()}-2`, text: "Answer 2", isCorrect: false },
      ],
    } as unknown as QuestionDto;
    setQuiz((prev) => (prev ? { ...prev, questions: [...(prev.questions || []), newQ] } : prev));
  };

  const onDeleteQuestionLocal = (questionId: string) => {
    setQuiz((prev) =>
      prev ? { ...prev, questions: (prev.questions || []).filter((q) => q.id !== questionId) } : prev
    );
  };

  const onAddAnswerLocal = (questionId: string) => {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: (prev.questions || []).map((q) =>
              q.id === questionId
                ? {
                    ...q,
                    answers: [...(q.answers || []), { id: `temp-${Date.now()}`, text: "New answer", isCorrect: false } as AnswerDto],
                  }
                : q
            ),
          }
        : prev
    );
  };

  const onDeleteAnswerLocal = (questionId: string, answerId: string) => {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: (prev.questions || []).map((q) =>
              q.id === questionId
                ? { ...q, answers: (q.answers || []).filter((a) => a.id !== answerId) }
                : q
            ),
          }
        : prev
    );
  };

  const handleAnswerCorrectToggle = (question: QuestionDto, answerId: string, checked: boolean) => {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: (prev.questions || []).map((q) => {
              if (q.id !== question.id) return q;
              if (q.questionType === 0) {
                return {
                  ...q,
                  answers: (q.answers || []).map((a) => ({ ...a, isCorrect: a.id === answerId ? checked : false })),
                };
              }
              return {
                ...q,
                answers: (q.answers || []).map((a) => (a.id === answerId ? { ...a, isCorrect: checked } : a)),
              };
            }),
          }
        : prev
    );
  };

  if (loading) return <div className="container" style={{ paddingTop: 16 }}>Loading...</div>;
  if (error) return (
    <div className="container" style={{ paddingTop: 16 }}>
      <div style={{ color: "#b91c1c", background: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>{error}</div>
    </div>
  );
  if (!quiz) return null;

  return (
    <div className="container" style={{ maxWidth: 960, paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2>Edit Quiz</h2>
        <Link className="btn btn-secondary" to="/quizzes">Back to Quizzes</Link>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3>Quiz Details</h3>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input id="title" value={meta.title} onChange={e => setMeta({ ...meta, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={3} value={meta.description} onChange={e => setMeta({ ...meta, description: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <input id="category" value={meta.category} onChange={e => setMeta({ ...meta, category: e.target.value })} />
        </div>
        <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" value={meta.difficulty} onChange={e => setMeta({ ...meta, difficulty: Number(e.target.value) })}>
              <option value={1}>Easy</option>
              <option value={2}>Medium</option>
              <option value={3}>Hard</option>
            </select>
          </div>
          <div>
            <label htmlFor="timeLimitSeconds">Time Limit (seconds)</label>
            <input id="timeLimitSeconds" type="number" min={0} step={30} value={meta.timeLimitSeconds} onChange={e => setMeta({ ...meta, timeLimitSeconds: Number(e.target.value) })} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={onSaveAll} disabled={saving}>Save All</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8 }}>
        <h3>Questions</h3>
        <button className="btn btn-secondary" onClick={onAddQuestion} disabled={saving}>+ Add Question</button>
      </div>

      {(questions || []).map((q) => (
        <div key={q.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }}>
            <div>
              <label>Question Text</label>
              <input
                value={q.text}
                onChange={(e) => setQuiz(prev => prev ? { ...prev, questions: prev.questions?.map(qq => qq.id === q.id ? { ...qq, text: e.target.value } : qq) } : prev)}
              />
            </div>
            <div>
              <label>Type</label>
              <select
                value={q.questionType}
                onChange={(e) => setQuiz(prev => prev ? { ...prev, questions: prev.questions?.map(qq => qq.id === q.id ? { ...qq, questionType: Number(e.target.value) } : qq) } : prev)}
              >
                {questionTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <h4 style={{ margin: 0, marginBottom: 8 }}>Answers</h4>
            {(q.answers || []).map((a) => (
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: (q.questionType === 2 || q.questionType === 3) ? "1fr 100px" : "1fr 160px 100px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  value={a.text}
                  placeholder={q.questionType === 2 ? "True/False option" : q.questionType === 3 ? "Expected text answer" : "Answer option"}
                  onChange={(e) => setQuiz(prev => prev ? { ...prev, questions: prev.questions?.map(qq => qq.id === q.id ? { ...qq, answers: qq.answers.map(aa => aa.id === a.id ? { ...aa, text: e.target.value } : aa) } : qq) } : prev)}
                />
                {(q.questionType !== 2 && q.questionType !== 3) && (
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type={q.questionType === 0 ? "radio" : "checkbox"}
                      name={`correct-${q.id}`}
                      checked={!!a.isCorrect}
                      onChange={(e) => handleAnswerCorrectToggle(q, a.id, e.target.checked)}
                    />
                    Correct
                  </label>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => onDeleteAnswerLocal(q.id, a.id)} disabled={saving}>Delete</button>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => onAddAnswerLocal(q.id)} disabled={saving}>+ Add Answer</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn" onClick={() => onDeleteQuestionLocal(q.id)} disabled={saving}>Delete Question</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuizEdit;
