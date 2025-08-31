import React, { useEffect, useState, useMemo } from "react";
import "./QuizList.scss";
import { getQuizzes, deleteQuiz } from "../../services/quizService";
import { QuizDto } from "../../models/Quiz";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin } from "../../utils/auth";
import Loading from "../../components/Loading/Loading";

const SearchIcon = () => (
  <svg
    className="text-icon search-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const ClearIcon = () => (
  <svg className="text-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="text-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </svg>
);

// Define difficulty levels for the filter
const DIFFICULTY_LEVELS = [
  { value: 0, label: "All Difficulties" },
  { value: 1, label: "Beginner" },
  { value: 2, label: "Intermediate" },
  { value: 3, label: "Advanced" },
];

const QuizList: React.FC = () => {
  const [quizzes, setQuizzes] = useState<QuizDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState(0);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Extract unique categories from quizzes
  const categories = useMemo(() => {
    const cats = new Set<string>();
    quizzes.forEach((quiz) => {
      if (quiz.category) {
        cats.add(quiz.category);
      }
    });
    return Array.from(cats).sort();
  }, [quizzes]);

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const data = await getQuizzes({ page: 1, pageSize: 12 });
        const list = Array.isArray(data) ? data : data?.items ?? [];
        setQuizzes(list);
      } catch (e: any) {
        setError(e.message || "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter quizzes based on search and filter criteria
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      // Filter by search term (title or description)
      const matchesSearch =
        !searchTerm ||
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quiz.description &&
          quiz.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filter by category
      const matchesCategory =
        !selectedCategory ||
        (quiz.category && quiz.category === selectedCategory);

      // Filter by difficulty
      const matchesDifficulty =
        !selectedDifficulty ||
        (typeof quiz.difficulty === "number" &&
          quiz.difficulty === selectedDifficulty);

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [quizzes, searchTerm, selectedCategory, selectedDifficulty]);

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm || selectedCategory || selectedDifficulty > 0;

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${quizTitle}"? This cannot be undone.`)) {
      try {
        await deleteQuiz(quizId);
        // Refresh the quiz list
        const data = await getQuizzes({ page: 1, pageSize: 12 });
        const list = Array.isArray(data) ? data : data?.items ?? [];
        setQuizzes(list);
      } catch (e: any) {
        setError(e.message || "Failed to delete quiz");
      }
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Loading />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Available Quizzes</h1>
        <p>Explore our collection of quizzes and test your knowledge</p>
      </div>
      
      <div className="card">
        <div className="card-body">

        {/* Search and Filter Bar */}
        <div className="search-bar">
          <div className="search-container">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search quizzes"
            />
          </div>

          <div className="filter-controls">
            <select
              className={`filter-select ${selectedCategory ? "active" : ""}`}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              className={`filter-select ${
                selectedDifficulty > 0 ? "active" : ""
              }`}
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(Number(e.target.value))}
              aria-label="Filter by difficulty"
            >
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                className="clear-filters"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("");
                  setSelectedDifficulty(0);
                }}
                aria-label="Clear all filters"
              >
                <ClearIcon /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="filter-summary">
            <span>Filters: </span>
            {searchTerm && (
              <span className="filter-tag">Search: "{searchTerm}"</span>
            )}
            {selectedCategory && (
              <span className="filter-tag">Category: {selectedCategory}</span>
            )}
            {selectedDifficulty > 0 && (
              <span className="filter-tag">
                Difficulty: {DIFFICULTY_LEVELS[selectedDifficulty]?.label}
              </span>
            )}
            <button
              className="clear-all"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("");
                setSelectedDifficulty(0);
              }}
            >
              Clear all
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

          <div className="quiz-grid">
          {filteredQuizzes.length > 0 ? (
            filteredQuizzes.map((quiz) => (
              <div className="quiz-card" key={quiz.id}>
                <div className="quiz-card-header">
                  <h3>{quiz.title}</h3>
                  {quiz.category && (
                    <span className="quiz-category">{quiz.category}</span>
                  )}
                </div>

                {quiz.description && (
                  <p className="quiz-description">{quiz.description}</p>
                )}

                <div className="quiz-meta">
                  {typeof quiz.difficulty === "number" && (
                    <span
                      className={`difficulty-badge difficulty-${quiz.difficulty}`}
                    >
                      {DIFFICULTY_LEVELS[quiz.difficulty]?.label ||
                        `Level ${quiz.difficulty}`}
                    </span>
                  )}
                  {quiz.timeLimitSeconds && (
                    <span className="time-limit">
                      <ClockIcon />
                      {quiz.timeLimitSeconds < 60 
                        ? `${quiz.timeLimitSeconds}s` 
                        : `${Math.floor(quiz.timeLimitSeconds / 60)}m`}
                    </span>
                  )}
                </div>

                <div className="actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/quizzes/${quiz.id}/play`)}
                  >
                    Start Quiz
                  </button>
                  {isAdmin(user) && (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => navigate(`/admin/quizzes/${quiz.id}/edit`)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>No quizzes found matching your criteria.</p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("");
                  setSelectedDifficulty(0);
                }}
              >
                Clear all filters
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizList;
