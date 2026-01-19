import React, { useState, useEffect } from 'react';
import { FiPlus, FiChevronLeft, FiChevronRight, FiX, FiClock, FiCalendar, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, Timestamp } from 'firebase/firestore';
import { db } from '../api';
import './Calendar.css';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    color: '#2563eb'
  });

  const colorOptions = [
    '#2563eb', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const q = query(collection(db, 'events'));
      const snapshot = await getDocs(q);
      const eventList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));
      setEvents(eventList);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.date) return;
    setSubmitting(true);

    try {
      const eventDate = new Date(newEvent.date);
      if (newEvent.time) {
        const [hours, minutes] = newEvent.time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes));
      }

      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        date: Timestamp.fromDate(eventDate),
        time: newEvent.time,
        color: newEvent.color,
        createdAt: Timestamp.now()
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
      } else {
        await addDoc(collection(db, 'events'), eventData);
      }

      setNewEvent({ title: '', description: '', date: '', time: '', color: '#2563eb' });
      setEditingEvent(null);
      setShowModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    setDeletingId(eventId);
    try {
      await deleteDoc(doc(db, 'events', eventId));
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    const eventDate = new Date(event.date);
    setNewEvent({
      title: event.title,
      description: event.description || '',
      date: eventDate.toISOString().split('T')[0],
      time: event.time || '',
      color: event.color || '#2563eb'
    });
    setShowModal(true);
  };

  const openNewEventModal = (date = null) => {
    setEditingEvent(null);
    setNewEvent({
      title: '',
      description: '',
      date: date ? date.toISOString().split('T')[0] : '',
      time: '',
      color: '#2563eb'
    });
    setShowModal(true);
  };

  // Calendar logic
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day &&
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Upcoming events
  const upcomingEvents = events
    .filter(event => new Date(event.date) >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div>
          <h1>Calendar</h1>
          <p>Manage your schedule and events</p>
        </div>
        <button className="btn-primary" onClick={() => openNewEventModal()}>
          <FiPlus /> Add Event
        </button>
      </div>

      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="calendar-card">
            <div className="calendar-header">
              <div className="calendar-nav">
                <button className="nav-btn" onClick={prevMonth}><FiChevronLeft /></button>
                <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <button className="nav-btn" onClick={nextMonth}><FiChevronRight /></button>
              </div>
              <button className="today-btn" onClick={goToToday}>Today</button>
            </div>

            <div className="calendar-grid">
              {dayNames.map(day => (
                <div key={day} className="calendar-day-header">{day}</div>
              ))}
              
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="calendar-day empty"></div>
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                
                return (
                  <div
                    key={day}
                    className={`calendar-day ${isToday(day) ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                    onClick={() => openNewEventModal(dayDate)}
                  >
                    <span className="day-number">{day}</span>
                    <div className="day-events">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className="day-event"
                          style={{ backgroundColor: event.color }}
                          onClick={(e) => { e.stopPropagation(); openEditModal(event); }}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="day-event-more">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="calendar-sidebar">
          <div className="upcoming-card">
            <h3><FiCalendar /> Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <p className="no-events">No upcoming events</p>
            ) : (
              <div className="upcoming-list">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="upcoming-event">
                    <div className="event-color" style={{ backgroundColor: event.color }}></div>
                    <div className="event-details">
                      <div className="event-title">{event.title}</div>
                      <div className="event-date">
                        <FiClock size={12} />
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {event.time && ` at ${event.time}`}
                      </div>
                    </div>
                    <div className="event-actions">
                      <button className="icon-btn-sm" onClick={() => openEditModal(event)}><FiEdit2 size={14} /></button>
                      <button className="icon-btn-sm danger" onClick={() => deleteEvent(event.id)}><FiTrash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEvent ? 'Edit Event' : 'New Event'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Enter event title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Add details..."
                  rows={2}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Color</label>
                <div className="color-options">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${newEvent.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewEvent({ ...newEvent, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? (
                    <><span className="btn-spinner"></span> {editingEvent ? 'Updating...' : 'Creating...'}</>
                  ) : (
                    <>{editingEvent ? 'Update' : 'Create'} Event</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
