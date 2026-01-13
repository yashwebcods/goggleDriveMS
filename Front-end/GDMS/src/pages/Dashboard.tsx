import MainSection from '../components/dashboard/MainSection';
import Sidebar from '../components/dashboard/Sidebar';
import TopHeader from '../components/dashboard/TopHeader';
import type { FileRow } from '../components/dashboard/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/user.services';
const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [, setError] = useState('');
  const [, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem('token') || '';
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      setIsLoading(true);
      setError('');

      const result = await userService.profile(token);
      if (!result?.success) {
        if (result?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login', { replace: true });
          return;
        }

        setError(result?.message || `Failed to load profile (HTTP ${result?.status ?? 'unknown'})`);
        setIsLoading(false);
        return;
      }

      setProfile(result?.data);
      setIsLoading(false);
    };

    run();
  }, [navigate]);

  const quickAccess = [
    { title: 'My projects', accent: 'bg-blue-500' },
    { title: 'Moodboards', accent: 'bg-blue-500' },
    { title: 'Inspirations', accent: 'bg-blue-500' }
  ];

  const suggested = [
    { title: 'Solving Product Design\nExercises: Questions…', badge: 'bg-yellow-500' },
    { title: 'Google Drive\nimprovements', badge: 'bg-blue-500' },
    { title: 'Review Checklist\nTemplate', badge: 'bg-green-500' },
    { title: 'How to create a case\nstudy', badge: 'bg-orange-300' }
  ];

  const files: FileRow[] = [
    { name: 'Hot Startups 2019 - Report', type: 'doc', location: 'My Drive', owner: 'me', modified: 'Apr 9, 2019' },
    { name: 'Burning Minds - agenda', type: 'doc', location: 'My Drive', owner: 'me', modified: 'Apr 9, 2019', selected: true },
    { name: 'Onboarding sheet', type: 'sheet', location: 'My Drive', owner: 'me', modified: 'Apr 9, 2019' },
    { name: 'Diagrams', type: 'sheet', location: 'My Drive', owner: 'me', modified: 'Apr 9, 2019' },
    { name: 'Business opportunities', type: 'doc', location: 'My Drive', owner: 'me', modified: 'Apr 9, 2019' },
    { name: 'Q2 - our roadmap', type: 'doc', location: 'My Drive', owner: 'me', modified: 'Apr 9, 2019' },
    { name: 'Onboarding sheet v.2', type: 'sheet', location: 'My Drive', owner: 'me', modified: 'Apr 9, 2019' },
    { name: 'The Best Startups', type: 'doc', location: 'My Drive', owner: 'me', modified: 'Apr 9, 2019' }
  ];
  return (
    <div className="h-screen bg-[#F6F8FB] text-gray-900 flex flex-col overflow-hidden">
      <TopHeader
        user={profile}
        onLogout={() => {
          navigate('/login', { replace: true });
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainSection quickAccess={quickAccess} suggested={suggested} files={files} />
      </div>
    </div>
  );
};
export default Dashboard;
