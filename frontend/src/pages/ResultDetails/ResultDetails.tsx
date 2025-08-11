import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getResultById } from "../../services/resultService";
import { getQuizWithQuestions } from "../../services/quizService";
import { ResultDto } from "../../models/Result";
import { QuestionDto } from "../../models/Quiz";
import "./ResultDetails.scss";

const ResultDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<ResultDto | null>(null);
  const [questions, setQuestions] = useState<QuestionDto[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setError("");
        setLoading(true);
        const res = await getResultById(id);
        setResult(res);
        // Fetch quiz with questions to show question texts/answers
        const quiz = await getQuizWithQuestions(res.quizId);
        setQuestions(quiz?.questions ?? []);
      } catch (e: any) {
        setError(e.message || "Failed to load result details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const answersByQuestion = useMemo(() => {
    const map: Record<string, { givenAnswer: string; pointsAwarded?: number; isCorrect?: boolean }> = {};
    if (result?.answers) {
      for (const a of result.answers) {
        map[a.questionId] = { givenAnswer: a.givenAnswer, pointsAwarded: a.pointsAwarded, isCorrect: a.isCorrect };
      }
    }
    return map;
  }, [result]);

  if (loading) {
    return (
      <div className="container result-details">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container result-details">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container result-details">
        <p>Result not found.</p>
      </div>
    );
  }

  return (
    <div className="container result-details">
      <div className="header">
        <h1>Result Details</h1>
        <div className="meta">
          <div>Quiz: {result.quizTitle || result.quizId}</div>
          <div>
            Score: {(() => {
              const pct = typeof result.percentageScore === "number"
                ? result.percentageScore
                : (result.score / (result.maxPossibleScore || 1)) * 100;
              return pct.toFixed(2);
            })()}%
            , Time: {Math.max(1, result.timeTakenSeconds)}s
          </div>
        </div>
        <button className="btn" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="questions">
        {questions.map((q, idx) => {
          const ans = answersByQuestion[q.id];
          const isMultiple = q.questionType === 1 || (q as any).questionType === "MultipleChoice";
          const givenSet = new Set((ans?.givenAnswer ?? "").split(",").map(s => s.trim()).filter(Boolean));
          

          return (
            <div key={q.id} className={`question ${ans?.isCorrect ? "correct" : "incorrect"}`}>
              <div className="q-header">
                <span className="q-index">Q{idx + 1}.</span>
                <span className="q-text">{q.text}</span>
                {typeof ans?.pointsAwarded === "number" && (
                  <span className="points">+{ans.pointsAwarded}</span>
                )}
              </div>
              <div className="q-answers">
                {q.answers.map(a => {
                  const isCorrect = !!a.isCorrect;
                  const userSelected = isMultiple
                    ? givenSet.has(a.id)
                    : givenSet.has(a.text) || givenSet.has(a.text.toLowerCase());
                  return (
                    <div
                      key={a.id}
                      className={`ans ${isCorrect ? "correct" : ""} ${userSelected ? "selected" : ""}`}
                    >
                      <span className="bullet">{isMultiple ? (userSelected ? "[x]" : "[ ]") : userSelected ? "(o)" : "( )"}</span>
                      <span className="text">{a.text}</span>
                    </div>
                  );
                })}
              </div>
              {!ans?.isCorrect && ans?.givenAnswer && (
                <div className="given">
                  Your answer: <em>{ans.givenAnswer}</em>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultDetails;
