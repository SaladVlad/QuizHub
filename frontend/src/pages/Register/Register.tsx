import React, { useState, useRef, ChangeEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { registerUser } from "../../services/authService";
import { RegisterRequestDto } from "../../dtos/auth";
import "./Register.scss";

const Register: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<
    Omit<RegisterRequestDto, "avatarImage">
  >({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [avatarImage, setAvatarImage] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (value.length > 20) return 'Username must be less than 20 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        return '';
      
      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.length < 2) return 'First name must be at least 2 characters';
        if (value.length > 30) return 'First name must be less than 30 characters';
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) return 'First name contains invalid characters';
        return '';
      
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.length < 2) return 'Last name must be at least 2 characters';
        if (value.length > 30) return 'Last name must be less than 30 characters';
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) return 'Last name contains invalid characters';
        return '';
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (value.length > 100) return 'Password must be less than 100 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
        return '';
      
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear general error if user starts typing
    if (error) {
      setError("");
    }
  };

  const handleFieldBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Validate field and update field errors on blur
    const fieldError = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 1 * 1024 * 1024) {
        setError("Image size should be less than 1MB");
        return;
      }

      setAvatarImage(file);
      setError("");

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAvatarImage(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateAllFields = (): boolean => {
    const errors: {[key: string]: string} = {};
    const { username, email, firstName, lastName, password, confirmPassword } = formData;

    errors.username = validateField('username', username);
    errors.email = validateField('email', email);
    errors.firstName = validateField('firstName', firstName);
    errors.lastName = validateField('lastName', lastName);
    errors.password = validateField('password', password);
    errors.confirmPassword = validateField('confirmPassword', confirmPassword);

    setFieldErrors(errors);

    return Object.values(errors).every(error => error === '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllFields()) {
      setError("Please fix the errors below");
      return;
    }

    const { username, email, firstName, lastName, password, confirmPassword } = formData;

    try {
      setIsLoading(true);
      setError("");

      const { token, user } = await registerUser({
        username: username.trim(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        confirmPassword,
        avatarImage: avatarImage || undefined,
      });

      login(token, user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Create an Account</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Choose a username"
            value={formData.username}
            onChange={handleChange}
            onBlur={handleFieldBlur}
            required
            disabled={isLoading}
            className={fieldErrors.username ? 'error' : ''}
          />
          {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleFieldBlur}
            required
            disabled={isLoading}
            className={fieldErrors.email ? 'error' : ''}
          />
          {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
        </div>

        <div className="form-group name-group">
          <div className="form-field">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleFieldBlur}
              required
              disabled={isLoading}
              className={fieldErrors.firstName ? 'error' : ''}
            />
            {fieldErrors.firstName && <div className="field-error">{fieldErrors.firstName}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleFieldBlur}
              required
              disabled={isLoading}
              className={fieldErrors.lastName ? 'error' : ''}
            />
            {fieldErrors.lastName && <div className="field-error">{fieldErrors.lastName}</div>}
          </div>
        </div>

        <div className="form-group">
          <label>Profile Picture (Optional)</label>
          <div className="avatar-upload">
            <input
              type="file"
              id="avatar"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              disabled={isLoading}
              style={{ display: "none" }}
            />
            {avatarPreview ? (
              <div className="avatar-preview">
                <img src={avatarPreview} alt="Avatar preview" />
                <button
                  type="button"
                  className="remove-image"
                  onClick={handleRemoveImage}
                  disabled={isLoading}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Choose an image
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Create a password (min 6 characters)"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleFieldBlur}
            required
            disabled={isLoading}
            className={fieldErrors.password ? 'error' : ''}
          />
          {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleFieldBlur}
            required
            disabled={isLoading}
            className={fieldErrors.confirmPassword ? 'error' : ''}
          />
          {fieldErrors.confirmPassword && <div className="field-error">{fieldErrors.confirmPassword}</div>}
        </div>

        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Sign Up"}
        </button>

        <div className="login-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
        <div className="back-home">
          <Link to="/">↩ Back to Home</Link>
        </div>
      </form>
    </div>
  );
};

export default Register;
