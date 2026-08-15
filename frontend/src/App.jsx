import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useSocket } from './websocket/useSocket';
import ProtectedRoute from './auth/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import PDFReader from './pages/PDFReader';
import Shelves from './pages/Shelves';
import ShelfDetails from './pages/ShelfDetails';
import SharedShelves from './pages/SharedShelves';
import BorrowedBooks from './pages/BorrowedBooks';

function App() {
  const { user, loading } = useAuth();
  const [notification, setNotification] = useState(null);

  useSocket('added_to_shelf', (data = {}) => {
    setNotification({
      message: `You have been added to a new shelf (ID: ${data.shelf_id}) as a ${data.role}!`,
      type: 'info'
    });
    // Auto dismiss after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border-l-4 border-primary-500 p-4 transition-all duration-300 transform translate-y-0">
          <div className="flex justify-between items-start">
            <p className="text-sm font-semibold text-gray-900">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-4 text-gray-400 hover:text-gray-600 font-bold">✕</button>
          </div>
        </div>
      )}
      {user && <Navbar />}
      <main className={user ? 'container mx-auto px-4 py-8' : ''}>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/books" element={
            <ProtectedRoute>
              <Books />
            </ProtectedRoute>
          } />

          <Route path="/books/:bookId/read" element={
            <ProtectedRoute>
              <PDFReader />
            </ProtectedRoute>
          } />
          
          <Route path="/shelves" element={
            <ProtectedRoute>
              <Shelves />
            </ProtectedRoute>
          } />
          
          <Route path="/shelves/:id" element={
            <ProtectedRoute>
              <ShelfDetails />
            </ProtectedRoute>
          } />
          
          <Route path="/shared" element={
            <ProtectedRoute>
              <SharedShelves />
            </ProtectedRoute>
          } />
          
          <Route path="/borrowed" element={
            <ProtectedRoute>
              <BorrowedBooks />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;