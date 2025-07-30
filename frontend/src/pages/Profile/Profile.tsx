import React, { useEffect, useRef, useState, ChangeEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  getUserById,
  updateUser,
  resetPassword,
} from "../../services/userService";
import { ResetPasswordRequestDto, UserDto } from "../../models/UserDtos";
import "./Profile.scss";

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
      // Check if authUser already has all required fields
      if (
        authUser.username &&
        authUser.email &&
        authUser.avatarImage !== undefined
      ) {
        setUser(authUser);
        setFormData({ username: authUser.username, email: authUser.email });
        if (authUser.avatarImage) {
          setAvatarPreview(`data:image/png;base64,${authUser.avatarImage}`);
        }
        setLoading(false);
        return;
      }
      try {
        const fullUser = await getUserById(authUser.id, true);
        setUser(fullUser);
        setFormData({ username: fullUser.username, email: fullUser.email });
        if (fullUser.avatarImage) {
          setAvatarPreview(`data:image/png;base64,${fullUser.avatarImage}`);
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

  if (loading)
    return (
      <div className="container">
        <p>Loading profile...</p>
      </div>
    );

  return (
    <div className="container profile">
      <h1>My Profile</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="card">
        <div className="form-group">
          <label>Profile Picture</label>
          <div className="avatar-upload">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={!editing}
              style={{ display: "none" }}
            />
            {avatarPreview ? (
              <div className="avatar-preview">
                <img src={avatarPreview} alt="Avatar" />
                {editing && (
                  <button
                    type="button"
                    className="remove-image"
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              editing && (
                <button
                  type="button"
                  className="upload-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Image
                </button>
              )
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            disabled={!editing}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            disabled={!editing}
            onChange={handleChange}
          />
        </div>

        {editing ? (
          <button className="btn btn-primary mt-4" onClick={handleProfileSave}>
            Save Changes
          </button>
        ) : (
          <button className="btn btn-secondary mt-4" onClick={handleEditToggle}>
            Edit Profile
          </button>
        )}
      </div>

      <div className="card mt-4">
        <h2>Reset Password</h2>
        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData((prev) => ({
                ...prev,
                newPassword: e.target.value,
              }))
            }
          />
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData((prev) => ({
                ...prev,
                confirmPassword: e.target.value,
              }))
            }
          />
        </div>
        <button className="btn btn-primary mt-4" onClick={handlePasswordReset}>
          Change Password
        </button>
      </div>
    </div>
  );
};

export default Profile;
