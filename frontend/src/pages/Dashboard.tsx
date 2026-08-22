import { useState, useEffect } from 'react';
import { authApi, type ProfileResponse } from '../api/auth';

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

export default function Dashboard({ token, onLogout }: DashboardProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authApi.getProfile(token);
        setProfile(data);
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'red' }}>{error}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#4CAF50', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>MERP Student Assistant</h1>
        <button onClick={onLogout} style={{ padding: '0.5rem 1rem', backgroundColor: 'white', color: '#4CAF50', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
      </header>
      
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', padding: '2rem' }}>
          <h2 style={{ color: '#333', marginBottom: '1.5rem' }}>Welcome, {profile?.student?.StuFirstName || 'Student'}!</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <h3 style={{ color: '#4CAF50', marginBottom: '1rem' }}>Profile Information</h3>
              <p><strong>Email:</strong> {profile?.email}</p>
              <p><strong>Role:</strong> {profile?.role}</p>
              {profile?.student && (
                <>
                  <p><strong>Student ID:</strong> {profile.student.StudentID}</p>
                  <p><strong>Grade:</strong> {profile.student.StuGrade}</p>
                  <p><strong>Status:</strong> {profile.student.StuStatus}</p>
                </>
              )}
            </div>
            
            <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <h3 style={{ color: '#4CAF50', marginBottom: '1rem' }}>Personal Information</h3>
              {profile?.student && (
                <>
                  <p><strong>Name:</strong> {profile.student.StuFirstName} {profile.student.StuMiddleName} {profile.student.StuLastName}</p>
                  <p><strong>Phone:</strong> {profile.student.StuPhoneMobile || 'N/A'}</p>
                  <p><strong>Gender:</strong> {profile.student.StuGender || 'N/A'}</p>
                  <p><strong>Address:</strong> {profile.student.StuAddress || 'N/A'}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}