import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiMail, FiPhone, FiUser, FiX, FiUsers, FiUserCheck, FiUserX } from 'react-icons/fi';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../api';
import { useToast } from '../components/Toast';
import soundManager from '../utils/soundManager';
import './Team.css';

const Team = () => {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Staff',
    status: 'active'
  });

  const roles = ['Admin', 'Manager', 'Staff', 'Sales', 'Inventory'];

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const q = query(collection(db, 'team_members'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const memberList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setMembers(memberList);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMember.name.trim() || !newMember.email.trim()) return;
    setSubmitting(true);

    try {
      const memberData = {
        ...newMember,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (editingMember) {
        await updateDoc(doc(db, 'team_members', editingMember.id), {
          ...memberData,
          createdAt: editingMember.createdAt
        });
        toast.success(`Team member "${newMember.name}" updated successfully`);
      } else {
        await addDoc(collection(db, 'team_members'), memberData);
        toast.success(`Team member "${newMember.name}" added successfully`);
      }
      soundManager.playSuccess();

      setNewMember({ name: '', email: '', phone: '', role: 'Staff', status: 'active' });
      setEditingMember(null);
      setShowModal(false);
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error('Failed to save team member. Please try again.');
      soundManager.playError();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    setDeletingId(memberId);
    try {
      await deleteDoc(doc(db, 'team_members', memberId));
      toast.success('Team member removed successfully');
      soundManager.playSuccess();
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Failed to remove team member. Please try again.');
      soundManager.playError();
    } finally {
      setDeletingId(null);
    }
  };

  const toggleStatus = async (member) => {
    try {
      const newStatus = member.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'team_members', member.id), { 
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      fetchMembers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setNewMember({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      status: member.status
    });
    setShowModal(true);
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return '#EF4444';
      case 'Manager': return '#8B5CF6';
      case 'Sales': return '#10B981';
      case 'Inventory': return '#F59E0B';
      default: return '#2563eb';
    }
  };

  const activeCount = members.filter(m => m.status === 'active').length;
  const inactiveCount = members.filter(m => m.status === 'inactive').length;

  return (
    <div className="team-page">
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p>Manage your team members</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingMember(null); setNewMember({ name: '', email: '', phone: '', role: 'Staff', status: 'active' }); setShowModal(true); }}>
          <FiPlus /> Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="team-stats">
        <div className="stat-widget border-blue">
          <div className="stat-icon blue"><FiUsers /></div>
          <div className="stat-label">Total Members</div>
          <div className="stat-value">{members.length}</div>
        </div>
        <div className="stat-widget border-green">
          <div className="stat-icon green"><FiUserCheck /></div>
          <div className="stat-label">Active</div>
          <div className="stat-value">{activeCount}</div>
        </div>
        <div className="stat-widget border-orange">
          <div className="stat-icon orange"><FiUserX /></div>
          <div className="stat-label">Inactive</div>
          <div className="stat-value">{inactiveCount}</div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="team-grid">
        {members.length === 0 ? (
          <div className="empty-state">
            <FiUsers size={48} />
            <h3>No team members yet</h3>
            <p>Add your first team member to get started</p>
          </div>
        ) : (
          members.map(member => (
            <div key={member.id} className={`member-card ${member.status === 'inactive' ? 'inactive' : ''}`}>
              <div className="member-header">
                <div className="member-avatar" style={{ backgroundColor: getRoleColor(member.role) }}>
                  {getInitials(member.name)}
                </div>
                <div className="member-info">
                  <h4>{member.name}</h4>
                  <span className="member-role" style={{ color: getRoleColor(member.role) }}>{member.role}</span>
                </div>
                <div className={`status-badge ${member.status}`}>
                  {member.status}
                </div>
              </div>
              
              <div className="member-details">
                <div className="detail-item">
                  <FiMail size={14} />
                  <span>{member.email}</span>
                </div>
                {member.phone && (
                  <div className="detail-item">
                    <FiPhone size={14} />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              <div className="member-actions">
                <button className="action-btn" onClick={() => toggleStatus(member)}>
                  {member.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button className="icon-btn" onClick={() => openEditModal(member)}><FiEdit2 size={16} /></button>
                <button className="icon-btn danger" onClick={() => deleteMember(member.id)}><FiTrash2 size={16} /></button>
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
              <h2>{editingMember ? 'Edit Member' : 'Add Team Member'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}>
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={newMember.status} onChange={e => setNewMember({ ...newMember, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? (
                    <><span className="btn-spinner"></span> {editingMember ? 'Updating...' : 'Adding...'}</>
                  ) : (
                    <>{editingMember ? 'Update' : 'Add'} Member</>
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

export default Team;
