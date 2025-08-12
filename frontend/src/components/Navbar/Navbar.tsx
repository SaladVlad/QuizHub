import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getUserById } from "../../services/userService";
import { isAdmin } from "../../utils/auth";
import "./Navbar.scss";

// NavItem component for consistent link styling
interface NavItemProps {
  to: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, children, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <li className={`nav-item ${isActive ? 'active' : ''}`}>
      <Link 
        to={to} 
        onClick={onClick}
        className={isActive ? 'active' : ''}
      >
        {children}
        <span className="nav-indicator"></span>
      </Link>
    </li>
  );
};

// Navigation items component with proper admin check
const NavItems: React.FC<{ isAdmin?: boolean }> = ({ isAdmin }) => (
  <>
    <NavItem to="/quizzes">Quizzes</NavItem>
    <NavItem to="/results">My Results</NavItem>
    <NavItem to="/leaderboard">Leaderboard</NavItem>
    {isAdmin && (
      <NavItem to="/admin/quizzes/new">Create Quiz</NavItem>
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

  // Close dropdown and mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close dropdown if open and click is outside
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setClosing(true);
        setTimeout(() => {
          setDropdownOpen(false);
          setClosing(false);
        }, 250);
      }
      
      // Close mobile menu if open and click is outside
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Only close if not clicking on the mobile menu button
        if (!target.closest('.mobile-menu-button')) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, mobileMenuOpen]);

  return (
    <header className="navbar">
      <div className="navbar-wrapper">
        <div className="navbar-container">
          <div className="navbar-left">
            <button 
              className={`mobile-menu-button ${mobileMenuOpen ? 'open' : ''}`}
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="menu-icon">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
            <Link to="/" className="logo" aria-label="Home" onClick={closeMobileMenu}>
              <span>Kviz</span>Hub
            </Link>
          </div>
          
          <div className="desktop-nav">
            <ul className="nav-links">
              <NavItems isAdmin={isAuthenticated && authUser ? isAdmin(authUser) : false} />
            </ul>
          </div>
          
          <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`} ref={mobileMenuRef}>
            <ul className="mobile-nav-links">
              <NavItems isAdmin={isAuthenticated && authUser ? isAdmin(authUser) : false} />
            </ul>
          </div>
          {isAuthenticated && (
            <div className="profile-dropdown" ref={dropdownRef}>
              <img
                src={avatarSrc}
                alt="Profile"
                className="avatar"
                onClick={toggleDropdown}
                onKeyDown={(e) => e.key === 'Enter' && toggleDropdown()}
                tabIndex={0}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
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
      </div>
    </header>
  );
};

export default Navbar;
