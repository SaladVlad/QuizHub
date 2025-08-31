import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./QuizPlay.scss";
import { getQuizById } from "../../services/quizService";
import { AnswerDto, QuestionDto, QuizDto } from "../../models/Quiz";
import { submitResult } from "../../services/resultService";
import Loading from "../../components/Loading/Loading";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

interface QuizPlayProps {}

interface QuizAnswers {
  [key: string]: string | string[];
}

const QuizPlay: React.FC<QuizPlayProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [hasInteracted, setHasInteracted] = useState(false);

  const questions = useMemo(() => quiz?.questions ?? [], [quiz]);

  // Load quiz data
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setError("");
        if (!id) {
          setError("Invalid quiz ID");
          return;
        }
        const data = await getQuizById(id);
        setQuiz(data);
        const timeLimit = data.timeLimitSeconds ?? 300;
        setTimeLeft(Math.max(1, timeLimit));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [id]);

  // Calculate score based on answers and question points
  const calculateScore = useCallback((currentAnswers: QuizAnswers) => {
    return Object.entries(currentAnswers).reduce((score, [questionId, userAnswer]) => {
      const question = questions.find(q => q.id === questionId);
      if (!question) return score;

      const correctAnswers = question.answers.filter(a => a.isCorrect).map(a => a.id);
      const questionPoints = question.points || 1; // Default to 1 point if not specified
      
      if (Array.isArray(userAnswer)) {
        // For multiple choice
        if (userAnswer.length === 0) return score;
        const allCorrect = userAnswer.every(id => 
          correctAnswers.includes(id)
        ) && userAnswer.length === correctAnswers.length;
        return allCorrect ? score + questionPoints : score;
      } else {
        if (question.questionType === 3) {
          const isCorrect = question.answers.some(a => 
            a.isCorrect && 
            a.text.toLowerCase() === (userAnswer as string).toLowerCase()
          );
          return isCorrect ? score + questionPoints : score;
        } else if (question.questionType === 2) {
          const isCorrect = question.answers.some(a => 
            a.isCorrect && a.text === userAnswer
          );
          return isCorrect ? score + questionPoints : score;
        } else {
          const selectedAnswer = question.answers.find(a => a.id === userAnswer);
          return selectedAnswer?.isCorrect ? score + questionPoints : score;
        }
      }
    }, 0);
  }, [questions]);

  // Build payload for submission
  const buildPayload = useCallback((currentAnswers: QuizAnswers, currentTimeLeft: number) => {
    if (!quiz) return null;
    
    const initialLimit = quiz.timeLimitSeconds ?? 300;
    const timeTakenSeconds = Math.max(1, initialLimit - currentTimeLeft);
    const score = calculateScore(currentAnswers);
    
    return {
      quizId: quiz.id,
      timeTakenSeconds,
      score,
      answers: questions.map((q) => {
        const val = currentAnswers[q.id] || "";
        let givenAnswer = "";
        
        if (Array.isArray(val)) {
          givenAnswer = val.join(",");
        } else if (typeof val === "string") {
          givenAnswer = val;
        }
        
        return {
          questionId: q.id,
          givenAnswer,
        };
      })
    };
  }, [quiz, questions, calculateScore]);

  // Handle quiz submission
  const handleSubmit = useCallback(async () => {
    if (!quiz) return;
    
    const payload = buildPayload(answers, timeLeft);
    if (!payload) return;
    
    try {
      setSubmitting(true);
      const result = await submitResult(payload);
      setSubmittedResult(result);
      setStarted(false);
    } catch (e: any) {
      setError(e.message || "Failed to submit result");
    } finally {
      setSubmitting(false);
    }
  }, [quiz, answers, timeLeft, buildPayload]);

  // Timer effect
  useEffect(() => {
    if (!started || submittedResult) return;
    
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    
    const timerId = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timerId);
  }, [started, timeLeft, submittedResult, handleSubmit]);

  const handleAnswerSelect = useCallback((question: QuestionDto, answer: AnswerDto) => {
    setAnswers(prev => {
      const currentAnswers = { ...prev };
      const questionId = question.id;
      
      switch (question.questionType) {
        case 0:
          currentAnswers[questionId] = answer.id;
          break;
          
        case 1:
          const current = (currentAnswers[questionId] as string[]) || [];
          currentAnswers[questionId] = current.includes(answer.id)
            ? current.filter(id => id !== answer.id)
            : [...current, answer.id];
          break;
          
        case 2:
          currentAnswers[questionId] = answer.text;
          break;
          
        case 3:
          currentAnswers[questionId] = answer.text;
          break;
      }
      
      return currentAnswers;
    });
    
    setHasInteracted(true);
  }, []);

  const handleFillInTheBlank = useCallback((question: QuestionDto, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [question.id]: text
    }));
    setHasInteracted(true);
  }, []);

  const renderAnswerOptions = (question: QuestionDto) => {
    const selectedAnswer = answers[question.id];
    
    switch (question.questionType) {
      case 0:
        return (
          <div className="answer-list">
            {question.answers.map(answer => (
              <label 
                key={answer.id} 
                className={`answer-option ${selectedAnswer === answer.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={selectedAnswer === answer.id}
                  onChange={() => handleAnswerSelect(question, answer)}
                />
                <span className="answer-text">{answer.text}</span>
              </label>
            ))}
          </div>
        );
        
      case 1:
        const selectedIds = (selectedAnswer as string[]) || [];
        return (
          <div className="answer-list">
            {question.answers.map(answer => (
              <label 
                key={answer.id} 
                className={`answer-option ${selectedIds.includes(answer.id) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(answer.id)}
                  onChange={() => handleAnswerSelect(question, answer)}
                />
                <span className="answer-text">{answer.text}</span>
              </label>
            ))}
          </div>
        );
        
      case 2:
        return (
          <div className="answer-list">
            {question.answers.map(answer => (
              <button
                key={answer.id}
                type="button"
                className={`answer-option ${selectedAnswer === answer.text ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(question, answer)}
              >
                {answer.text}
              </button>
            ))}
          </div>
        );
        
      case 3:
        return (
          <input
            type="text"
            className="fill-blank-input"
            value={(selectedAnswer as string) || ''}
            onChange={(e) => handleFillInTheBlank(question, e.target.value)}
            placeholder="Type your answer..."
          />
        );
        
      default:
        return null;
    }
  };

  // Handle quiz submission
  const handleQuizSubmit = async () => {
    if (!quiz) return;
    
    setSubmitting(true);
    try {
      const payload = buildPayload(answers, timeLeft);
      if (!payload) throw new Error('Failed to build submission payload');
      
      const result = await submitResult(payload);
      setSubmittedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="quiz-play-page">
        <Loading />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="quiz-play-page">
        <div className="error-message">{error}</div>
        <button 
          className="quiz-button" 
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Render quiz start screen
  if (!started) {
    return (
      <div className="quiz-play-page">
        <div className="quiz-start-screen">
          <h1>{quiz?.title}</h1>
          <p>{quiz?.description}</p>
          <div className="quiz-meta">
            <p>Questions: {questions.length}</p>
            <p>Time Limit: {formatTime(quiz?.timeLimitSeconds || 0)}</p>
          </div>
          <button 
            className="quiz-button quiz-button-primary"
            onClick={() => setStarted(true)}
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // Render quiz result
  if (submittedResult) {
    return (
      <div className="quiz-play-page">
        <div className="quiz-result">
          <h1>Quiz Completed!</h1>
          <div className="result-score">
            Your score: {submittedResult.score} / {submittedResult.maxPossibleScore}
          </div>
          <button 
            className="quiz-button"
            onClick={() => navigate('/results')}
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // Render quiz in progress
  return (
    <div className={`quiz-play-page ${!loading ? 'fade-in' : ''}`}>
      <div className="quiz-header">
        <h1>{quiz?.title}</h1>
        <div className="quiz-timer">
          Time Remaining: {formatTime(timeLeft)}
        </div>
      </div>
      
      <div className="questions">
        {questions.map((question, index) => (
          <div className="quiz-question-card" key={question.id}>
            <div className="question-header">
              <div className="question-index">
                Question {index + 1} of {questions.length}
              </div>
              <h2 className="question-text">{question.text}</h2>
            </div>
            
            <div className="question-answers">
              {renderAnswerOptions(question)}
            </div>
          </div>
        ))}
        
        <div className="quiz-actions">
          <button
            className="quiz-button quiz-button-primary"
            disabled={submitting || !hasInteracted}
            onClick={handleQuizSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
          <button 
            className="quiz-button quiz-button-outline"
            onClick={() => {
              if (window.confirm('Are you sure you want to cancel? Your progress will be lost.')) {
                navigate('/quizzes');
              }
            }}
          >
            Cancel Quiz
          </button>
        </div>
      </div>
    </div>
  );
};
export default QuizPlay;
