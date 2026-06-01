import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

function Layout() {
  const { logout, user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [latestNotificationKey, setLatestNotificationKey] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadNotificationStatus = async () => {
    try {
      const [messagesResponse, notificationsResponse] = await Promise.all([
        api.get('/messages/unread-count'),
        api.get('/notifications/status'),
      ]);

      setUnreadMessages(messagesResponse.data.count || 0);

      const count = notificationsResponse.data.count || 0;
      setUnreadNotifications(count);

      const latestNotification = notificationsResponse.data.latestNotification;
      const currentKey = latestNotification ? `${latestNotification.id}-${latestNotification.createdAt}` : null;

      if (user && latestNotificationKey !== null && currentKey !== latestNotificationKey) {
        await refreshMe();
      }

      setLatestNotificationKey(currentKey);
    } catch {
      setUnreadMessages(0);
      setUnreadNotifications(0);
    }
  };

  useEffect(() => {
    loadNotificationStatus();

    const intervalId = setInterval(loadNotificationStatus, 4000);
    const onFocus = () => loadNotificationStatus();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [location.pathname, latestNotificationKey, refreshMe]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">FriendBook</div>
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            aria-expanded={mobileNavOpen}
            aria-controls="main-navigation"
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span className={`hamburger ${mobileNavOpen ? 'open' : ''}`} aria-hidden="true">
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </span>
          </button>
        </div>
        <nav id="main-navigation" className={`nav-links ${mobileNavOpen ? 'nav-open' : ''}`}>
          <NavLink to="/home">Home</NavLink>
          <NavLink to="/friends">Friends</NavLink>
          <NavLink to="/messages" className="nav-item">
            Messages
            {unreadMessages > 0 && <span className="nav-badge">{unreadMessages}</span>}
          </NavLink>
          <NavLink to="/notifications" className="nav-item">
            Notifications
            {unreadNotifications > 0 && <span className="nav-badge">{unreadNotifications}</span>}
          </NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <div className="topbar-right">
          <span className="user-name">{user?.name}</span>
          <button type="button" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      <main className="content-wrap">
        <Outlet />
      </main>

      <footer className="footer">FriendBook © 2026 | Connect with friends</footer>
    </div>
  );
}

export default Layout;
