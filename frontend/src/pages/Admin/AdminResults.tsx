import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin } from "../../utils/auth";
import { getAllResults } from "../../services/resultService";
import { ResultDto } from "../../models/Result";
import { PaginatedResponse } from "../../models/Quiz";
import Loading from "../../components/Loading/Loading";
import "./AdminResults.scss";

const AdminResults: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [results, setResults] = useState<ResultDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Guard: if not admin, redirect
  useEffect(() => {
    if (user && !isAdmin(user)) {
      navigate("/");
    }
  }, [user, navigate]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      loadResults();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Load results when page changes
  useEffect(() => {
    loadResults();
  }, [currentPage]);

  const loadResults = async () => {
    try {
      setError("");
      setLoading(true);
      const response: PaginatedResponse<ResultDto> = await getAllResults(
        currentPage,
        pageSize,
        searchTerm || undefined
      );
      
      const items = Array.isArray(response) ? response : response?.items || [];
      setResults(items);
      
      if (!Array.isArray(response)) {
        setTotalPages(response.totalPages || 0);
        setTotalCount(response.totalItems || 0);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatScore = (result: ResultDto) => {
    const percentage = result.percentageScore !== undefined 
      ? result.percentageScore 
      : (result.score / (result.maxPossibleScore || 1)) * 100;
    return percentage.toFixed(1);
  };

  if (!user || !isAdmin(user)) {
    return null;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>All Quiz Results</h1>
        <p>Manage and review all user quiz results</p>
      </div>

      <div className="card">
        <div className="card-body">
          {/* Search and Stats */}
          <div className="admin-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by user, quiz title, or result ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="stats">
              <span>Total Results: {totalCount}</span>
              {searchTerm && <span>• Filtered: {results.length}</span>}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <Loading />
          ) : (
            <>
              {results.length === 0 ? (
                <div className="no-results">
                  <p>No results found {searchTerm && `matching "${searchTerm}"`}</p>
                </div>
              ) : (
                <>
                  {/* Results Table */}
                  <div className="results-table">
                    <table>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Quiz</th>
                          <th>Score</th>
                          <th>Time</th>
                          <th>Completed</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result) => (
                          <tr key={result.id}>
                            <td className="user-info">
                              <div className="user-name">{(result as any).userFullName || 'Unknown User'}</div>
                              <div className="user-id">{result.userId.substring(0, 8)}...</div>
                            </td>
                            <td className="quiz-info">
                              <div className="quiz-title">
                                {(result as any).quizTitle || 'Unknown Quiz'}
                              </div>
                              <div className="quiz-category">{(result as any).quizCategory || ''}</div>
                            </td>
                            <td className="score-info">
                              <div className="score-percentage">{formatScore(result)}%</div>
                              <div className="score-points">
                                {result.score}/{result.maxPossibleScore}
                              </div>
                            </td>
                            <td className="time-info">
                              {Math.floor(result.timeTakenSeconds / 60)}m {result.timeTakenSeconds % 60}s
                            </td>
                            <td className="date-info">
                              {formatDate(result.completedAt)}
                            </td>
                            <td className="actions">
                              <Link 
                                to={`/results/${result.id}`}
                                className="btn btn-sm btn-outline"
                              >
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="btn btn-secondary"
                      >
                        Previous
                      </button>
                      <span className="page-info">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="btn btn-secondary"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminResults;