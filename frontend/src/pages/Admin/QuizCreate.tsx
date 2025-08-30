import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { createQuiz, CreateQuizRequest } from "../../services/quizService";
import "./QuizCreate.scss";

const QuizCreate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Guard: if not admin, bounce out (in effect to avoid navigating during render)
  useEffect(() => {
    if (user && user.role !== "Admin") {
      navigate("/");
    }
  }, [user, navigate]);

  const [form, setForm] = useState<CreateQuizRequest>({
    title: "",
    description: "",
    category: "",
    difficulty: 1,
    timeLimitSeconds: 300,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState<string>("");

  const validateField = (name: string, value: string | number): string => {
    switch (name) {
      case 'title':
        if (!String(value).trim()) return 'Title is required';
        if (String(value).trim().length < 3) return 'Title must be at least 3 characters';
        if (String(value).trim().length > 100) return 'Title must be less than 100 characters';
        return '';
      
      case 'category':
        if (!String(value).trim()) return 'Category is required';
        if (String(value).trim().length < 2) return 'Category must be at least 2 characters';
        if (String(value).trim().length > 50) return 'Category must be less than 50 characters';
        return '';
      
      case 'timeLimitSeconds':
        const timeValue = Number(value);
        if (isNaN(timeValue)) return 'Time limit must be a valid number';
        if (timeValue <= 0) return 'Time limit must be greater than 0 seconds';
        if (timeValue < 30) return 'Time limit must be at least 30 seconds';
        if (timeValue > 7200) return 'Time limit cannot exceed 2 hours (7200 seconds)';
        return '';
      
      case 'description':
        if (String(value).trim().length > 500) return 'Description must be less than 500 characters';
        return '';
      
      default:
        return '';
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    const processedValue = name === "difficulty" || name === "timeLimitSeconds" ? Number(value) : value;
    
    setForm((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Validate field and update field errors
    const fieldError = validateField(name, processedValue);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));

    // Clear general error if user starts typing
    if (error) {
      setError("");
    }
  };

  const validateAllFields = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    errors.title = validateField('title', form.title);
    errors.category = validateField('category', form.category || '');
    errors.timeLimitSeconds = validateField('timeLimitSeconds', form.timeLimitSeconds ?? 0);
    errors.description = validateField('description', form.description || '');
    
    setFieldErrors(errors);
    
    return Object.values(errors).every(error => error === '');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateAllFields()) {
      setError("Please fix the errors below");
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createQuiz({
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        category: (form.category ?? "").trim(),
        difficulty: form.difficulty,
        timeLimitSeconds: form.timeLimitSeconds,
      });
      setSuccess("Quiz created successfully");
      setTimeout(() => navigate(`/admin/quizzes/${created.id}/edit`), 400);
    } catch (err: any) {
      setError(err?.message || "Failed to create quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Create New Quiz</h1>
        <p>Create a new quiz for your students</p>
      </div>
      
      <div className="card">
        <div className="card-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          {success && (
            <div className="success-message">
              {success}
            </div>
          )}
          
          <form onSubmit={onSubmit} className="quiz-form">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="Enter quiz title"
                value={form.title}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className={fieldErrors.title ? 'error' : ''}
              />
              {fieldErrors.title && <div className="field-error">{fieldErrors.title}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                placeholder="Optional description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                disabled={isSubmitting}
                className={fieldErrors.description ? 'error' : ''}
              />
              {fieldErrors.description && <div className="field-error">{fieldErrors.description}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <input
                id="category"
                name="category"
                type="text"
                placeholder="Enter category"
                value={form.category}
                onChange={handleChange}
                disabled={isSubmitting}
                className={fieldErrors.category ? 'error' : ''}
              />
              {fieldErrors.category && <div className="field-error">{fieldErrors.category}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="difficulty">Difficulty</label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={form.difficulty}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value={1}>Beginner</option>
                  <option value={2}>Intermediate</option>
                  <option value={3}>Advanced</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="timeLimitSeconds">Time Limit (seconds)</label>
                <input
                  id="timeLimitSeconds"
                  name="timeLimitSeconds"
                  type="number"
                  min={30}
                  step={30}
                  value={form.timeLimitSeconds}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={fieldErrors.timeLimitSeconds ? 'error' : ''}
                />
                {fieldErrors.timeLimitSeconds && <div className="field-error">{fieldErrors.timeLimitSeconds}</div>}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Quiz"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuizCreate;
