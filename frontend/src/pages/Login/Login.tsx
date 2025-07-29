import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { loginUser } from "../../services/authService";
import { LoginRequestDto } from "../../models/AuthDtos";
import "./Login.scss";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usernameOrEmail || !password) {
      return setError("Please fill in all fields");
    }

    try {
      setIsLoading(true);
      setError("");
      
      const { token, user } = await loginUser(usernameOrEmail, password);
      login(token, user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Sign In</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="usernameOrEmail">Username or Email</label>
          <input
            id="usernameOrEmail"
            type="text"
            placeholder="Enter your username or email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
        
        <div className="register-link">
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
