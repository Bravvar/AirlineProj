import { useState, useEffect } from 'react';
import Logo from './Logo';

export default function GlobalHeader({ 
  activePage, 
  onNavigate, 
  auth, 
  onSignIn, 
  onToggleSidebar,
  onSignOut
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getNavItems = () => {
    const items = [
      { id: 'flights', label: 'Flights' },
      { id: 'deals', label: 'Deals' },
      { id: 'trips', label: 'My Trips' },
    ];

    if (auth.role === 'Supervisor' || auth.role === 'Employee') {
      items.push({ id: 'reports', label: 'Reports' });
      items.push({ id: 'queries', label: 'Queries' });
      items.push({ id: 'triggers', label: 'Triggers' });
    }

    if (auth.role === 'Supervisor') {
      items.push({ id: 'admin', label: 'Admin' });
      items.push({ id: 'employee', label: 'Staff' });
    } else if (auth.role === 'Employee') {
      items.push({ id: 'employee', label: 'Staff' });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex justify-between items-center px-8 py-4 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100 text-gray-900' 
          : 'bg-gradient-to-b from-black/60 to-transparent text-white'
      }`}
    >
      <div className="cursor-pointer" onClick={() => onNavigate('flights')}>
        <Logo light={!scrolled} />
      </div>

      <nav className="hidden md:flex items-center gap-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`text-sm font-semibold transition-all ${
              activePage === item.id
                ? scrolled ? 'text-[#0066ff]' : 'text-white'
                : scrolled ? 'text-gray-600 hover:text-[#0066ff]' : 'text-white/80 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        {auth.token ? (
          <button
            onClick={onToggleSidebar}
            className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform"
          >
            {auth.email?.charAt(0).toUpperCase()}
          </button>
        ) : (
          <button 
            onClick={onSignIn} 
            className={`font-semibold px-6 py-2 rounded-full text-sm transition-all ${
              scrolled 
                ? 'bg-[#0066ff] text-white hover:bg-blue-700' 
                : 'bg-white text-[#0066ff] hover:bg-gray-100'
            }`}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}