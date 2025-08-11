import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getUserById } from "../../services/userService";
import { isAdmin } from "../../utils/auth";
import "./Navbar.scss";

const Navbar: React.FC = () => {
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleDropdown = () => {
    if (dropdownOpen) {
      setClosing(true);
      setTimeout(() => {
        setDropdownOpen(false);
        setClosing(false);
      }, 100);
    } else {
      setDropdownOpen(true);
    }
  };

  useEffect(() => {
    const fetchFullUser = async () => {
      if (authUser?.id) {
        try {
          const fullUser = await getUserById(authUser.id, true);
          if (fullUser.avatarImage) {
            setAvatarImage(`data:image/png;base64,${fullUser.avatarImage}`);
          }
        } catch (err) {
          /* no-op */
        }
      }
    };

    if (isAuthenticated) {
      fetchFullUser();
    }
  }, [isAuthenticated, authUser]);

  const avatarSrc = avatarImage || "/default-avatar.png";

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setClosing(true);
        setTimeout(() => {
          setDropdownOpen(false);
          setClosing(false);
        }, 250);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo">
          KvizHub
        </Link>
        <ul className="nav-links">
          <li>
            <Link to="/quizzes">Quizzes</Link>
          </li>
          <li>
            <Link to="/results">My Results</Link>
          </li>
          <li>
            <Link to="/leaderboard">Leaderboard</Link>
          </li>
          {isAuthenticated && isAdmin(authUser) && (
            <li>
              <Link to="/admin/quizzes/new">Create Quiz</Link>
            </li>
          )}
        </ul>
        {isAuthenticated && (
          <div className="profile-dropdown" ref={dropdownRef}>
            <img
              src={avatarSrc}
              alt="Profile"
              className="avatar"
              onClick={toggleDropdown}
            />
            {(dropdownOpen || closing) && (
              <div
                className={`dropdown-menu ${closing ? "closing" : "opening"}`}
                onAnimationEnd={() => {
                  if (closing) {
                    setDropdownOpen(false);
                    setClosing(false);
                  }
                }}
              >
                <Link to="/profile" onClick={() => setDropdownOpen(false)}>
                  See Profile
                </Link>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
