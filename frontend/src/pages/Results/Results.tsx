import React, { useEffect, useState, useMemo } from "react";
import "./Results.scss";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getUserResults } from "../../services/resultService";
import { getQuizById } from "../../services/quizService";
import { ResultDto } from "../../models/Result";
import Loading from "../../components/Loading/Loading";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

  // Prepare data for the progress graph - group by quiz and show all attempts
  const progressData = useMemo(() => {
    if (!results.length) return [];
    
    // Sort results by completion date
    const sortedResults = [...results].sort((a, b) => 
      new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime()
    );
    
    // Create a map to track attempts per quiz
    const quizAttempts = new Map<string, number>();
    
    return sortedResults.map((result) => {
      const score = result.percentageScore !== undefined 
        ? result.percentageScore 
        : (result.score / (result.maxPossibleScore || 1)) * 100;
      
      const attemptNumber = (quizAttempts.get(result.quizId) || 0) + 1;
      quizAttempts.set(result.quizId, attemptNumber);
      
      const date = new Date(result.completedAt || 0);
      
      return {
        name: `${result.quizTitle || 'Quiz'} #${attemptNumber}`,
        date: date.toISOString(), // Use full ISO string for unique timestamps
        score: parseFloat(score.toFixed(1)),
        fullDate: date,
        quizTitle: result.quizTitle || `Quiz ${result.quizId}`,
        attemptNumber
      };
    });
  }, [results]);

  if (loading) {
    return (
      <div className="results">
        <h1>My Results</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="results">
      <h1>My Quiz Results</h1>
      {error && <div className="error-message">{error}</div>}
      
      {progressData.length > 1 && (
        <div className="progress-graph">
          <h2>Your Progress Over Time</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });
                  }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tickFormatter={(value) => `${value}%`}
                  width={40}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Score']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return `${date.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}`;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  name="Score" 
                  stroke="#4a6bff" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
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
                      .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
                      .map((r, i) => {
                        const score = r.percentageScore !== undefined 
                          ? r.percentageScore 
                          : (r.score / (r.maxPossibleScore || 1)) * 100;
                        const isHighScore = score >= highestScore - 0.01; // Account for floating point precision
                        
                        return (
                          <div 
                            key={r.id || i} 
                            className={`result-card ${isHighScore ? 'high-score' : ''}`}
                          >
                            <p className="score-display">
                              <span className="score-value">{score.toFixed(1)}%</span>
                              {isHighScore && <span className="high-score-badge">🏆 Best</span>}
                            </p>
                            <p className="date-display">
                              {new Date(r.completedAt || '').toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p>Time: {r.timeTakenSeconds ? `${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s` : 'N/A'}</p>
                            <Link to={`/results/${r.id}`} className="view-details">
                              View Details →
                            </Link>
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
