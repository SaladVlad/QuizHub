import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { createQuiz, CreateQuizRequest } from "../../services/quizService";

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
  const [success, setSuccess] = useState<string>("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [name]: name === "difficulty" || name === "timeLimitSeconds" ? Number(value) : value,
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      return setError("Title is required");
    }

    if (!form.category || !form.category.trim()) {
      return setError("Category is required");
    }

    try {
      setIsSubmitting(true);
      const created = await createQuiz({
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        category: form.category.trim(),
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
    <div className="container" style={{ maxWidth: 720, paddingTop: "1.5rem" }}>
      <div className="card">
        <h2 className="text-center">Create Quiz</h2>
        {error && (
          <div className="error-message" style={{ color: "#b91c1c", background: "#fee2e2", padding: "8px 12px", borderRadius: "8px", marginBottom: 12 }}>
            {error}
          </div>
        )}
        {success && (
          <div className="success-message" style={{ color: "#065f46", background: "#d1fae5", padding: "8px 12px", borderRadius: "8px", marginBottom: 12 }}>
            {success}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="form-group" style={{ marginBottom: 12 }}>
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
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Optional description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label htmlFor="category">Category</label>
            <input
              id="category"
              name="category"
              type="text"
              placeholder="Optional category"
              value={form.category}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                name="difficulty"
                value={form.difficulty}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value={1}>Easy</option>
                <option value={2}>Medium</option>
                <option value={3}>Hard</option>
              </select>
            </div>
            <div>
              <label htmlFor="timeLimitSeconds">Time Limit (seconds)</label>
              <input
                id="timeLimitSeconds"
                name="timeLimitSeconds"
                type="number"
                min={0}
                step={30}
                value={form.timeLimitSeconds}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
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
  );
};

export default QuizCreate;
