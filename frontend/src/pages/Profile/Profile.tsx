import React, { useEffect, useRef, useState, ChangeEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  getUserById,
  updateUser,
  resetPassword,
} from "../../services/userService";
import { ResetPasswordRequestDto, UserDto } from "../../dtos/user";
import "./Profile.scss";
import Loading from "../../components/Loading/Loading";

const Profile: React.FC = () => {
  const { user: authUser, updateUser: updateAuthUser } = useAuth();
  const [user, setUser] = useState<UserDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [formData, setFormData] = useState<{ 
    username: string; 
    email: string; 
    firstName: string; 
    lastName: string; 
  }>({
    username: "", 
    email: "", 
    firstName: "", 
    lastName: ""
  });
  const [avatarImage, setAvatarImage] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (!authUser) return;
      try {
        const fullUser = await getUserById(authUser.id, true);
        setUser(fullUser);
        setFormData({ 
          username: fullUser.username, 
          email: fullUser.email,
          firstName: fullUser.firstName,
          lastName: fullUser.lastName
        });

        if (fullUser.avatarImage && fullUser.avatarImage.length > 0) {
          const isBase64 = fullUser.avatarImage.startsWith("data:");
          const imageUrl = isBase64
            ? fullUser.avatarImage
            : `data:image/png;base64,${fullUser.avatarImage}`;
          // Add timestamp to prevent caching issues
          setAvatarPreview(`${imageUrl}#${Date.now()}`);
        } else {
          setAvatarPreview(null);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [authUser]);

  const handleEditToggle = () => {
    setEditing(true);
    setSuccess("");
    setError("");
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file");
      return;
    }

    if (file.size > 1024 * 1024) {
      setError("Image size should be under 1MB");
      return;
    }

    setAvatarImage(file);
    setRemoveImage(false);
    setError("");

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setAvatarImage(null);
    setAvatarPreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleProfileSave = async () => {
    if (!authUser) return;
    try {
      setError("");
      setSuccess("");
      await updateUser({
        userId: authUser.id,
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        avatarImage: removeImage ? undefined : (avatarImage || undefined),
        removeImage: removeImage,
      });
      setSuccess("Profile updated successfully.");
      setEditing(false);
      setRemoveImage(false);
      
      // Refresh user data to update avatar preview
      const updatedUser = await getUserById(authUser.id, true);
      setUser(updatedUser);
      updateAuthUser(updatedUser); // Update the auth context too
      if (updatedUser.avatarImage && updatedUser.avatarImage.length > 0) {
        const isBase64 = updatedUser.avatarImage.startsWith("data:");
        const imageUrl = isBase64
          ? updatedUser.avatarImage
          : `data:image/png;base64,${updatedUser.avatarImage}`;
        // Add timestamp to force refresh
        setAvatarPreview(`${imageUrl}#${Date.now()}`);
      } else {
        setAvatarPreview(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    }
  };

  const handlePasswordReset = async () => {
    if (!user) return;

    const { newPassword, confirmPassword } = passwordData;
    
    // Clear previous messages
    setPasswordError("");
    setPasswordSuccess("");
    
    // Validate password length
    if (newPassword.length < 6) {
      return setPasswordError("Password must be at least 6 characters long");
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return setPasswordError("Passwords do not match");
    }

    try {
      const payload: ResetPasswordRequestDto = {
        userId: user.id,
        newPassword,
        confirmPassword,
      };
      await resetPassword(payload);
      setPasswordSuccess("Password changed successfully.");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setPasswordError(err.message || "Failed to reset password");
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
        <h1>My Profile</h1>
        <p>Manage your account settings and personal information</p>
      </div>


      <div className="card">
        <div className="card-body">
        <div className="avatar-upload">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={!editing}
            className="avatar-input"
            id="avatarUpload"
          />
          <label
            htmlFor="avatarUpload"
            className="avatar-preview-wrapper"
            style={{ cursor: editing ? 'pointer' : 'default' }}
          >
            <img
              src={avatarPreview || "/default-avatar.png"}
              alt="Profile"
              className="profile-avatar"
            />
            {editing && <div className="avatar-overlay">Change</div>}
          </label>
          
          {avatarPreview && editing && (
            <button
              type="button"
              className="remove-image"
              onClick={handleRemoveImage}
            >
              Remove Photo
            </button>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            value={formData.username}
            disabled={!editing}
            onChange={handleChange}
            placeholder="Enter your username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            disabled={!editing}
            onChange={handleChange}
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            name="firstName"
            value={formData.firstName}
            disabled={!editing}
            onChange={handleChange}
            placeholder="Enter your first name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            name="lastName"
            value={formData.lastName}
            disabled={!editing}
            onChange={handleChange}
            placeholder="Enter your last name"
          />
        </div>

        <div className="actions">
          {!editing ? (
            <button 
              className="primary" 
              onClick={handleEditToggle}
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button 
                className="primary" 
                onClick={handleProfileSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                className="secondary" 
                onClick={() => setEditing(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {error && <div className="message error-message">{error}</div>}
        {success && <div className="message success-message">{success}</div>}

        <div className="password-section">
          <h2>Change Password</h2>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              placeholder="Enter new password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              placeholder="Confirm new password"
            />
          </div>
          <div className="actions">
            <button
              className={`primary ${
                (!passwordData.newPassword ||
                passwordData.newPassword.length < 6 ||
                passwordData.newPassword !== passwordData.confirmPassword)
                  ? 'disabled'
                  : ''
              }`}
              onClick={handlePasswordReset}
              disabled={
                !passwordData.newPassword ||
                passwordData.newPassword.length < 6 ||
                passwordData.newPassword !== passwordData.confirmPassword
              }
            >
              Change Password
            </button>
          </div>

          {passwordError && <div className="message error-message">{passwordError}</div>}
          {passwordSuccess && <div className="message success-message">{passwordSuccess}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
