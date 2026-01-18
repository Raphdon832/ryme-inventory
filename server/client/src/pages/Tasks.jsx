import React, { useState, useEffect } from 'react';
import { FiPlus, FiCheck, FiTrash2, FiEdit2, FiCalendar, FiFlag, FiX, FiClock, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../api';
import useScrollLock from '../hooks/useScrollLock';
import './Tasks.css';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    status: 'pending'
  });

  // Lock scroll when task modal is open
  useScrollLock(showModal);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate?.() || null,
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setTasks(taskList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const taskData = {
        ...newTask,
        dueDate: newTask.dueDate ? Timestamp.fromDate(new Date(newTask.dueDate)) : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), {
          ...taskData,
          createdAt: editingTask.createdAt
        });
      } else {
        await addDoc(collection(db, 'tasks'), taskData);
      }

      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', status: 'pending' });
      setEditingTask(null);
      setShowModal(false);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const toggleTaskStatus = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateDoc(doc(db, 'tasks', task.id), { 
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      status: task.status
    });
    setShowModal(true);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status === 'pending';
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'high') return task.priority === 'high';
    return true;
  });

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const highPriorityCount = tasks.filter(t => t.priority === 'high' && t.status === 'pending').length;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>Manage your tasks and to-dos</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingTask(null); setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', status: 'pending' }); setShowModal(true); }}>
          <FiPlus /> Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="tasks-stats">
        <div className="stat-widget border-blue">
          <div className="stat-icon blue"><FiCheckSquare /></div>
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{tasks.length}</div>
        </div>
        <div className="stat-widget border-orange">
          <div className="stat-icon orange"><FiClock /></div>
          <div className="stat-label">Pending</div>
          <div className="stat-value">{pendingCount}</div>
        </div>
        <div className="stat-widget border-green">
          <div className="stat-icon green"><FiCheck /></div>
          <div className="stat-label">Completed</div>
          <div className="stat-value">{completedCount}</div>
        </div>
        <div className="stat-widget border-red">
          <div className="stat-icon red"><FiFlag /></div>
          <div className="stat-label">High Priority</div>
          <div className="stat-value">{highPriorityCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="tasks-filters">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
        <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
        <button className={`filter-btn ${filter === 'high' ? 'active' : ''}`} onClick={() => setFilter('high')}>High Priority</button>
      </div>

      {/* Tasks List */}
      <div className="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <FiCheckSquare size={48} />
            <h3>No tasks found</h3>
            <p>Create a new task to get started</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className={`task-card ${task.status === 'completed' ? 'completed' : ''}`}>
              <div className="task-checkbox" onClick={() => toggleTaskStatus(task)}>
                {task.status === 'completed' ? <FiCheckSquare size={20} /> : <FiSquare size={20} />}
              </div>
              <div className="task-content">
                <div className="task-header">
                  <h4 className={task.status === 'completed' ? 'strikethrough' : ''}>{task.title}</h4>
                  <div className="task-priority" style={{ backgroundColor: `${getPriorityColor(task.priority)}20`, color: getPriorityColor(task.priority) }}>
                    <FiFlag size={12} /> {task.priority}
                  </div>
                </div>
                {task.description && <p className="task-description">{task.description}</p>}
                {task.dueDate && (
                  <div className={`task-due ${isOverdue(task.dueDate) ? 'overdue' : ''}`}>
                    <FiCalendar size={12} />
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {isOverdue(task.dueDate) && ' (Overdue)'}
                  </div>
                )}
              </div>
              <div className="task-actions">
                <button className="icon-btn" onClick={() => openEditModal(task)}><FiEdit2 size={16} /></button>
                <button className="icon-btn danger" onClick={() => deleteTask(task.id)}><FiTrash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add a description..."
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingTask ? 'Update' : 'Create'} Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
