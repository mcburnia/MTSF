import { useState, useMemo } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, CreditCard, Settings, LogOut, Shield, ChevronRight
} from 'lucide-react';
import { APP_CONFIG } from '../config';
import './styles/Sidebar.css';

interface SidebarProps {
  onNavigate?: () => void;
  orgName?: string;
}

/**
 * Data-driven navigation. Add/remove sections and items here to customise
 * the sidebar for your domain. This is the main place to extend navigation.
 */
const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/items', icon: Package, label: 'Items' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/billing', icon: CreditCard, label: 'Billing' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar({ onNavigate, orgName }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeSection = useMemo(() => {
    for (const section of navSections) {
      if (section.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'))) {
        return section.label;
      }
    }
    return navSections[0].label;
  }, [location.pathname]);

  const [expandedSection, setExpandedSection] = useState<string>(activeSection);

  function toggleSection(label: string) {
    setExpandedSection(prev => prev === label ? '' : label);
  }

  function handleLogout() {
    logout();
    if (onNavigate) onNavigate();
    navigate('/');
  }

  return (
    <>
      <Link to="/" className="sidebar-logo">{APP_CONFIG.name}</Link>
      <div className="sidebar-org">{orgName || 'My Organisation'}</div>
      {navSections.map((section) => {
        const isExpanded = expandedSection === section.label;
        const hasActive = section.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'));
        return (
          <div className={`nav-section${isExpanded ? ' nav-section-expanded' : ''}`} key={section.label}>
            <button
              className={`nav-section-label${hasActive ? ' nav-section-active' : ''}`}
              onClick={() => toggleSection(section.label)}
            >
              <ChevronRight size={14} className={`nav-section-chevron${isExpanded ? ' nav-section-chevron-open' : ''}`} />
              {section.label}
              {!isExpanded && hasActive && <span className="nav-section-dot" />}
            </button>
            <div className={`nav-section-items${isExpanded ? ' nav-section-items-open' : ''}`} style={{ '--item-count': section.items.length } as React.CSSProperties}>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={onNavigate}
                >
                  <item.icon size={18} className="nav-icon" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
      {user?.isPlatformAdmin && (
        <div className="nav-section admin-nav-section">
          <div className="nav-section-label">Platform</div>
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) => `nav-item admin-panel-link${isActive ? ' active' : ''}`}
            onClick={onNavigate}
          >
            <Shield size={18} className="nav-icon" />
            Admin Panel
          </NavLink>
        </div>
      )}
      <div className="sidebar-footer">
        <span className="sidebar-user-email">{user?.email}</span>
        <button className="nav-item logout-btn" onClick={handleLogout}>
          <LogOut size={18} className="nav-icon" />
          Sign Out
        </button>
      </div>
    </>
  );
}
