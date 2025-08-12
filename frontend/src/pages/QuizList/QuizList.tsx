import React, { useEffect, useState, useMemo } from "react";
import "./QuizList.scss";
import { getQuizzes } from "../../services/quizService";
import { QuizDto } from "../../models/Quiz";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin } from "../../utils/auth";
import Loading from "../../components/Loading/Loading";

// Icons as simple text for compatibility
const SearchIcon = () => <span className="text-icon">🔍</span>;
const ClearIcon = () => <span className="text-icon">✕</span>;

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
    quizzes.forEach(quiz => {
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
        const list = Array.isArray(data) ? data : (data?.items ?? []);
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
    return quizzes.filter(quiz => {
      // Filter by search term (title or description)
      const matchesSearch = !searchTerm || 
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quiz.description && quiz.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by category
      const matchesCategory = !selectedCategory || 
        (quiz.category && quiz.category === selectedCategory);
      
      // Filter by difficulty
      const matchesDifficulty = !selectedDifficulty || 
        (typeof quiz.difficulty === 'number' && quiz.difficulty === selectedDifficulty);
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [quizzes, searchTerm, selectedCategory, selectedDifficulty]);

  // Check if any filters are active
  const hasActiveFilters = searchTerm || selectedCategory || selectedDifficulty > 0;

  if (loading) {
    return (
      <div className="container quiz-list">
        <Loading />
      </div>
    );
  }

  return (
    <div className="container quiz-list">
      <div className="quiz-list-header">
        <h1>Available Quizzes</h1>
        
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
              className={`filter-select ${selectedCategory ? 'active' : ''}`}
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
              className={`filter-select ${selectedDifficulty > 0 ? 'active' : ''}`}
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
                  setSearchTerm('');
                  setSelectedCategory('');
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
            {searchTerm && <span className="filter-tag">Search: "{searchTerm}"</span>}
            {selectedCategory && <span className="filter-tag">Category: {selectedCategory}</span>}
            {selectedDifficulty > 0 && (
              <span className="filter-tag">
                Difficulty: {DIFFICULTY_LEVELS[selectedDifficulty]?.label}
              </span>
            )}
            <button 
              className="clear-all"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
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
                  {quiz.category && <span className="quiz-category">{quiz.category}</span>}
                </div>
                
                {quiz.description && (
                  <p className="quiz-description">{quiz.description}</p>
                )}
                
                <div className="quiz-meta">
                  {typeof quiz.difficulty === "number" && (
                    <span className={`difficulty-badge difficulty-${quiz.difficulty}`}>
                      {DIFFICULTY_LEVELS[quiz.difficulty]?.label || `Level ${quiz.difficulty}`}
                    </span>
                  )}
                  {quiz.timeLimitSeconds && (
                    <span className="time-limit">
                      ⏱️ {Math.floor(quiz.timeLimitSeconds / 60)} min
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
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/admin/quizzes/${quiz.id}/edit`)}
                    >
                      Edit
                    </button>
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
                  setSearchTerm('');
                  setSelectedCategory('');
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
  );
};

export default QuizList;
