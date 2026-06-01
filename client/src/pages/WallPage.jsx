import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AvatarImage from '../components/AvatarImage';
import { navigateToUserProfile } from '../utils/profileNavigation';

function WallPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [focusedPostId, setFocusedPostId] = useState('');

  const loadHome = async () => {
    const response = await api.get('/posts/home');
    setPosts(response.data);
  };

  useEffect(() => {
    loadHome();
  }, []);

  useEffect(() => {
    const targetPostId = searchParams.get('post');
    if (!targetPostId || !posts.length) {
      return;
    }

    const element = document.getElementById(`post-${targetPostId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFocusedPostId(targetPostId);

      const timer = setTimeout(() => setFocusedPostId(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [posts, searchParams]);

  const handlePost = async (event) => {
    event.preventDefault();
    setError('');

    try {
      let finalPhotoUrl = photoUrl;

      if (photoFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', photoFile);
        const uploadResponse = await api.post('/upload/image?type=post', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalPhotoUrl = uploadResponse.data.url;
      }

      await api.post('/posts', { text, photoUrl: finalPhotoUrl });
      setText('');
      setPhotoUrl('');
      setPhotoFile(null);
      await loadHome();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish post');
    } finally {
      setUploading(false);
    }
  };

  const toggleLike = async (postId) => {
    try {
      await api.post(`/posts/${postId}/like`);
      await loadHome();
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
      await loadHome();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const toggleCommentLike = async (postId, commentId) => {
    try {
      await api.post(`/posts/${postId}/comments/${commentId}/like`);
      await loadHome();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update comment reaction');
    }
  };

  const openUserProfile = (profileUser) => {
    navigateToUserProfile(navigate, profileUser, user);
  };

  return (
    <div className="grid-page">
      <section className="card">
        <h2>Create Post</h2>
        <form onSubmit={handlePost} className="stack-form">
          <textarea
            placeholder="Share something with your friends..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />
          <input
            type="url"
            placeholder="Photo URL (optional)"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          />
          {photoFile && <small>Selected: {photoFile.name}</small>}
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Post'}
          </button>
        </form>
      </section>

      <section className="card feed">
        <h2>Home Feed</h2>
        {posts.length === 0 && <p>No posts yet. Start the first one.</p>}
        {posts.map((post) => {
          const postId = post._id || post.id;
          const currentUserId = user?._id || user?.id;
          const isLoved = (post.likes || []).some((id) => id === currentUserId || id?._id === currentUserId);

          return (
            <article
              className={`post ${focusedPostId === postId ? 'post-focus' : ''}`}
              id={`post-${postId}`}
              key={postId}
            >
            <div className="post-head">
              <button type="button" className="profile-inline-link post-author-link" onClick={() => openUserProfile(post.author)}>
                <AvatarImage src={post.author?.avatar} alt={post.author?.name || 'User'} className="post-author-avatar" />
              </button>
              <button type="button" className="profile-inline-link profile-name-link" onClick={() => openUserProfile(post.author)}>
                <strong>{post.author?.name || 'Unknown User'}</strong>
                <p>{new Date(post.createdAt).toLocaleString()}</p>
              </button>
            </div>
            {post.text && <p>{post.text}</p>}
            {post.photoUrl && (/(\.(mp4|webm|ogg|mov|mkv|avi))(\?.*)?$/i.test(post.photoUrl) ? (
              <video controls className="post-image">
                <source src={post.photoUrl} />
                Your browser does not support this video.
              </video>
            ) : (
              <img src={post.photoUrl} alt="Shared post" className="post-image" />
            ))}
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
                        const currentUserId = user?._id || user?.id;
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
      </section>
    </div>
  );
}

export default WallPage;
