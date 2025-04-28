import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase';
import { doc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'; // Removed getDoc

const SharedDataContext = createContext();

export const SharedDataProvider = ({ children }) => {
  const [sharedSong, setSharedSong] = useState(null);
  const [lastMessages, setLastMessages] = useState([]);
  const [partnerId, setPartnerId] = useState(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser); // Keep track of user
  const [isLoadingPartnerData, setIsLoadingPartnerData] = useState(true);

  // Effect 1: Listen to Auth State Changes
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      console.log('SharedDataContext: Auth state changed, user:', user ? user.uid : 'null');
      setCurrentUser(user);
      if (!user) {
        // Clear everything if user logs out
        console.log('SharedDataContext: User logged out, clearing state.');
        setPartnerId(null);
        setSharedSong(null);
        setLastMessages([]);
      }
    });
    // Cleanup auth listener on component unmount
    return () => {
        console.log('SharedDataContext: Cleaning up auth listener.');
        unsubscribeAuth();
    }
  }, []);

  // Effect 2: Listen to User Document for Partner Changes (runs when currentUser changes)
  useEffect(() => {
    let unsubscribeUserDoc = () => {}; // Initialize cleanup function

    if (!currentUser) {
      console.log('SharedDataContext: No current user, skipping user doc listener.');
      // Ensure partnerId is cleared if user logs out or isn't available initially
      if (partnerId !== null) {
          console.log('SharedDataContext: Clearing partnerId because currentUser is null.');
          setPartnerId(null);
      }
      return; // Stop if no user
    }

    console.log('SharedDataContext: Setting up listener for user doc:', currentUser.uid);
    const userDocRef = doc(db, 'users', currentUser.uid);

    unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
      let currentPartnerId = null; // Default to null
      if (docSnap.exists()) {
        const userData = docSnap.data();
        currentPartnerId = userData.partner || null; // Get partner ID or null
        console.log('SharedDataContext: User doc snapshot received. Raw partner data:', userData.partner);
      } else {
        console.log('SharedDataContext: User document does not exist for uid:', currentUser.uid);
      }

      // Update partnerId state only if it has actually changed
      setIsLoadingPartnerData(true);
      setPartnerId(prevPartnerId => {
        if (prevPartnerId !== currentPartnerId) {
          console.log(`SharedDataContext: PartnerId changing from ${prevPartnerId} to ${currentPartnerId}`);
          return currentPartnerId;
        }
        // console.log(`SharedDataContext: PartnerId remains ${prevPartnerId}`);
        return prevPartnerId; // No change, return previous state
      });
      setIsLoadingPartnerData(false);

    }, (error) => {
      console.error('SharedDataContext: Error listening to user document:', error);
      setPartnerId(null); // Clear partnerId on error
    });

    // Cleanup user doc listener when currentUser changes or component unmounts
    return () => {
      console.log('SharedDataContext: Cleaning up user doc listener for:', currentUser?.uid);
      unsubscribeUserDoc();
    };
  }, [currentUser]); // Rerun when user logs in/out

  // Effect 3: Listen to Shared Song and Messages (runs when partnerId or currentUser changes)
  useEffect(() => {
    let unsubscribeSharedSong = () => {};
    let unsubscribeMessages = () => {};

    // Only proceed if we have both a user and a partner
    if (!currentUser || !partnerId) {
      console.log(`SharedDataContext: Skipping shared data listeners. Reason: ${!currentUser ? 'No currentUser' : ''}${!currentUser && !partnerId ? ' and ' : ''}${!partnerId ? 'No partnerId' : ''}. Clearing shared data.`);
      // Clear data if no partner or user
      if (sharedSong !== null) setSharedSong(null);
      if (lastMessages.length > 0) setLastMessages([]);
      return; // Stop here
    }

    console.log(`SharedDataContext: Valid currentUser (${currentUser.uid}) and partnerId (${partnerId}). Setting up shared data listeners.`);
    // Create the consistent document/collection ID
    const docId = [currentUser.uid, partnerId].sort().join('_');
    console.log('SharedDataContext: Using docId for listeners:', docId);

    // Listener for shared song
    const sharedSongDocRef = doc(db, 'sharedSongs', docId);
    unsubscribeSharedSong = onSnapshot(sharedSongDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('SharedDataContext: sharedSong data received:', data);
        setSharedSong(data);
      } else {
        console.log('SharedDataContext: sharedSong doc does not exist or is empty for docId:', docId);
        setSharedSong(null);
      }
    }, (error) => {
      console.error('SharedDataContext: Error listening to sharedSong:', error);
      setSharedSong(null); // Clear song on error
    });

    // Listener for last messages
    const messagesCollectionRef = collection(db, 'chats', docId, 'messages');
    const messagesQuery = query(messagesCollectionRef, orderBy('createdAt', 'desc'), limit(2));
    unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      // Check if the new messages are different from the current ones before updating state
      setLastMessages(prevMsgs => {
          const newMsgsReversed = msgs.reverse(); // Reverse to show latest last
          // Simple comparison (can be improved for deep equality if needed)
          if (JSON.stringify(prevMsgs) !== JSON.stringify(newMsgsReversed)) {
              console.log('SharedDataContext: lastMessages data received/updated:', newMsgsReversed);
              return newMsgsReversed;
          }
          return prevMsgs; // No change
      });
    }, (error) => {
      console.error('SharedDataContext: Error listening to messages:', error);
      setLastMessages([]); // Clear messages on error
    });

    // Cleanup listeners when partnerId/currentUser changes or component unmounts
    return () => {
      console.log('SharedDataContext: Cleaning up shared data listeners for docId:', docId);
      unsubscribeSharedSong();
      unsubscribeMessages();
    };
  }, [partnerId, currentUser]); // Re-run effect if partnerId or currentUser changes

  // Optional: Log state changes in the context (can be removed in production)
  // useEffect(() => {
  //   console.log('SharedDataContext state updated - sharedSong:', sharedSong);
  // }, [sharedSong]);

  // useEffect(() => {
  //   console.log('SharedDataContext state updated - lastMessages:', lastMessages);
  // }, [lastMessages]);


  return (
    <SharedDataContext.Provider value={{ sharedSong, lastMessages, isLoadingPartnerData }}>
      {children}
    </SharedDataContext.Provider>
  );
};

export const useSharedData = () => useContext(SharedDataContext);
