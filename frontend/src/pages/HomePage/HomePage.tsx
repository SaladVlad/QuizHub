import React from "react";
import "./HomePage.scss";

const HomePage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome to QuizHub!</h1>
        <p>Start solving quizzes or view your progress using the navigation above.</p>
      </div>
      
      <div className="card">
        <div className="card-body">
          <div className="welcome-content">
            <h2>Ready to test your knowledge?</h2>
            <p>Explore our collection of engaging quizzes and track your progress as you learn.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
