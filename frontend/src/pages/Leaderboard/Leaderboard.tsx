import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Leaderboard.scss";
import { getGlobalLeaderboard } from "../../services/resultService";
import { LeaderboardEntryDto } from "../../models/Result";

type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  timeTakenSeconds?: number;
  completedAt?: string;
  userId?: string;
};

type LeaderboardApiResponse =
  | LeaderboardEntry[]
  | { entries: LeaderboardEntry[] }
  | null
  | undefined;

function hasEntries(
  obj: LeaderboardApiResponse
): obj is { entries: LeaderboardEntry[] } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Array.isArray((obj as any).entries)
  );
}

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
        
        // Ensure we have an array and map the data
        const dataArray = Array.isArray(leaderboardData) ? leaderboardData : [];
        
        const processed: LeaderboardEntry[] = dataArray.map((entry: any, index: number) => {
          // Debug log each entry
          console.log('Processing entry:', entry);
          
          return {
            rank: entry.rank || index + 1,
            username: entry.username || entry.userName || `User ${entry.userId?.substring(0, 6) || index}`,
            score: entry.score || 0,
            userId: entry.userId || '',
            timeTakenSeconds: entry.timeTakenSeconds || 0,
            completedAt: entry.completedAt || new Date().toISOString()
          };
        });
        
        console.log('Processed leaderboard data:', processed); // Debug log
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
      <div className="leaderboard">
        <div className="leaderboard-header">
          <h1>🏆 Leaderboard</h1>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p className="leaderboard-description">
          Top performers based on their highest scores across all quizzes
        </p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button className="retry-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {!error && (
        <div className="table-responsive">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="rank-col">Rank</th>
                <th className="user-col">Player</th>
                <th className="score-col">Score</th>
                <th className="time-col">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.userId}`}
                    className={entry.rank <= 3 ? `top-${entry.rank}` : ""}
                  >
                    <td className="rank">
                      {entry.rank <= 3 ? (
                        <span className={`medal medal-${entry.rank}`}>
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                        </span>
                      ) : (
                        <span className="rank-number">{entry.rank}</span>
                      )}
                    </td>
                    <td className="user">
                        {entry.username}
                    </td>
                    <td className="score">{entry.score}</td>
                    <td className="time">
                      {entry.timeTakenSeconds
                        ? `${Math.floor(entry.timeTakenSeconds / 60)}:${(
                            entry.timeTakenSeconds % 60
                          )
                            .toString()
                            .padStart(2, "0")}`
                        : "--:--"}
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
