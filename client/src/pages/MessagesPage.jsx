import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AvatarImage from '../components/AvatarImage';

function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [friends, setFriends] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const threadRef = useRef(null);

  const selectedFriend = useMemo(
    () => friends.find((friend) => (friend._id || friend.id) === selectedFriendId),
    [friends, selectedFriendId]
  );

  const loadFriends = useCallback(async () => {
    const response = await api.get('/messages/friends');
    setFriends(response.data);

    const queryFriend = searchParams.get('friend');
    if (queryFriend && response.data.some((f) => (f._id || f.id) === queryFriend)) {
      setSelectedFriendId(queryFriend);
      return;
    }

    if (!selectedFriendId && response.data.length) {
      setSelectedFriendId(response.data[0]._id || response.data[0].id);
    }
  }, [searchParams, selectedFriendId]);

  const loadMessages = useCallback(async (friendId) => {
    if (!friendId) {
      setMessages([]);
      return;
    }

    const response = await api.get(`/messages/${friendId}`);
    setMessages(response.data);
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    loadMessages(selectedFriendId);
  }, [selectedFriendId, loadMessages]);

  useEffect(() => {
    if (!selectedFriendId) return undefined;

    const intervalId = setInterval(() => {
      loadMessages(selectedFriendId);
    }, 2500);

    const onFocus = () => loadMessages(selectedFriendId);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [selectedFriendId, loadMessages]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    setStatus('');

    if (!selectedFriendId) {
      setStatus('Select a friend first');
      return;
    }

    try {
      await api.post(`/messages/${selectedFriendId}`, { text });
      setText('');
      await loadMessages(selectedFriendId);
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to send message');
    }
  };

  return (
    <section className="card messages-layout">
      <aside className="messages-friends">
        <h2>Messages</h2>
        {!friends.length && <p>No friends yet.</p>}
        {friends.map((friend) => {
          const friendId = friend._id || friend.id;
          return (
            <button
              type="button"
              key={friendId}
              className={`message-friend-item ${selectedFriendId === friendId ? 'active' : ''}`}
              onClick={() => setSelectedFriendId(friendId)}
            >
              <AvatarImage src={friend.avatar} alt={friend.name} className="friend-thumb" />
              <span>{friend.name}</span>
            </button>
          );
        })}
      </aside>

      <div className="messages-chat">
        <h3>{selectedFriend ? `Chat with ${selectedFriend.name}` : 'Select a friend to start chat'}</h3>
        <div className="message-thread" ref={threadRef}>
          {messages.map((message) => {
            const senderId = message.sender?._id || message.sender?.id || message.sender;
            const mine = senderId === (user?._id || user?.id);
            const sender = typeof message.sender === 'object' ? message.sender : null;
            const avatarUrl = mine ? user?.avatar || sender?.avatar : sender?.avatar;
            const avatarName = mine ? user?.name || 'You' : sender?.name || selectedFriend?.name || 'Friend';

            return (
              <div key={message._id} className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
                {!mine &&
                  <AvatarImage src={avatarUrl} alt={avatarName} className="message-avatar" />}

                <div className="message-bubble">
                  <p>{message.text}</p>
                  <small>{new Date(message.createdAt).toLocaleString()}</small>
                </div>

                {mine &&
                  <AvatarImage src={avatarUrl} alt={avatarName} className="message-avatar" />}
              </div>
            );
          })}
          {!messages.length && <p className="muted">No messages yet.</p>}
        </div>

        <form className="message-form" onSubmit={sendMessage}>
          <input
            type="text"
            value={text}
            placeholder="Type a message"
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
        {status && <p className="error">{status}</p>}
      </div>
    </section>
  );
}

export default MessagesPage;
