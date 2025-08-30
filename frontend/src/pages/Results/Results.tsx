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
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set());
  
  const toggleQuizExpansion = (quizId: string) => {
    setExpandedQuizzes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quizId)) {
        newSet.delete(quizId);
      } else {
        newSet.add(quizId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setError("");
        const data = await getUserResults(user.id, 1, 20);
        const list: ResultDto[] = Array.isArray(data) ? data : data?.items ?? [];

        // Build a map of quizId -> title by fetching any missing titles
        const uniqueQuizIds = Array.from(new Set(list.map(r => r.quizId).filter(id => id)));
        const titleMap: Record<string, string> = {};
        
        // Use Promise.allSettled to handle individual failures better
        const titleResults = await Promise.allSettled(
          uniqueQuizIds.map(async (qid) => {
            const quiz = await getQuizById(qid);
            return { id: qid, title: quiz?.title };
          })
        );
        
        titleResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value?.title && result.value?.id) {
            titleMap[result.value.id] = result.value.title;
          }
        });

        const withTitles = list.map(r => ({
          ...r,
          quizTitle: r.quizTitle || titleMap[r.quizId] || 'Unknown Quiz'
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
        name: `${result.quizTitle || 'Unknown Quiz'} #${attemptNumber}`,
        date: date.toISOString(), // Use full ISO string for unique timestamps
        score: parseFloat(score.toFixed(1)),
        fullDate: date,
        quizTitle: result.quizTitle || 'Unknown Quiz',
        attemptNumber
      };
    });
  }, [results]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>My Results</h1>
        </div>
        <Loading />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Quiz Results</h1>
        <p>Track your progress and review your quiz performance</p>
      </div>
      
      <div className="card">
        <div className="card-body">
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
                  <h2 className="group-title">{g.quizTitle || 'Unknown Quiz'}</h2>
                  <div className="results-list">
                    {(() => {
                      const sortedItems = g.items
                        .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
                      
                      const isExpanded = expandedQuizzes.has(g.quizId);
                      const maxItems = 2;
                      const itemsToShow = isExpanded ? sortedItems : sortedItems.slice(0, maxItems);
                      const hasMore = sortedItems.length > maxItems;
                      
                      return (
                        <>
                          {itemsToShow.map((r, i) => {
                        const score = r.percentageScore !== undefined 
                          ? r.percentageScore 
                          : (r.score / (r.maxPossibleScore || 1)) * 100;
                        const isHighScore = score >= highestScore - 0.01; // Account for floating point precision
                        
                        return (
                          <div 
                            key={r.id || i} 
                            className={`result-card ${isHighScore ? 'high-score' : ''}`}
                          >
                            <div className="score-section">
                              <div className="score-label">
                                <span className="score-value">{score.toFixed(1)}%</span>
                                {isHighScore && <span className="high-score-badge">🏆 Best</span>}
                              </div>
                              <div className="progress-bar">
                                <div className="progress-fill" style={{width: `${Math.max(0, Math.min(100, score))}%`}}></div>
                              </div>
                            </div>
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
                          
                          {hasMore && (
                            <div className="show-more-container">
                              <button 
                                className="btn-show-more"
                                onClick={() => toggleQuizExpansion(g.quizId)}
                              >
                                {isExpanded 
                                  ? `Show Less (-${sortedItems.length - maxItems} results)`
                                  : `Show More (+${sortedItems.length - maxItems} results)`
                                }
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
          );
        })()}
        </div>
      </div>
    </div>
  );
};

export default Results;
