import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, LayoutDashboard, Library, FolderOpen, Users, ArrowLeftRight, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const navLinks = [
    { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
    { path: '/books', label: 'Books', Icon: Library },
    { path: '/shelves', label: 'Shelves', Icon: FolderOpen },
    { path: '/shared', label: 'Shared', Icon: Users },
    { path: '/borrowed', label: 'Lending', Icon: ArrowLeftRight },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-hairline shadow-sm min-h-[64px]">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-10 flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2 group flex-shrink-0" onClick={() => setMobileMenuOpen(false)}>
              <BookOpen className="w-6 h-6 text-accent" strokeWidth={1.5} />
              <span className="text-xl font-serif font-bold text-ink">
                BookNest
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 flex-shrink-0">
              {navLinks.map((link) => {
                const LinkIcon = link.Icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                      isActive
                        ? 'text-accent bg-paper'
                        : 'text-ink-muted hover:text-ink hover:bg-paper/50'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" strokeWidth={1.5} />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Right Section: User Profile & Actions (Desktop) */}
          <div className="hidden md:flex items-center space-x-6 flex-shrink-0">
            <div className="flex items-center space-x-3 border-r border-hairline pr-5">
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-white font-semibold text-xs shadow-sm flex-shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-ink line-clamp-1">{user?.name}</p>
                <p className="text-[10px] font-medium text-ink-muted whitespace-nowrap">
                  ID: {user?.id} • Active Reader
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            className="md:hidden p-2 text-ink-muted hover:text-ink rounded-lg hover:bg-paper/50 transition-colors flex-shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden flex flex-col px-6 py-4 border-t border-hairline bg-white shadow-lg space-y-2">
          {navLinks.map((link) => {
            const LinkIcon = link.Icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `px-3 py-3 rounded-lg text-sm font-medium transition-colors flex items-center space-x-3 ${
                  isActive
                    ? 'text-accent bg-paper'
                    : 'text-ink-muted hover:text-ink hover:bg-paper/50'
                }`}
              >
                <LinkIcon className="w-5 h-5" strokeWidth={1.5} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
          
          <div className="border-t border-hairline mt-2 pt-4 pb-2">
            <div className="flex justify-between items-center px-3 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-white font-semibold text-xs shadow-sm flex-shrink-0">
                  {getInitials(user?.name)}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-ink line-clamp-1">{user?.name}</p>
                  <p className="text-[10px] font-medium text-ink-muted">
                    ID: {user?.id} • Active Reader
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setMobileMenuOpen(false); logout(); }}
              className="w-full px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;