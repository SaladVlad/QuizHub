import React from "react";
import "./QuizList.scss";

const QuizList: React.FC = () => {
  // Replace with actual fetched quizzes later
  const quizzes = [
    { id: 1, title: "General Knowledge", difficulty: "Medium" },
    { id: 2, title: "Science Quiz", difficulty: "Hard" },
    { id: 3, title: "History Challenge", difficulty: "Easy" },
  ];

  return (
    <div className="container quiz-list">
      <h1>Available Quizzes</h1>
      <div className="quiz-grid">
        {quizzes.map((quiz) => (
          <div className="quiz-card" key={quiz.id}>
            <h3>{quiz.title}</h3>
            <p>Difficulty: {quiz.difficulty}</p>
            <button className="btn btn-primary">Start Quiz</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizList;
