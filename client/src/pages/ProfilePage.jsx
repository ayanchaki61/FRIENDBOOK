import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import AvatarImage from '../components/AvatarImage';
import { useNavigate } from 'react-router-dom';

function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatar: '',
    location: '',
    work: '',
    study: '',
    dob: '',
    relationship: '',
  });
  const [status, setStatus] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingPostId, setEditingPostId] = useState('');
  const [editForm, setEditForm] = useState({ text: '', photoUrl: '' });
  const [commentInputs, setCommentInputs] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [passwordMode, setPasswordMode] = useState('update');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState('');

  const loadMyPosts = async (profileUser) => {
    const userId = profileUser?.id || profileUser?._id;
    if (!userId) return;
    const response = await api.get(`/posts/user/${userId}`);
    setPosts(response.data);
  };

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        location: user.location || '',
        work: user.work || '',
        study: user.study || '',
        dob: user.dob || '',
        relationship: user.relationship || '',
      });
      loadMyPosts(user);
      setPasswordMode(user.hasPassword ? 'update' : 'add');
    }
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isEditing) return;
    setStatus('');
    setSaving(true);

    try {
      let avatarUrl = form.avatar;

      if (avatarFile) {
        const formData = new FormData();
        formData.append('image', avatarFile);
        const uploadResponse = await api.post('/upload/image?type=profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        avatarUrl = uploadResponse.data.url;
      }

      await api.put('/users/profile', { ...form, avatar: avatarUrl });
      setForm((prev) => ({ ...prev, avatar: avatarUrl }));
      setAvatarFile(null);
      await refreshMe();
      setStatus('Profile updated');
      setIsEditing(false);
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setStatus('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (!user) return;
    setForm({
      name: user.name || '',
      bio: user.bio || '',
      avatar: user.avatar || '',
      location: user.location || '',
      work: user.work || '',
      study: user.study || '',
      dob: user.dob || '',
      relationship: user.relationship || '',
    });
    setAvatarFile(null);
    setStatus('');
    setIsEditing(false);
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const toggleSettings = () => {
    setIsEditing(false);
    setShowSettings((prev) => !prev);
    setPasswordStatus('');
    resetPasswordForm();
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordStatus('');

    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!newPassword) {
      setPasswordStatus('New password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus('Password confirmation does not match');
      return;
    }

    if (passwordMode === 'update' && user?.hasPassword && !passwordForm.currentPassword) {
      setPasswordStatus('Current password is required to update password');
      return;
    }

    try {
      setPasswordSaving(true);
      const payload = {
        newPassword,
      };

      if (passwordMode === 'update' && user?.hasPassword) {
        payload.currentPassword = passwordForm.currentPassword;
      }

      const response = await api.post('/auth/password', payload);
      setPasswordStatus(response.data?.message || 'Password saved');
      resetPasswordForm();
      await refreshMe();
      setPasswordMode('update');
    } catch (error) {
      setPasswordStatus(error.response?.data?.message || 'Failed to save password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const startEditPost = (post) => {
    setEditingPostId(post._id || post.id);
    setEditForm({
      text: post.text || '',
      photoUrl: post.photoUrl || '',
    });
  };

  const cancelEditPost = () => {
    setEditingPostId('');
    setEditForm({ text: '', photoUrl: '' });
  };

  const savePostEdit = async (postId) => {
    try {
      await api.put(`/posts/${postId}`, editForm);
      await loadMyPosts(user);
      cancelEditPost();
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to update post');
    }
  };

  const deletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      await loadMyPosts(user);
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to delete post');
    }
  };

  const toggleLike = async (postId) => {
    try {
      await api.post(`/posts/${postId}/like`);
      await loadMyPosts(user);
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to update like');
    }
  };

  const submitComment = async (postId) => {
    const textValue = (commentInputs[postId] || '').trim();
    if (!textValue) return;

    try {
      await api.post(`/posts/${postId}/comments`, { text: textValue });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      await loadMyPosts(user);
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to add comment');
    }
  };

  const toggleCommentLike = async (postId, commentId) => {
    try {
      await api.post(`/posts/${postId}/comments/${commentId}/like`);
      await loadMyPosts(user);
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to update comment reaction');
    }
  };

  const openUserProfile = (profileUser) => {
    const profileId = profileUser?._id || profileUser?.id;
    if (!profileId) return;
    navigate(`/profile/${profileId}`);
  };

  return (
    <div className="grid-page">
      <section className="card">
        <div className="profile-head-row">
          <h2>Profile</h2>
          <div className="profile-head-actions">
            {!isEditing && (
              <button type="button" className="icon-edit-btn" onClick={startEditing}>
                Edit
              </button>
            )}
            <button type="button" className="icon-edit-btn" onClick={toggleSettings}>
              {showSettings ? 'Close Settings' : '\u2699 Settings'}
            </button>
          </div>
        </div>

        {showSettings && (
          <section className="settings-panel">
            <h3>Account Settings</h3>
            <p className="muted">
              {user?.hasPassword
                ? 'Update your password to keep your account secure.'
                : 'Your account was created with Google. Add a password to enable email/password login too.'}
            </p>
            <div className="settings-mode-row">
              <button
                type="button"
                className={`btn-muted ${passwordMode === 'add' ? 'settings-mode-active' : ''}`}
                onClick={() => setPasswordMode('add')}
              >
                Add Password
              </button>
              <button
                type="button"
                className={`btn-muted ${passwordMode === 'update' ? 'settings-mode-active' : ''}`}
                onClick={() => setPasswordMode('update')}
              >
                Update Password
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="stack-form settings-form">
              {passwordMode === 'update' && user?.hasPassword && (
                <input
                  type="password"
                  placeholder="Current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                />
              )}
              <input
                type="password"
                placeholder={passwordMode === 'add' ? 'Set new password' : 'New password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
              <div className="profile-action-row">
                <button type="submit" disabled={passwordSaving}>
                  {passwordSaving ? 'Saving...' : passwordMode === 'add' ? 'Add Password' : 'Update Password'}
                </button>
                <button
                  type="button"
                  className="btn-muted"
                  onClick={() => {
                    setShowSettings(false);
                    setPasswordStatus('');
                    resetPasswordForm();
                  }}
                >
                  Close
                </button>
              </div>
              {passwordStatus && <p>{passwordStatus}</p>}
            </form>
          </section>
        )}

        <form onSubmit={handleSubmit} className="stack-form">
          <div className="profile-avatar-wrap">
            <AvatarImage src={form.avatar} alt="Profile avatar" className="avatar-preview avatar-preview-large" />
          </div>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name"
            readOnly={!isEditing}
          />
          <input type="email" value={user?.email || ''} placeholder="Email" readOnly />
          <textarea
            value={form.bio}
            onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
            placeholder="Bio"
            rows={3}
            readOnly={!isEditing}
          />
          <input
            type="url"
            value={form.avatar}
            onChange={(e) => setForm((prev) => ({ ...prev, avatar: e.target.value }))}
            placeholder="Avatar URL"
            readOnly={!isEditing}
          />
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Location"
            readOnly={!isEditing}
          />
          <input
            type="text"
            value={form.work}
            onChange={(e) => setForm((prev) => ({ ...prev, work: e.target.value }))}
            placeholder="Work"
            readOnly={!isEditing}
          />
          <input
            type="text"
            value={form.study}
            onChange={(e) => setForm((prev) => ({ ...prev, study: e.target.value }))}
            placeholder="Study"
            readOnly={!isEditing}
          />
          <input
            type="date"
            value={form.dob}
            onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
            placeholder="DOB"
            readOnly={!isEditing}
          />
          <select
            value={form.relationship}
            onChange={(e) => setForm((prev) => ({ ...prev, relationship: e.target.value }))}
            disabled={!isEditing}
          >
            <option value="">Relationship</option>
            <option value="Single">Single</option>
            <option value="In a Relationship">In a Relationship</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Separated">Separated</option>
          </select>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            disabled={!isEditing}
          />
          {avatarFile && <small>Selected: {avatarFile.name}</small>}
          {isEditing && (
            <div className="profile-action-row">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <button type="button" className="btn-muted" onClick={cancelEditing}>
                Cancel
              </button>
            </div>
          )}
          {status && <p>{status}</p>}
        </form>
      </section>

      <section className="card feed">
        <h2>My Posts</h2>
        {posts.map((post) => {
          const postId = post._id || post.id;
          const currentUserId = user?._id || user?.id;
          const isLoved = (post.likes || []).some((id) => id === currentUserId || id?._id === currentUserId);

          return (
            <article className="post" key={postId}>
              <div className="post-meta">{new Date(post.createdAt).toLocaleString()}</div>
              {editingPostId === postId ? (
                <div className="stack-form">
                  <textarea
                    rows={3}
                    value={editForm.text}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder="Edit text"
                  />
                  <input
                    type="url"
                    value={editForm.photoUrl}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, photoUrl: e.target.value }))}
                    placeholder="Edit photo URL"
                  />
                  <div className="post-actions">
                    <button type="button" onClick={() => savePostEdit(postId)}>
                      Save
                    </button>
                    <button type="button" className="btn-muted" onClick={cancelEditPost}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {post.text && <p>{post.text}</p>}
                  {post.photoUrl && <img src={post.photoUrl} alt="Post" className="post-image" />}
                  <div className="post-actions">
                    <button type="button" className="btn-muted" onClick={() => startEditPost(post)}>
                      Edit
                    </button>
                    <button type="button" className="btn-danger" onClick={() => deletePost(postId)}>
                      Delete
                    </button>
                  </div>
                </>
              )}

              <div className="post-reactions">
                <span
                  role="button"
                  tabIndex={0}
                  className={`love-icon ${isLoved ? 'active' : ''}`}
                  onClick={() => toggleLike(postId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleLike(postId);
                    }
                  }}
                  aria-label="Love post"
                  title="Love"
                >
                  {isLoved ? '♥' : '♡'}
                </span>
                <span className="love-count">{post.likes?.length || 0}</span>
              </div>

              <div className="comment-list">
                {(post.comments || []).map((comment) => {
                  const commentId = comment._id || comment.id;
                  return (
                    <div className="comment-item" key={commentId}>
                      <button
                        type="button"
                        className="profile-inline-link"
                        onClick={() => openUserProfile(comment.user)}
                      >
                        <AvatarImage src={comment.user?.avatar} alt={comment.user?.name || 'User'} className="comment-avatar" />
                      </button>
                      <div className="comment-main">
                        <div>
                          <button
                            type="button"
                            className="profile-inline-link profile-name-link"
                            onClick={() => openUserProfile(comment.user)}
                          >
                            <strong>{comment.user?.name || 'User'}</strong>
                          </button>
                          <p>{comment.text}</p>
                        </div>
                        {(() => {
                          const loved = (comment.likes || []).some(
                            (id) => id === currentUserId || id?._id === currentUserId
                          );

                          return (
                            <span
                              role="button"
                              tabIndex={0}
                              className={`love-icon comment-love ${loved ? 'active' : ''}`}
                              onClick={() => toggleCommentLike(postId, commentId)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  toggleCommentLike(postId, commentId);
                                }
                              }}
                              aria-label="Love comment"
                              title="Love comment"
                            >
                              {loved ? '♥' : '♡'} {comment.likes?.length || 0}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="comment-form-row">
                <input
                  type="text"
                  value={commentInputs[postId] || ''}
                  onChange={(e) =>
                    setCommentInputs((prev) => ({
                      ...prev,
                      [postId]: e.target.value,
                    }))
                  }
                  placeholder="Write a comment"
                />
                <button type="button" onClick={() => submitComment(postId)}>
                  Comment
                </button>
              </div>
            </article>
          );
        })}
        {!posts.length && <p>No posts yet.</p>}
      </section>
    </div>
  );
}

export default ProfilePage;
