import React, { useEffect, useState } from "react";
import "./QuizList.scss";
import { getQuizzes } from "../../services/quizService";
import { QuizDto } from "../../models/Quiz";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin } from "../../utils/auth";
import Loading from "../../components/Loading/Loading";

const QuizList: React.FC = () => {
  const [quizzes, setQuizzes] = useState<QuizDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const data = await getQuizzes({ page: 1, pageSize: 12 });
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setQuizzes(list);
      } catch (e: any) {
        setError(e.message || "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="container quiz-list">
        <Loading />
      </div>
    );
  }

  return (
    <div className={`container quiz-list fade-in`}>
      <h1>Available Quizzes</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="quiz-grid">
        {quizzes.map((quiz) => (
          <div className="quiz-card" key={quiz.id}>
            <h3>{quiz.title}</h3>
            {typeof quiz.difficulty === "number" && (
              <p>Difficulty: {quiz.difficulty}</p>
            )}
            <div className="actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/quizzes/${quiz.id}/play`)}
              >
                Start Quiz
              </button>
              {isAdmin(user) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate(`/admin/quizzes/${quiz.id}/edit`)}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
        {quizzes.length === 0 && !error && <p>No quizzes found.</p>}
      </div>
    </div>
  );
};

export default QuizList;
