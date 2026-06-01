import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AvatarImage from '../components/AvatarImage';

function FriendsPage() {
  const { refreshMe, user } = useAuth();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [unfriendingId, setUnfriendingId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [requestActionId, setRequestActionId] = useState('');

  const searchUsers = async () => {
    if (!searchText.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setHasSearched(true);
    const response = await api.get(`/users/search?q=${encodeURIComponent(searchText)}`);
    setResults(response.data);
  };

  const loadRequests = async () => {
    const response = await api.get('/friends/requests');
    setRequests(response.data);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const sendRequest = async (userId) => {
    try {
      await api.post(`/friends/request/${userId}`);
      setStatus('Friend request sent');
      await searchUsers();
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to send request');
    }
  };

  const acceptRequest = async (requestId) => {
    if (requestActionId) return;

    try {
      setRequestActionId(requestId);
      await api.post(`/friends/requests/${requestId}/accept`);
      await loadRequests();
      await refreshMe();
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to accept request');
    } finally {
      setRequestActionId('');
    }
  };

  const rejectRequest = async (requestId) => {
    if (requestActionId) return;

    try {
      setRequestActionId(requestId);
      await api.post(`/friends/requests/${requestId}/reject`);
      await loadRequests();
      setStatus('Friend request rejected');
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setRequestActionId('');
    }
  };

  const unfriend = async (friendId, friendName) => {
    if (unfriendingId) return;

    const confirmed = window.confirm(`Unfriend ${friendName || 'this user'}?`);
    if (!confirmed) return;

    try {
      setUnfriendingId(friendId);
      await api.delete(`/friends/${friendId}`);
      await refreshMe();
      setStatus('Unfriended successfully');
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to unfriend user');
    } finally {
      setUnfriendingId('');
    }
  };

  const friends = Array.isArray(user?.friends) ? user.friends : [];

  return (
    <>
      <div className="grid-page">
        <section className="card">
          <h2>Find Friends</h2>
          <div className="search-row">
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <button type="button" onClick={searchUsers}>
              Search
            </button>
          </div>
          {status && <p>{status}</p>}
          <div className="list">
            {results.map((item) => {
              const itemId = item._id || item.id;
              return (
                <div className="list-item search-result-item" key={itemId}>
                  <button
                    type="button"
                    className="search-result-main search-result-link"
                    onClick={() => navigate(`/profile/${itemId}`)}
                  >
                    <AvatarImage src={item.avatar} alt={item.name} className="friend-thumb" />
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.email}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={item.isFriend || item.hasPendingRequest}
                    onClick={() => sendRequest(itemId)}
                  >
                    {item.isFriend ? 'Friend' : item.hasPendingRequest ? 'Pending' : 'Add Friend'}
                  </button>
                </div>
              );
            })}
            {hasSearched && !results.length && <p className="search-empty-msg">No users found for "{searchText.trim()}".</p>}
          </div>
        </section>

        <section className="card">
          <h2>Friend Requests</h2>
          {!requests.length && <p>No incoming requests.</p>}
          {requests.map((request) => {
            const senderId = request.sender?._id || request.sender?.id;
            const requestId = request.id || request._id;
            return (
              <div className="list-item" key={requestId}>
                <button
                  type="button"
                  className="search-result-main search-result-link"
                  onClick={() => navigate(`/profile/${senderId}`)}
                >
                  <AvatarImage
                    src={request.sender?.avatar}
                    alt={request.sender?.name || 'User'}
                    className="friend-thumb"
                  />
                  <div>
                    <strong>{request.sender?.name}</strong>
                    <p>{request.sender?.email}</p>
                  </div>
                </button>
                <div className="request-action-row">
                  <button
                    type="button"
                    onClick={() => acceptRequest(requestId)}
                    disabled={requestActionId === requestId}
                  >
                    {requestActionId === requestId ? '...' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    className="btn-muted"
                    onClick={() => rejectRequest(requestId)}
                    disabled={requestActionId === requestId}
                  >
                    {requestActionId === requestId ? '...' : 'Reject'}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <section className="card friends-list-full">
        <h2 className="friends-heading">
          My Friends <span className="count-badge">{friends.length}</span>
        </h2>
        {!friends.length && <p>You do not have friends yet. Search and send requests above.</p>}
        <div className="friend-grid">
          {friends.map((friend) => {
            const friendId = friend._id || friend.id;
            return (
              <div className="friend-card-wrap" key={friendId}>
                <button
                  type="button"
                  className="friend-card"
                  onClick={() => navigate(`/profile/${friendId}`)}
                >
                  <AvatarImage src={friend.avatar} alt={friend.name} className="friend-thumb" />
                  <span>{friend.name}</span>
                </button>
                <div className="friend-action-row">
                  <button
                    type="button"
                    className="friend-message-btn friend-action-btn"
                    onClick={() => navigate(`/messages?friend=${friendId}`)}
                  >
                    Message
                  </button>
                  <button
                    type="button"
                    className="btn-danger friend-action-btn"
                    disabled={unfriendingId === friendId}
                    onClick={() => unfriend(friendId, friend.name)}
                  >
                    {unfriendingId === friendId ? '...' : 'Unfriend'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

export default FriendsPage;
