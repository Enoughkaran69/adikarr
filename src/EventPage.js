import React, { useState, useEffect } from 'react';
import './EventPage.css';
import { auth, db } from './firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';

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
          setPartnerId(userData.partner || null);
        }
      } catch (error) {
        console.error('Error fetching partner ID:', error);
      }
    };

    fetchPartnerId();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const eventsRef = collection(db, 'events');

    let q;
    if (partnerId) {
      q = query(eventsRef, where('userId', 'in', [user.uid, partnerId]));
    } else {
      q = query(eventsRef, where('userId', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData = [];
      querySnapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() });
      });
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [user, partnerId]);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventText || !eventDate) {
      alert('Please enter both event description and date.');
      return;
    }
    try {
      await addDoc(collection(db, 'events'), {
        userId: user.uid,
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

  const handleDeleteEvent = async (id) => {
    try {
      await deleteDoc(doc(db, 'events', id));
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
            <button className="btn delete-btn" onClick={() => handleDeleteEvent(event.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EventPage;
