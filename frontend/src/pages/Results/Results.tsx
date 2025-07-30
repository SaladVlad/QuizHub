import React from "react";
import "./Results.scss";

const Results: React.FC = () => {
  const results = [
    { quiz: "Science Quiz", score: 85, date: "2025-07-25" },
    { quiz: "History Challenge", score: 92, date: "2025-07-27" },
  ];

  return (
    <div className="container results">
      <h1>My Quiz Results</h1>
      <div className="results-list">
        {results.map((result, idx) => (
          <div className="result-card" key={idx}>
            <h3>{result.quiz}</h3>
            <p>Score: {result.score}%</p>
            <p>Date: {result.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results;
