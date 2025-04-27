import React, { useState, useEffect } from 'react';
import './EventPage.css';
import { auth, db } from './firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';

function EventPage({ onBack }) {
  const user = auth.currentUser;
  const [partnerId, setPartnerId] = useState(null);
  const [eventText, setEventText] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Fetch partner ID
    const fetchPartnerId = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.partner && typeof userData.partner === 'string' && userData.partner.trim() !== '') {
            setPartnerId(userData.partner);
          } else {
            setPartnerId(null);
          }
        }
      } catch (error) {
        console.error('Error fetching partner ID:', error);
      }
    };

    fetchPartnerId();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let unsubscribeUser = () => {};
    let unsubscribePartner = () => {};

    // Store events from both user and partner
    let userEvents = [];
    let partnerEvents = [];

    // Fetch events from user's subcollection
    const userEventsRef = collection(db, 'users', user.uid, 'events');
    const qUser = query(userEventsRef);
    unsubscribeUser = onSnapshot(qUser, (querySnapshot) => {
      userEvents = [];
      querySnapshot.forEach((doc) => {
        userEvents.push({ id: doc.id, userId: user.uid, ...doc.data() });
      });
      setEvents([...userEvents, ...partnerEvents]);
    });

    // Fetch events from partner's subcollection if partnerId exists
    if (partnerId) {
      const partnerEventsRef = collection(db, 'users', partnerId, 'events');
      const qPartner = query(partnerEventsRef);
      unsubscribePartner = onSnapshot(qPartner, (querySnapshot) => {
        partnerEvents = [];
        querySnapshot.forEach((doc) => {
          partnerEvents.push({ id: doc.id, userId: partnerId, ...doc.data() });
        });
        setEvents([...userEvents, ...partnerEvents]);
      });
    } else {
      // If no partner, just set user events
      setEvents(userEvents);
    }

    return () => {
      unsubscribeUser();
      unsubscribePartner();
    };
  }, [user, partnerId]);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventText || !eventDate) {
      alert('Please enter both event description and date.');
      return;
    }
    try {
      const userEventsRef = collection(db, 'users', user.uid, 'events');
      await addDoc(userEventsRef, {
        text: eventText,
        date: eventDate,
      });
      setEventText('');
      setEventDate('');
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
    }
  };

  const handleDeleteEvent = async (id, ownerId) => {
    try {
      const eventDocRef = doc(db, 'users', ownerId, 'events', id);
      await deleteDoc(eventDocRef);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  return (
    <div className="EventPage">
      <div className="heading">
        <div>
          <div className="heading-title">Memorable Events</div>
          <div className="sub-title">Add and cherish your special moments</div>
        </div>
        <button className="btn" onClick={onBack}>Back</button>
      </div>

      <form className="event-form" onSubmit={handleAddEvent}>
        <input
          type="text"
          placeholder="Event description"
          value={eventText}
          onChange={(e) => setEventText(e.target.value)}
          maxLength={100}
        />
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
        <button type="submit" className="btn">Add Event</button>
      </form>

      <div className="event-list">
        {events.length === 0 && <p>No events added yet.</p>}
        {events.map((event) => (
          <div key={event.id} className="event-item">
            <div className="event-text">{event.text}</div>
            <div className="event-date">{new Date(event.date).toLocaleDateString()}</div>
            <div className="event-owner">
              {event.userId === user.uid ? 'You' : 'Partner'}
            </div>
            <button className="btn delete-btn" onClick={() => handleDeleteEvent(event.id, event.userId)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EventPage;
