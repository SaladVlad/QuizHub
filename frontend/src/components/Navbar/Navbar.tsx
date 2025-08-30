import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getUserById } from "../../services/userService";
import { isAdmin } from "../../utils/auth";
import "./Navbar.scss";

interface NavItemProps {
  to: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, children, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <li className="nav-item">
      <Link 
        to={to} 
        onClick={onClick}
        className={isActive ? 'active' : ''}
      >
        {children}
      </Link>
    </li>
  );
};

const NavItems: React.FC<{ isAdmin?: boolean }> = ({ isAdmin }) => (
  <>
    <NavItem to="/quizzes">
      <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
      </svg>
      Quizzes
    </NavItem>
    <NavItem to="/results">
      <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
      </svg>
      My Results
    </NavItem>
    <NavItem to="/leaderboard">
      <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
      </svg>
      Leaderboard
    </NavItem>
    {isAdmin && (
      <>
        <NavItem to="/admin/quizzes/new">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Create Quiz
        </NavItem>
        <NavItem to="/admin/results">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
          Manage Results
        </NavItem>
      </>
    )}
  </>
);

const Navbar: React.FC = () => {
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

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
      }, 150);
    } else {
      setDropdownOpen(true);
    }
  };

  // Fetch user avatar
  useEffect(() => {
    const fetchFullUser = async () => {
      if (authUser?.id) {
        try {
          const fullUser = await getUserById(authUser.id, true);
          if (fullUser.avatarImage) {
            setAvatarImage(`data:image/png;base64,${fullUser.avatarImage}`);
          }
        } catch (err) {
          // Handle error silently
        }
      }
    };

    if (isAuthenticated) {
      fetchFullUser();
    }
  }, [isAuthenticated, authUser]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close dropdown if open and click is outside
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(target)) {
        setClosing(true);
        setTimeout(() => {
          setDropdownOpen(false);
          setClosing(false);
        }, 150);
      }
      
      // Close mobile menu if open and click is outside
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        if (!target.closest('.mobile-menu-button')) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, mobileMenuOpen]);

  const avatarSrc = avatarImage || "/default-avatar.png";

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <button 
            className={`mobile-menu-button ${mobileMenuOpen ? 'open' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="menu-icon"></span>
          </button>
          
          <Link to="/" className="logo" onClick={closeMobileMenu}>
            <svg className="logo-icon" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="12" r="6" fill="currentColor"/>
              <circle cx="12" cy="12" r="2" fill="white"/>
            </svg>
            <span className="logo-text">
              <span className="logo-primary">Quiz</span>
              <span className="logo-secondary">Hub</span>
            </span>
          </Link>
        </div>
        
        <nav className="desktop-nav">
          <ul className="nav-links">
            <NavItems isAdmin={isAuthenticated && authUser ? isAdmin(authUser) : false} />
          </ul>
        </nav>
        
        {isAuthenticated && (
          <div className="profile-dropdown" ref={dropdownRef}>
            <button
              className="avatar-button"
              onClick={toggleDropdown}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              aria-label="User menu"
            >
              <img src={avatarSrc} alt="Profile" className="avatar" />
            </button>
            
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
                  <svg className="dropdown-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  See Profile
                </Link>
                <button onClick={handleLogout}>
                  <svg className="dropdown-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`} ref={mobileMenuRef}>
        <ul className="mobile-nav-links">
          <NavItems isAdmin={isAuthenticated && authUser ? isAdmin(authUser) : false} />
        </ul>
      </div>
    </header>
  );
};

export default Navbar;