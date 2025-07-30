import React from "react";
import "./Leaderboard.scss";

const Leaderboard: React.FC = () => {
  // Replace with API data later
  const users = [
    { username: "SaladVlad", score: 98 },
    { username: "QuizMaster99", score: 87 },
    { username: "Brainiac", score: 79 },
  ];

  return (
    <div className="container leaderboard">
      <h1>Leaderboard</h1>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, index) => (
            <tr key={u.username}>
              <td>{index + 1}</td>
              <td>{u.username}</td>
              <td>{u.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
