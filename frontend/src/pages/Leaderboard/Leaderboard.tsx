import React, { useEffect, useState } from "react";
import "./Leaderboard.scss";
import { getGlobalLeaderboard } from "../../services/resultService";

type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  timeTakenSeconds?: number | null;
  completedAt?: string;
  userId?: string;
};


const Leaderboard: React.FC = () => {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const leaderboardData = await getGlobalLeaderboard();
        console.log('Leaderboard data:', leaderboardData); // Debug log
        
        if (!leaderboardData) {
          throw new Error('No data received from server');
        }
        
        // Handle the response structure from API
        let entriesArray: any[] = [];
        
        if (Array.isArray(leaderboardData)) {
          entriesArray = leaderboardData;
        } else if (leaderboardData && typeof leaderboardData === 'object' && 'entries' in leaderboardData) {
          entriesArray = (leaderboardData as any).entries || [];
        } else if (leaderboardData && typeof leaderboardData === 'object') {
          // Handle single leaderboard object
          entriesArray = (leaderboardData as any).entries || [];
        }
        
        const processed: LeaderboardEntry[] = entriesArray.map((entry: any, index: number) => ({
          rank: entry.rank || index + 1,
          username: entry.userName || entry.username || `User ${entry.userId?.substring(0, 6) || index}`,
          score: entry.score || 0,
          userId: entry.userId || '',
          timeTakenSeconds: entry.timeTakenSeconds || 0,
          completedAt: entry.completedAt || new Date().toISOString()
        }));
        
        setRows(processed);
      } catch (e: any) {
        console.error('Error loading leaderboard:', e);
        setError(e.message || "Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    };
    
    loadLeaderboard();
  }, []);


  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>🏆 Leaderboard</h1>
          <p>Top performers across all quizzes</p>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="loading">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🏆 Leaderboard</h1>
        <p>Top performers across all quizzes</p>
      </div>

      <div className="card">
        <div className="card-body">
          {error && (
            <div className="error">
              {error}
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {!error && (
            <div className="leaderboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Quizzes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((entry) => (
                      <tr key={`${entry.rank}-${entry.userId}`}>
                        <td className="rank">
                          {entry.rank <= 3 ? (
                            <span className={`medal rank-${entry.rank}`}>
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            entry.rank
                          )}
                        </td>
                        <td>{entry.username}</td>
                        <td className="score">{entry.score}</td>
                        <td>{entry.timeTakenSeconds || 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="no-results">
                        No results yet. Be the first to take a quiz!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
