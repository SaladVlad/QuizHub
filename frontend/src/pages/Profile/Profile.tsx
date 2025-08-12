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
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<UserDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<{ username: string; email: string }>(
    { username: "", email: "" }
  );
  const [avatarImage, setAvatarImage] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
        setFormData({ username: fullUser.username, email: fullUser.email });

        if (fullUser.avatarImage) {
          const isBase64 = fullUser.avatarImage.startsWith("data:");
          setAvatarPreview(
            isBase64
              ? fullUser.avatarImage
              : `data:image/png;base64,${fullUser.avatarImage}`
          );
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
    setError("");

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setAvatarImage(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleProfileSave = async () => {
    if (!user) return;
    try {
      setError("");
      setSuccess("");
      await updateUser({
        userId: user.id,
        username: formData.username,
        email: formData.email,
        avatarImage: avatarImage || undefined,
      });
      setSuccess("Profile updated successfully.");
      setEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    }
  };

  const handlePasswordReset = async () => {
    if (!user) return;

    const { newPassword, confirmPassword } = passwordData;
    if (newPassword !== confirmPassword)
      return setError("Passwords do not match");

    try {
      setError("");
      setSuccess("");
      const payload: ResetPasswordRequestDto = {
        userId: user.id,
        newPassword,
        confirmPassword,
      };
      await resetPassword(payload);
      setSuccess("Password changed successfully.");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <Loading />
      </div>
    );
  }

  return (
    <div className="profile">
      <h1>My Profile</h1>

      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}

      <div className="card">
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
              className="primary"
              onClick={handlePasswordReset}
              disabled={
                !passwordData.newPassword ||
                passwordData.newPassword !== passwordData.confirmPassword
              }
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
