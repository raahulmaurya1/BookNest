import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dashboardAPI } from '../api/dashboard';
import ActivityFeed from '../components/ActivityFeed';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { useActivitySubscription } from '../websocket/useSocket';
import { 
  BookOpen, 
  BookText, 
  CheckSquare, 
  Star, 
  ArrowUpRight, 
  Users, 
  FolderHeart, 
  BarChart4,
  ChevronRight
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard metrics');
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useActivitySubscription(() => {
    fetchStats();
  });

  if (loading) {
    return <Loading message="Loading reader dashboard..." fullPage={true} />;
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-10">
        <ErrorMessage error={error} onRetry={fetchStats} />
      </div>
    );
  }

  const StatCard = ({ title, value, Icon, isAccent = false, to, clickable = true }) => {
    const isClickable = clickable && to;
    return (
      <div 
        onClick={isClickable ? () => navigate(to) : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => (e.key === 'Enter' || e.key === ' ') && navigate(to) : undefined}
        className={`group border border-hairline bg-white rounded-lg shadow-sm p-5 flex flex-col justify-between h-32 transition-all duration-150 ${
          isClickable ? 'cursor-pointer hover:shadow-md hover:border-ink-muted/40' : ''
        }`}
      >
        <div className="flex justify-between items-start">
          <Icon className={`w-5 h-5 transition-colors ${isAccent ? 'text-accent' : 'text-ink-muted group-hover:text-accent'}`} strokeWidth={1.5} />
          {isClickable && (
            <ChevronRight
              className="w-4 h-4 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity"
              strokeWidth={1.5}
            />
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-0.5">{title}</p>
          <p className={`text-2xl font-serif font-semibold ${isAccent ? 'text-accent' : 'text-ink'}`}>{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 py-4">
      {/* Calm & Minimal Welcome Section */}
      <div className="pb-6 border-b border-hairline flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-ink">Welcome back, {user?.name}.</h1>
          <p className="text-ink-muted text-sm mt-1">
            Your library summary and recent updates.
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="border border-hairline bg-white px-4 py-2 rounded-lg text-center shadow-sm">
            <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Lending active</p>
            <p className="text-lg font-serif font-bold text-ink mt-0.5">{stats?.lent_books_count || 0}</p>
          </div>
          <div className="border border-hairline bg-white px-4 py-2 rounded-lg text-center shadow-sm">
            <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Shared Shelves</p>
            <p className="text-lg font-serif font-bold text-ink mt-0.5">{stats?.shared_shelves_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Total Books" 
            value={stats.total_books || 0} 
            Icon={BookOpen} 
            isAccent={true}
            to="/books"
          />
          <StatCard 
            title="Currently Reading" 
            value={stats.reading_count || 0} 
            Icon={BookText} 
            to="/books?status=reading"
          />
          <StatCard 
            title="Finished This Year" 
            value={stats.finished_this_year || 0} 
            Icon={CheckSquare} 
            to={`/books?status=finished&year=${new Date().getFullYear()}`}
          />
          <StatCard 
            title="Average Rating" 
            value={stats.average_rating ? `${stats.average_rating.toFixed(1)} / 5` : 'N/A'} 
            Icon={Star} 
            clickable={false}
          />
          <StatCard 
            title="Lent to Others" 
            value={stats.lent_books_count || 0} 
            Icon={ArrowUpRight} 
            to="/borrowed"
          />
          <StatCard 
            title="Shared With Me" 
            value={stats.shared_shelves_count || 0} 
            Icon={Users} 
            to="/shared"
          />
          <StatCard 
            title="Largest Shelf" 
            value={stats.largest_shelf?.name || 'None'} 
            Icon={FolderHeart} 
            to={stats.largest_shelf ? `/shelves/${stats.largest_shelf.id}` : undefined}
            clickable={!!stats.largest_shelf}
          />
          <StatCard 
            title="Status Distribution" 
            value={`${stats.want_to_read_count || 0} • ${stats.reading_count || 0} • ${stats.finished_count || 0}`} 
            Icon={BarChart4} 
            clickable={false}
          />
        </div>
      )}

      {/* Recent Activity */}
      <div className="border border-hairline bg-white rounded-lg shadow-sm p-6">
        <ActivityFeed />
      </div>
    </div>
  );
};

export default Dashboard;