import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isAdmin as isAdminUtil } from "../utils/auth";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import HomePage from "../pages/HomePage/HomePage";
import QuizList from "../pages/QuizList/QuizList";
import Leaderboard from "../pages/Leaderboard/Leaderboard";
import QuizPlay from "../pages/QuizPlay/QuizPlay";
import Results from "../pages/Results/Results";
import ResultDetails from "../pages/ResultDetails/ResultDetails";
import QuizCreate from "../pages/Admin/QuizCreate";
import QuizEdit from "../pages/Admin/QuizEdit";
import LandingPage from "../pages/LandingPage/LandingPage";
import Layout from "../layouts/Layout";
import Profile from "../pages/Profile/Profile";

const AppRouter = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const admin = isAdminUtil(user);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="quizzes" element={<QuizList />} />
            <Route path="quizzes/:id/play" element={<QuizPlay />} />
            <Route path="results" element={<Results />} />
            <Route path="results/:id" element={<ResultDetails />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route
              path="admin/quizzes/new"
              element={admin ? <QuizCreate /> : <Navigate to="/" />}
            />
            <Route
              path="admin/quizzes/:id/edit"
              element={admin ? <QuizEdit /> : <Navigate to="/" />}
            />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
