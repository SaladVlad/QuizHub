import React from "react";
import "./HomePage.scss";

const HomePage: React.FC = () => {
  return (
    <div className="container home">
      <h1>Welcome to KvizHub!</h1>
      <p>
        Start solving quizzes or view your progress using the navigation above.
      </p>
    </div>
  );
};

export default HomePage;
