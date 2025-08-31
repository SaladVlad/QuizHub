import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { loginUser } from "../../services/authService";
import "./Login.scss";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'usernameOrEmail':
        if (!value.trim()) return 'Username or email is required';
        if (value.length < 3) return 'Must be at least 3 characters';
        // Check if it looks like an email
        if (value.includes('@')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) return 'Please enter a valid email address';
        }
        return '';
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      
      default:
        return '';
    }
  };

  const handleUsernameOrEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsernameOrEmail(value);

    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);

    if (error) setError("");
  };

  const handleUsernameOrEmailBlur = () => {
    const fieldError = validateField('usernameOrEmail', usernameOrEmail);
    setFieldErrors(prev => ({
      ...prev,
      usernameOrEmail: fieldError
    }));
  };

  const handlePasswordBlur = () => {
    const fieldError = validateField('password', password);
    setFieldErrors(prev => ({
      ...prev,
      password: fieldError
    }));
  };

  const validateAllFields = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    errors.usernameOrEmail = validateField('usernameOrEmail', usernameOrEmail);
    errors.password = validateField('password', password);
    
    setFieldErrors(errors);
    
    return Object.values(errors).every(error => error === '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllFields()) {
      setError("Please fix the errors below");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const { token, user } = await loginUser(usernameOrEmail.trim(), password);
      login(token, user);
      navigate("/");
    } catch (err: any) {
      setError(
        err.message ||
          "Login failed. Please check your credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Sign In</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="usernameOrEmail">Username or Email</label>
          <input
            id="usernameOrEmail"
            type="text"
            placeholder="Enter your username or email"
            value={usernameOrEmail}
            onChange={handleUsernameOrEmailChange}
            onBlur={handleUsernameOrEmailBlur}
            required
            disabled={isLoading}
            className={fieldErrors.usernameOrEmail ? 'error' : ''}
          />
          {fieldErrors.usernameOrEmail && <div className="field-error">{fieldErrors.usernameOrEmail}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            required
            disabled={isLoading}
            className={fieldErrors.password ? 'error' : ''}
          />
          {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
        </div>

        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <div className="register-link">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
        <div className="back-home">
          <Link to="/">↩ Back to Home</Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
