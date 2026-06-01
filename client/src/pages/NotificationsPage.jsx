import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { navigateToProfileId } from '../utils/profileNavigation';

function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    const response = await api.get('/notifications');
    setNotifications(response.data);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const openNotification = async (item) => {
    try {
      if (!item.isRead) {
        await api.post(`/notifications/${item._id}/read`);
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === item._id
            ? {
                ...n,
                isRead: true,
              }
            : n
        )
      );

      if (item.relatedPost?._id) {
        navigate(`/home?post=${item.relatedPost._id}`);
        return;
      }

      if (item.relatedUser?._id || item.relatedUser?.id) {
        navigateToProfileId(navigate, item.relatedUser._id || item.relatedUser?.id, user);
      }
    } catch {
      // Keep the card clickable even if read status update fails.
      if (item.relatedPost?._id) {
        navigate(`/home?post=${item.relatedPost._id}`);
      }
    }
  };

  return (
    <section className="card">
      <h2>Notifications</h2>
      {!notifications.length && <p>No notifications yet.</p>}
      {notifications.map((item) => (
        <article
          className={`notification notification-clickable ${item.isRead ? 'read' : ''}`}
          key={item._id}
          onClick={() => openNotification(item)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openNotification(item);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <p>{item.message}</p>
          <small>{new Date(item.createdAt).toLocaleString()}</small>
        </article>
      ))}
    </section>
  );
}

export default NotificationsPage;
