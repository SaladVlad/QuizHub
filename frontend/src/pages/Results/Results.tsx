import React, { useEffect, useState } from "react";
import "./Results.scss";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getUserResults } from "../../services/resultService";
import { getQuizById } from "../../services/quizService";
import { ResultDto } from "../../models/Result";
import Loading from "../../components/Loading/Loading";

const Results: React.FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<ResultDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setError("");
        const data = await getUserResults(user.id, 1, 20);
        const list: ResultDto[] = Array.isArray(data) ? data : data?.items ?? [];

        // Build a map of quizId -> title by fetching any missing titles
        const uniqueQuizIds = Array.from(new Set(list.map(r => r.quizId)));
        const titleMap: Record<string, string> = {};
        await Promise.all(
          uniqueQuizIds.map(async (qid) => {
            try {
              const quiz = await getQuizById(qid);
              if (quiz?.title) titleMap[qid] = quiz.title;
            } catch {
              // ignore failures, fallback to showing quizId
            }
          })
        );

        const withTitles = list.map(r => ({
          ...r,
          quizTitle: r.quizTitle || titleMap[r.quizId]
        }));
        setResults(withTitles);
      } catch (e: any) {
        setError(e.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="results-container">
        <h1>My Results</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className={`results-container fade-in`}>
      <h1>My Quiz Results</h1>
      {error && <div className="error-message">{error}</div>}
      {(() => {
        // Group results by quizId
        const groups = results.reduce<Record<string, { quizId: string; quizTitle?: string; items: ResultDto[] }>>((acc, r) => {
          const key = r.quizId;
          if (!acc[key]) acc[key] = { quizId: key, quizTitle: r.quizTitle, items: [] };
          acc[key].quizTitle = acc[key].quizTitle || r.quizTitle; // prefer first available title
          acc[key].items.push(r);
          return acc;
        }, {});

        const orderedGroups = Object.values(groups).sort((a, b) => (a.quizTitle || a.quizId).localeCompare(b.quizTitle || b.quizId));

        if (orderedGroups.length === 0 && !error) {
          return (
            <div className="no-results">
              <p>You haven't taken any quizzes yet.</p>
              <Link to="/quizzes" className="btn">
                Browse Quizzes
              </Link>
            </div>
          );
        }

        return (
          <div className="results-groups">
            {orderedGroups.map(g => {
              // Get the highest score for this quiz
              const highestScore = Math.max(...g.items.map(r => {
                if (typeof r.percentageScore === 'number') return r.percentageScore;
                return (r.score / (r.maxPossibleScore || 1)) * 100;
              }));

              return (
                <div className="results-group" key={g.quizId}>
                  <h2 className="group-title">{g.quizTitle || `Quiz ${g.quizId}`}</h2>
                  <div className="results-list">
                    {g.items
                      .slice()
                      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                      .map((result, index) => {
                        const pct = typeof result.percentageScore === 'number'
                          ? result.percentageScore
                          : (result.score / (result.maxPossibleScore || 1)) * 100;
                        
                        const isHighestScore = pct === highestScore;
                        
                        return (
                          <div 
                            className={`result-card ${isHighestScore ? 'highlight' : ''}`} 
                            key={result.id}
                          >
                            <p>Your Score</p>
                            <div className="score-badge">
                              {pct.toFixed(1)}%
                              {isHighestScore && ' 🏆'}
                            </div>
                            <div className="date">
                              {new Date(result.completedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <p>
                              <strong>Correct Answers:</strong> {result.score} / {result.maxPossibleScore}
                            </p>
                            <div className="actions">
                              <Link 
                                to={`/results/${result.id}`} 
                                className="btn btn-primary"
                              >
                                View Detailed Results
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};

export default Results;
