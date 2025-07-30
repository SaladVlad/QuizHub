import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import HomePage from "../pages/HomePage/HomePage";
import QuizList from "../pages/QuizList/QuizList";
import Leaderboard from "../pages/Leaderboard/Leaderboard";
import Results from "../pages/Results/Results";
import LandingPage from "../pages/LandingPage/LandingPage";
import Layout from "../layouts/Layout";
import Profile from "../pages/Profile/Profile";

const AppRouter = () => {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {!isAuthenticated && (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}

        {isAuthenticated && (
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="quizzes" element={<QuizList />} />
            <Route path="results" element={<Results />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
