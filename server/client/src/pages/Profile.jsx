import React, { useState } from 'react';
import {
  ProfileIcon,
  MailIcon,
  PhoneIcon,
  BriefcaseIcon,
  EditIcon,
  SaveIcon,
  CloseIcon
} from '../components/CustomIcons';
import { usePageState } from '../hooks/usePageState';

const Profile = () => {
  // Persist scroll position
  usePageState('profile', {}, { persistScroll: true, scrollContainerSelector: '.main-content' });

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@rymeinteriors.com',
    phone: '+234 801 234 5678',
    role: 'Administrator',
    department: 'Management',
    joinDate: 'January 2024'
  });
  const [editedProfile, setEditedProfile] = useState(profile);

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p className="page-subtitle">Manage your account information</p>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EditIcon size={16} /> Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCancel} className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloseIcon size={16} /> Cancel
            </button>
            <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SaveIcon size={16} /> Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="profile-grid" style={{ marginTop: '24px' }}>
        {/* Profile Card */}
        <div className="card profile-sidebar-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: '#0A0A0A',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 700,
            margin: '0 auto 16px'
          }}>
            {profile.name.split(' ').map(n => n[0]).join('')}
          </div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>{profile.name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{profile.role}</p>
          <div style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: 'var(--info-bg)',
            color: 'var(--info-text)',
            borderRadius: '50px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            {profile.department}
          </div>
          <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
            Member since {profile.joinDate}
          </p>
        </div>

        {/* Profile Details */}
        <div className="card profile-details-card">
          <h3 style={{ marginBottom: '24px' }}>Account Information</h3>
          
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <ProfileIcon size={14} /> Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.name}
                  onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                />
              ) : (
                <p style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{profile.name}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <MailIcon size={14} /> Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedProfile.email}
                  onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                />
              ) : (
                <p style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{profile.email}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <PhoneIcon size={14} /> Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedProfile.phone}
                  onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                />
              ) : (
                <p style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{profile.phone}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <BriefcaseIcon size={14} /> Role
              </label>
              <p style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{profile.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
