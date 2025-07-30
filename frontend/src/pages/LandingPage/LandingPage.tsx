import React from "react";
import { Link } from "react-router-dom";
import "./LandingPage.scss";

const LandingPage: React.FC = () => {
  return (
    <div className="container landing">
      <h1>Welcome to KvizHub</h1>
      <p>
        The ultimate platform to test your knowledge and climb the leaderboard!
      </p>
      <div className="actions">
        <Link to="/login" className="btn btn-primary">
          Login
        </Link>
        <Link to="/register" className="btn btn-secondary">
          Register
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
