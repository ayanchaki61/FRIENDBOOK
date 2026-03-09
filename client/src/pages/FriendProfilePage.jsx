import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AvatarImage from '../components/AvatarImage';

function FriendProfilePage() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [commentInputs, setCommentInputs] = useState({});
  const [isUnfriending, setIsUnfriending] = useState(false);
  const [isRequestActionLoading, setIsRequestActionLoading] = useState(false);
  const [relationship, setRelationship] = useState({ areFriends: false, pendingRequest: null });

  const loadProfile = useCallback(async () => {
    try {
      const [profileResponse, postsResponse, relationshipResponse] = await Promise.all([
        api.get(`/users/profile/${id}`),
        api.get(`/posts/user/${id}`),
        api.get(`/friends/status/${id}`),
      ]);
      setProfile(profileResponse.data);
      setPosts(postsResponse.data);
      setRelationship(relationshipResponse.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const toggleLike = async (postId) => {
    try {
      await api.post(`/posts/${postId}/like`);
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update like');
    }
  };

  const submitComment = async (postId) => {
    const textValue = (commentInputs[postId] || '').trim();
    if (!textValue) return;

    try {
      await api.post(`/posts/${postId}/comments`, { text: textValue });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const toggleCommentLike = async (postId, commentId) => {
    try {
      await api.post(`/posts/${postId}/comments/${commentId}/like`);
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update comment reaction');
    }
  };

  const unfriend = async () => {
    if (isUnfriending) return;

    const confirmed = window.confirm(`Unfriend ${profile?.name || 'this user'}?`);
    if (!confirmed) return;

    try {
      setIsUnfriending(true);
      await api.delete(`/friends/${id}`);
      await refreshMe();
      navigate('/friends');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unfriend user');
    } finally {
      setIsUnfriending(false);
    }
  };

  const acceptRequest = async () => {
    const requestId = relationship.pendingRequest?.id;
    if (!requestId || isRequestActionLoading) return;

    try {
      setIsRequestActionLoading(true);
      await api.post(`/friends/requests/${requestId}/accept`);
      await refreshMe();
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setIsRequestActionLoading(false);
    }
  };

  const rejectRequest = async () => {
    const requestId = relationship.pendingRequest?.id;
    if (!requestId || isRequestActionLoading) return;

    try {
      setIsRequestActionLoading(true);
      await api.post(`/friends/requests/${requestId}/reject`);
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setIsRequestActionLoading(false);
    }
  };

  const sendRequest = async () => {
    if (isRequestActionLoading) return;

    try {
      setIsRequestActionLoading(true);
      await api.post(`/friends/request/${id}`);
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send friend request');
    } finally {
      setIsRequestActionLoading(false);
    }
  };

  const openUserProfile = (profileUser) => {
    const profileId = profileUser?._id || profileUser?.id;
    if (!profileId) return;
    navigate(`/profile/${profileId}`);
  };

  if (error) {
    return <section className="card">{error}</section>;
  }

  if (!profile) {
    return <section className="card">Loading profile...</section>;
  }

  return (
    <div className="grid-page">
      <section className="card friend-profile-card">
        <div className="friend-profile-head">
          <h2>Friend Profile</h2>
        </div>

        <div className="profile-avatar-wrap friend-avatar-wrap">
          <AvatarImage
            src={profile.avatar}
            alt={profile.name}
            className="avatar-preview avatar-preview-large friend-profile-avatar"
          />
        </div>

        <div className="friend-identity">
          <h3>{profile.name}</h3>
          <p className="friend-email">{profile.email}</p>
        </div>

        <div className="friend-stats-row">
          <div className="friend-stat-pill">
            <span className="label">Friends</span>
            <strong>{Array.isArray(profile.friends) ? profile.friends.length : 0}</strong>
          </div>
          <div className="friend-stat-pill">
            <span className="label">Posts</span>
            <strong>{posts.length}</strong>
          </div>
        </div>

        <div className="friend-bio-box">{profile.bio || 'No bio yet.'}</div>

        <div className="friend-detail-list">
          <div className="friend-detail-item">
            <span>Location</span>
            <strong>{profile.location || '-'}</strong>
          </div>
          <div className="friend-detail-item">
            <span>Work</span>
            <strong>{profile.work || '-'}</strong>
          </div>
          <div className="friend-detail-item">
            <span>Study</span>
            <strong>{profile.study || '-'}</strong>
          </div>
          <div className="friend-detail-item">
            <span>DOB</span>
            <strong>{profile.dob || '-'}</strong>
          </div>
          <div className="friend-detail-item">
            <span>Relationship</span>
            <strong>{profile.relationship || '-'}</strong>
          </div>
        </div>

        <div className="friend-profile-actions">
          {relationship.areFriends ? (
            <button type="button" className="btn-danger friend-unfriend-btn" onClick={unfriend} disabled={isUnfriending}>
              {isUnfriending ? 'Unfriending...' : 'Unfriend'}
            </button>
          ) : relationship.pendingRequest?.direction === 'incoming' ? (
            <div className="friend-action-row">
              <button type="button" onClick={acceptRequest} disabled={isRequestActionLoading}>
                {isRequestActionLoading ? '...' : 'Accept'}
              </button>
              <button type="button" className="btn-muted" onClick={rejectRequest} disabled={isRequestActionLoading}>
                {isRequestActionLoading ? '...' : 'Reject'}
              </button>
            </div>
          ) : relationship.pendingRequest?.direction === 'outgoing' ? (
            <button type="button" className="btn-muted friend-unfriend-btn" disabled>
              Request Pending
            </button>
          ) : (
            <button type="button" className="friend-unfriend-btn" onClick={sendRequest} disabled={isRequestActionLoading}>
              {isRequestActionLoading ? 'Sending...' : 'Add Friend'}
            </button>
          )}
        </div>
      </section>

      <section className="card feed">
        <h2>{profile.name}'s Posts</h2>
        {!posts.length && <p>No posts yet.</p>}
        {posts.map((post) => (
          <article className="post" key={post._id}>
            {(() => {
              const currentUserId = user?._id || user?.id;
              const isLoved = (post.likes || []).some((likeId) => likeId === currentUserId || likeId?._id === currentUserId);

              return (
                <>
            <div className="post-meta">{new Date(post.createdAt).toLocaleString()}</div>
            {post.text && <p>{post.text}</p>}
            {post.photoUrl && <img src={post.photoUrl} alt="Post" className="post-image" />}

            <div className="post-reactions">
              <span
                role="button"
                tabIndex={0}
                className={`love-icon ${isLoved ? 'active' : ''}`}
                onClick={() => toggleLike(post._id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleLike(post._id);
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
              {(post.comments || []).map((comment) => (
                <div className="comment-item" key={comment._id}>
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
                        (likeId) => likeId === currentUserId || likeId?._id === currentUserId
                      );

                      return (
                        <span
                          role="button"
                          tabIndex={0}
                          className={`love-icon comment-love ${loved ? 'active' : ''}`}
                          onClick={() => toggleCommentLike(post._id, comment._id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              toggleCommentLike(post._id, comment._id);
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
              ))}
            </div>

            <div className="comment-form-row">
              <input
                type="text"
                value={commentInputs[post._id] || ''}
                onChange={(e) =>
                  setCommentInputs((prev) => ({
                    ...prev,
                    [post._id]: e.target.value,
                  }))
                }
                placeholder="Write a comment"
              />
              <button type="button" onClick={() => submitComment(post._id)}>
                Comment
              </button>
            </div>
                </>
              );
            })()}
          </article>
        ))}
      </section>
    </div>
  );
}

export default FriendProfilePage;
