import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import {
  collection, addDoc, onSnapshot, deleteDoc, doc, query,
  orderBy, serverTimestamp, getDoc, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import './ChatPage.css'; // Import the CSS
import {
  IconButton, TextField, Avatar, Tooltip, CircularProgress, Box, Typography
} from '@mui/material'; // Import Material UI components
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import ReplyIcon from '@mui/icons-material/Reply';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

function ChatPage({ onBack, partnerId: initialPartnerId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [partnerId, setPartnerId] = useState(initialPartnerId);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null); // { id: messageId, text: messageText }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null); // Ref for the input field

  // Effect to handle auth changes
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (!user) {
        // Handle user logging out if necessary (e.g., redirect or clear state)
        setMessages([]);
        setPartnerInfo(null);
        setPartnerId(null);
      } else if (!partnerId) {
        // If user is logged in but partnerId isn't set (e.g., direct navigation)
        // Try to fetch partnerId from user doc
        const fetchPartner = async () => {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().partner) {
            setPartnerId(userDocSnap.data().partner);
          } else {
            // Handle case where partner is not found - maybe show an error or redirect
            console.error("Partner ID not found for current user.");
            setPartnerLoading(false);
          }
        };
        fetchPartner();
      }
    });
    return () => unsubscribeAuth();
  }, [partnerId]); // Re-check if partnerId prop changes

  // Effect to fetch partner info
  useEffect(() => {
    if (!partnerId) {
        setPartnerLoading(false);
        setPartnerInfo(null);
        return;
    }

    setPartnerLoading(true);
    const partnerDocRef = doc(db, 'users', partnerId);
    const unsubscribePartner = onSnapshot(partnerDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setPartnerInfo({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.error("Partner document not found for ID:", partnerId);
        setPartnerInfo(null); // Partner not found
      }
      setPartnerLoading(false);
    }, (error) => {
      console.error("Error fetching partner info:", error);
      setPartnerInfo(null);
      setPartnerLoading(false);
    });

    return () => unsubscribePartner();
  }, [partnerId]);

  // Effect to fetch messages
  useEffect(() => {
    if (!currentUser || !partnerId) {
      setMessages([]); // Clear messages if user or partner is missing
      return;
    }

    const docId = [currentUser.uid, partnerId].sort().join('_');
    const messagesCollectionRef = collection(db, 'chats', docId, 'messages');
    const q = query(messagesCollectionRef, orderBy('createdAt', 'asc')); // Fetch in ascending order

    const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
    }, (error) => {
      console.error("Error fetching messages:", error);
      // Optionally set an error state to display to the user
    });

    return () => unsubscribeMessages();
  }, [currentUser, partnerId]);

  // Effect to scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // Scroll whenever messages update

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !partnerId) return;

    const docId = [currentUser.uid, partnerId].sort().join('_');
    const messagesCollectionRef = collection(db, 'chats', docId, 'messages');

    try {
      await addDoc(messagesCollectionRef, {
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User', // Fallback name
        senderPhotoURL: currentUser.photoURL || null,
        replyTo: replyingTo, // Add reply context if present
      });
      setNewMessage('');
      setReplyingTo(null); // Clear reply state after sending
      // Optionally clear input focus: inputRef.current?.blur();
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally show an error message to the user
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!currentUser || !partnerId) return;

    // Optional: Confirmation dialog
    // if (!window.confirm("Are you sure you want to delete this message?")) {
    //   return;
    // }

    const docId = [currentUser.uid, partnerId].sort().join('_');
    const messageDocRef = doc(db, 'chats', docId, 'messages', messageId);

    try {
      await deleteDoc(messageDocRef);
    } catch (error) {
      console.error("Error deleting message:", error);
      // Optionally show an error message
    }
  };

  const handleReply = (message) => {
    setReplyingTo({ id: message.id, text: message.text, senderName: message.senderName });
    inputRef.current?.focus(); // Focus the input field when reply is clicked
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Handle Enter key press in TextField
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent newline
      handleSendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Truncate reply text for display
  const truncateText = (text, length = 50) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <IconButton onClick={onBack} aria-label="Back" className="back-button-chat">
          <ArrowBackIcon />
        </IconButton>
        {partnerLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : partnerInfo ? (
          <div className="partner-info-chat">
            <Avatar
              src={partnerInfo.photoURL || undefined} // Use undefined if no photoURL
              alt={partnerInfo.displayName || 'Partner'}
              className="partner-avatar-chat"
            />
            <Typography variant="h6" className="partner-name-chat">
              {partnerInfo.displayName || 'Partner'}
            </Typography>
          </div>
        ) : (
          <Typography variant="h6" className="partner-name-chat">Chat</Typography> // Fallback title
        )}
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.map((msg) => {
          const isSent = msg.senderId === currentUser?.uid;
          return (
            <div
              key={msg.id}
              className={`chat-message ${isSent ? 'sent' : 'received'}`}
            >
              {/* Display reply context if it exists */}
              {msg.replyTo && (
                <div className="reply-preview">
                  <span className="reply-label">Replying to {msg.replyTo.senderName || 'User'}:</span>
                  <span className="reply-text">{truncateText(msg.replyTo.text)}</span>
                </div>
              )}
              <div className="message-content">
                <span className="message-text">{msg.text}</span>
                <div className="message-info">
                  <span className="message-time">{formatTime(msg.createdAt)}</span>
                  <div className="message-actions">
                    <Tooltip title="Reply">
                      <IconButton size="small" onClick={() => handleReply(msg)} className="message-action-btn">
                        <ReplyIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    {/* Only allow sender to delete */}
                    {isSent && (
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteMessage(msg.id)} className="message-action-btn delete">
                          <DeleteIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        {/* Replying To Banner */}
        {replyingTo && (
          <div className="replying-to-banner">
            <div className="replying-details">
                <span className="replying-label">Replying to {replyingTo.senderName || 'User'}:</span>
                <span className="replying-text">{truncateText(replyingTo.text)}</span>
            </div>
            <Tooltip title="Cancel Reply">
              <IconButton onClick={cancelReply} size="small" className="cancel-reply-btn">
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </div>
        )}

        {/* Input Field and Send Button */}
        <div className="chat-input-wrapper">
          <TextField
            inputRef={inputRef} // Assign ref
            className="chat-input"
            variant="outlined"
            multiline
            maxRows={4} // Limit the height increase
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown} // Handle Enter key
            InputProps={{
              sx: { // Use sx prop for direct styling overrides
                borderRadius: '25px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.6)',
                },
                '& textarea::placeholder': {
                  color: 'rgba(255, 255, 255, 0.6)',
                  opacity: 1, // Ensure placeholder is visible
                },
              },
            }}
          />
          <Tooltip title="Send Message">
            {/* Disable button if message is empty */}
            <span>
              <IconButton
                className="send-button-chat"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                aria-label="Send message"
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
