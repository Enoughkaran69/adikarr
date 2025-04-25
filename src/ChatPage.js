import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import './ChatPage.css';

function ChatPage({ user, partner, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);

  // Generate a consistent chat collection ID based on user IDs sorted
  const chatId = [user.uid, partner.uid].sort().join('_');
  const messagesCollectionRef = collection(db, 'chats', chatId, 'messages');

  useEffect(() => {
    // Query last 50 messages ordered by timestamp ascending
    const q = query(messagesCollectionRef, orderBy('createdAt', 'asc'), limit(50));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [chatId]);

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Function to send a new message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await addDoc(messagesCollectionRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
        replyTo: replyTo ? replyTo.id : null,
      });
      setNewMessage('');
      setReplyTo(null);
      // After adding, enforce max 50 messages
      await enforceMessageLimit();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Function to enforce max 50 messages by deleting oldest if more than 50
  const enforceMessageLimit = async () => {
    const q = query(messagesCollectionRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.size > 50) {
      const batch = writeBatch(db);
      const docsToDelete = snapshot.docs.slice(0, snapshot.size - 50);
      docsToDelete.forEach((docSnap) => {
        batch.delete(doc(db, 'chats', chatId, 'messages', docSnap.id));
      });
      await batch.commit();
    }
  };

  // Handle enter key press in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render reply preview
  const renderReplyPreview = (replyId) => {
    if (!replyId) return null;
    const repliedMsg = messages.find((msg) => msg.id === replyId);
    if (!repliedMsg) return null;
    return (
      <div className="reply-preview">
        <span className="reply-label">Replying to:</span>
        <div className="reply-text">{repliedMsg.text}</div>
      </div>
    );
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-button" onClick={onBack} aria-label="Back to Home">
          ← Back
        </button>
        <h2>Chat with {partner.displayName || partner.name || 'Partner'}</h2>
      </div>
      <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((msg) => {
          const isSent = msg.senderId === user.uid; // my message on right, other on left
          return (
            <div
              key={msg.id}
              className={`chat-message ${isSent ? 'sent' : 'received'} message-appear`}
            >
              {renderReplyPreview(msg.replyTo)}
              <div className="message-text">{msg.text}</div>
              <div className="message-info">
                <span className="message-time">{formatTimestamp(msg.createdAt)}</span>
                <button
                  className="message-reply-btn"
                  onClick={() => setReplyTo(msg)}
                  aria-label="Reply to message"
                  title="Reply"
                >
                  ↩
                </button>
                {isSent && (
                  <button
                    className="message-delete-btn"
                    onClick={() => handleDeleteMessage(msg.id)}
                    aria-label="Delete message"
                    title="Delete"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {replyTo && (
        <div className="replying-to-banner">
          Replying to: <span className="replying-text">{replyTo.text}</span>
          <button className="cancel-reply-btn" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
            ✕
          </button>
        </div>
      )}
      <div className="chat-input-container">
        <textarea
          className="chat-input"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          rows={2}
          aria-label="Message input"
        />
        <button className="send-button" onClick={sendMessage} aria-label="Send message">
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatPage;
