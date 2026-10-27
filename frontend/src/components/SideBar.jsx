import { useEffect } from 'react';

export default function SideBar({ show, onHide, auth, onLogout, onNavigate }) {
  useEffect(() => {
    if (show) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [show]);

  if (!show) return null;

  let menuItems;
  let roleTitle;

  const homeIcon = 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6';

  if (auth.role === 'Supervisor') {
    roleTitle = 'Admin Console';
    menuItems = [
      { id: 'dashboard', label: 'Flight Search', icon: homeIcon },
      { id: 'admin', label: 'Admin Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
      { id: 'employee', label: 'Staff Workspace', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    ];
  } else if (auth.role === 'Employee') {
    roleTitle = 'Staff Workspace';
    menuItems = [
      { id: 'dashboard', label: 'Flight Search', icon: homeIcon },
      { id: 'employee', label: 'Flight & Passengers', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
    ];
  } else {
    roleTitle = 'My Account';
    menuItems = [
      { id: 'dashboard', label: 'Flight Search', icon: homeIcon },
      { id: 'deals', label: 'Deals', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
    ];
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onHide}></div>
      
      <div className="relative w-80 bg-[#0f172a] text-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="p-8 border-b border-white/10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold text-3xl shadow-lg mb-4">
            {auth.email?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold text-white">{roleTitle}</h2>
          <p className="text-sm text-gray-400 mt-1">{auth.email}</p>
          <button onClick={onHide} className="absolute top-6 right-6 text-gray-400 hover:text-white text-3xl leading-none cursor-pointer">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); onHide(); }}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-white/10">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-400 font-bold py-3 rounded-2xl hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}