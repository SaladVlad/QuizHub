import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import "./Leaderboard.scss";
import { getGlobalLeaderboard } from "../../services/resultService";
import Loading from "../../components/Loading/Loading";

type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  timeTakenSeconds?: number;
  completedAt?: string;
  userId?: string;
};

type LeaderboardResponse = {
  entries?: LeaderboardEntry[];
  quizId?: string;
  quizTitle?: string;
} | LeaderboardEntry[];

const Leaderboard: React.FC = () => {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        setLoading(true);
        const response = await getGlobalLeaderboard(100);
        
        // The backend returns an object with an 'entries' array or an array directly
        let leaderboardData: LeaderboardEntry[] = [];
        
        if (Array.isArray(response)) {
          leaderboardData = response as LeaderboardEntry[];
        } else {
          const typedResponse = response as LeaderboardResponse;
          if (typedResponse && 'entries' in typedResponse && Array.isArray(typedResponse.entries)) {
            leaderboardData = typedResponse.entries;
          }
        }
        
        if (leaderboardData.length > 0) {
          // Process data to ensure we have the highest scores per user
          const userMap = new Map<string, LeaderboardEntry>();
          
          leaderboardData.forEach((entry: any) => {
            const username = entry.userName || entry.username || 'Unknown User';
            const score = typeof entry.score === 'number' ? entry.score : 0;
            const userId = entry.userId || username;
            
            // If we already have this user, keep the higher score
            if (userMap.has(userId)) {
              const existing = userMap.get(userId)!;
              if (score > existing.score) {
                userMap.set(userId, { 
                  ...entry, 
                  username, 
                  score,
                  timeTakenSeconds: entry.timeTakenSeconds || 0,
                  completedAt: entry.completedAt || new Date().toISOString()
                });
              }
            } else {
              userMap.set(userId, { 
                ...entry, 
                username, 
                score,
                timeTakenSeconds: entry.timeTakenSeconds || 0,
                completedAt: entry.completedAt || new Date().toISOString()
              });
            }
          });
          
          // Convert to array, sort by score (descending), and add rank
          const processedData = Array.from(userMap.values())
            .sort((a, b) => b.score - a.score || (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0))
            .map((item, index) => ({
              ...item,
              rank: index + 1
            }));
            
          setRows(processedData);
        } else {
          setRows([]);
        }
      } catch (e: any) {
        console.error("Error loading leaderboard:", e);
        setError(e.message || "Failed to load leaderboard. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, []);

  if (loading) {
    return (
      <div className="leaderboard-container">
        <h1>Global Leaderboard</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className={`leaderboard-container fade-in`}>
      <div className="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p className="leaderboard-description">
          Top performers based on their highest scores across all quizzes
        </p>
      </div>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button 
            className="retry-button" 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}
      
      {!loading && !error && (
        <div className="table-responsive">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="rank-header">Rank</th>
                <th className="user-header">Player</th>
                <th className="score-header">Score</th>
                <th className="time-header">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((entry) => (
                  <tr key={`${entry.rank}-${entry.username}`} className={entry.rank <= 3 ? `top-${entry.rank}` : ''}>
                    <td className="rank-cell">
                      {entry.rank <= 3 ? (
                        <span className={`trophy trophy-${entry.rank}`}>
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="rank-number">{entry.rank}</span>
                      )}
                    </td>
                    <td className="username-cell">
                      <Link to={`/profile/${entry.username}`} className="username-link">
                        {entry.username}
                      </Link>
                    </td>
                    <td className="score-cell">
                      <span className="score-badge">
                        {entry.score.toLocaleString()}
                      </span>
                    </td>
                    <td className="time-cell">
                      {entry.timeTakenSeconds ? 
                        `${Math.floor(entry.timeTakenSeconds / 60)}:${(entry.timeTakenSeconds % 60).toString().padStart(2, '0')}` 
                        : '--:--'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="no-results">
                    No leaderboard data available yet. Be the first to take a quiz!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
