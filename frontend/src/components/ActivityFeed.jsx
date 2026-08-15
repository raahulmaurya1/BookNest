import React, { useState, useEffect } from 'react';
import { activityAPI } from '../api/dashboard';
import { booksAPI } from '../api/books';
import { shelvesAPI } from '../api/shelves';
import { useActivitySubscription } from '../websocket/useSocket';
import Loading from './Loading';
import ErrorMessage from './ErrorMessage';
import { 
  BookOpen, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  Activity, 
  FolderOpen, 
  Clipboard 
} from 'lucide-react';

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [books, setBooks] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const [actRes, booksRes, shelvesRes] = await Promise.all([
        activityAPI.getActivity(),
        booksAPI.getAll().catch(() => ({ data: [] })),
        shelvesAPI.getAll().catch(() => ({ data: [] }))
      ]);
      setActivities(actRes.data || []);
      setBooks(booksRes.data || []);
      setShelves(shelvesRes.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load activity feed');
      console.error('Activity fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useActivitySubscription((newActivity) => {
    setActivities((prev) => [newActivity, ...prev]);
  });

  const getEventIcon = (actionText) => {
    if (!actionText) return Clipboard;
    const text = actionText.toLowerCase();
    if (text.includes('added') || text.includes('created')) return BookOpen;
    if (text.includes('started')) return BookOpen;
    if (text.includes('reached') || text.includes('halfway')) return Activity;
    if (text.includes('finished')) return BookOpen;
    if (text.includes('deleted') || text.includes('removed')) return Trash2;
    if (text.includes('lent')) return ArrowUpRight;
    if (text.includes('returned')) return ArrowDownLeft;
    if (text.includes('shared')) return Users;
    if (text.includes('role') || text.includes('permission')) return Edit2;
    if (text.includes('collaborator')) return Users;
    return Clipboard;
  };

  const getEventDescription = (activity) => {
    const book = books.find(b => b.id === activity.reference_id);
    const shelf = shelves.find(s => s.id === activity.reference_id);
    
    const bookTitle = book ? `"${book.title}"` : (activity.reference_id ? `Book #${activity.reference_id}` : 'a book');
    const shelfName = shelf ? `"${shelf.name}"` : (activity.reference_id ? `Shelf #${activity.reference_id}` : 'a shelf');

    switch (activity.action) {
      case 'added_book':
        return `Added ${bookTitle} to library`;
      case 'started_reading':
        return `Started reading ${bookTitle}`;
      case 'reached_halfway':
        return `Reached 50% of ${bookTitle}`;
      case 'finished_book':
        return `Finished reading ${bookTitle}`;
      case 'deleted_book':
        return `Deleted a book from library`;
      case 'lent_book':
        return `Lent ${bookTitle}`;
      case 'returned_book':
        return `Returned ${bookTitle} to library`;
      case 'shelf_shared':
        return `Shared shelf ${shelfName}`;
      case 'role_changed':
        return `Updated member permissions on shelf ${shelfName}`;
      case 'collaborator_removed':
        return `Removed a collaborator from shelf ${shelfName}`;
      default:
        return activity.action || 'Unknown activity';
    }
  };

  const filteredActivities = activities.filter(act => act.action !== 'updated_progress');

  if (loading) return <Loading message="Loading activities..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchActivities} />;
  if (filteredActivities.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-semibold text-ink-muted italic">No activity logs recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-ink">Recent Activity</h3>
        <p className="text-xs font-semibold text-ink-muted mt-0.5">Real-time log of library operations</p>
      </div>

      <div className="flow-root pl-1">
        <ul className="-mb-8">
          {filteredActivities.slice(0, 20).map((activity, index) => {
            const EventIcon = getEventIcon(activity.action);
            return (
              <li key={activity.id || index}>
                <div className="relative pb-8">
                  {/* Vertical line connecting logs */}
                  {index < filteredActivities.length - 1 && index < 19 && (
                    <span className="absolute top-4 left-4 -ml-px h-full w-[1px] bg-hairline" aria-hidden="true" />
                  )}
                  <div className="relative flex space-x-4 items-start">
                    {/* Log Icon Circle */}
                    <div className="w-8 h-8 rounded-full border border-hairline bg-white flex items-center justify-center shadow-sm z-10 text-ink-muted">
                      <EventIcon className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    {/* Log details */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-ink leading-snug">
                        {getEventDescription(activity)}
                      </p>
                      <p className="mt-1 text-[9px] font-bold text-ink-muted uppercase tracking-wider">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ActivityFeed;