// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Atom, ChevronDown } from 'lucide-react';

const simulatorCategories = [
  {
    name: 'Physics',
    icon: '⚡',
    items: [
      { name: 'Projectile Motion', path: '/simulators/projectile-motion', icon: '🎯', ready: true },
      { name: 'Simple Pendulum', path: '/simulators/pendulum', icon: '🔔', ready: false },
      { name: 'Wave Motion', path: '/simulators/waves', icon: '🌊', ready: false },
      { name: "Newton's Laws", path: '/simulators/newtons-laws', icon: '🍎', ready: false },
      { name: 'Circular Motion', path: '/simulators/circular-motion', icon: '🔄', ready: false },
      { name: 'Electric Circuits', path: '/simulators/circuits', icon: '🔌', ready: false },
    ],
  },
  {
    name: 'Chemistry',
    icon: '🧪',
    items: [
      { name: 'Molecular Viewer', path: '/simulators/molecular-viewer', icon: '🧬', ready: false },
      { name: 'Periodic Table', path: '/simulators/periodic-table', icon: '📊', ready: false },
      { name: 'Chemical Bonding', path: '/simulators/bonding', icon: '🔗', ready: false },
      { name: 'Gas Laws', path: '/simulators/gas-laws', icon: '💨', ready: false },
      { name: 'Reaction Rates', path: '/simulators/reaction-rates', icon: '⚗️', ready: false },
    ],
  },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setActiveDropdown(null);
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-indigo-500/5 border-b border-indigo-100/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 
                            flex items-center justify-center shadow-lg shadow-indigo-500/30
                            group-hover:shadow-indigo-500/50 transition-all duration-300
                            group-hover:scale-110">
                <Atom size={20} className="text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full 
                            border-2 border-white animate-pulse" />
            </div>
            <div>
              <span className={`text-lg font-extrabold tracking-tight transition-colors duration-300 ${
                scrolled ? 'text-gray-900' : 'text-white'
              }`}>
                SciSim
              </span>
              <span className={`text-lg font-extrabold tracking-tight transition-colors duration-300 ${
                scrolled ? 'text-indigo-600' : 'text-indigo-300'
              }`}>
                Lab
              </span>
              <div className={`text-[9px] font-medium -mt-1 transition-colors duration-300 ${
                scrolled ? 'text-gray-400' : 'text-white/60'
              }`}>
                Nepal Curriculum
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" scrolled={scrolled} active={location.pathname === '/'}>
              Home
            </NavLink>

            {simulatorCategories.map((category) => (
              <div
                key={category.name}
                className="relative"
                onMouseEnter={() => setActiveDropdown(category.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold 
                            transition-all duration-300 ${
                    scrolled
                      ? 'text-gray-700 hover:text-indigo-700 hover:bg-indigo-50'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{category.icon}</span>
                  {category.name}
                  <ChevronDown size={14} className={`transition-transform duration-300 ${
                    activeDropdown === category.name ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Dropdown */}
                <div
                  className={`absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-2xl 
                            shadow-indigo-500/10 border border-indigo-100/50 overflow-hidden
                            transition-all duration-300 origin-top ${
                    activeDropdown === category.name
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="p-2">
                    {category.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.ready ? item.path : '#'}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          item.ready
                            ? 'hover:bg-indigo-50 cursor-pointer group'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={(e) => !item.ready && e.preventDefault()}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
                            {item.name}
                          </div>
                        </div>
                        {item.ready ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 
                                         px-2 py-0.5 rounded-full">LIVE</span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 
                                         px-2 py-0.5 rounded-full">SOON</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <NavLink to="/about" scrolled={scrolled} active={location.pathname === '/about'}>
              About
            </NavLink>
          </div>

          {/* CTA + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <Link
              to="/simulators/projectile-motion"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm 
                       font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                       hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25
                       hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105"
            >
              Try Now
              <span className="text-xs">→</span>
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-500 overflow-hidden ${
          isOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl border-t border-indigo-100 px-4 py-4 space-y-2
                      shadow-xl overflow-y-auto max-h-[70vh]">
          <MobileNavLink to="/" active={location.pathname === '/'}>Home</MobileNavLink>

          {simulatorCategories.map((cat) => (
            <div key={cat.name}>
              <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                {cat.icon} {cat.name}
              </div>
              {cat.items.map((item) => (
                <MobileNavLink
                  key={item.path}
                  to={item.ready ? item.path : '#'}
                  active={location.pathname === item.path}
                  disabled={!item.ready}
                  onClick={(e) => !item.ready && e.preventDefault()}
                >
                  <span>{item.icon}</span> {item.name}
                  {!item.ready && (
                    <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 
                                   px-2 py-0.5 rounded-full">SOON</span>
                  )}
                </MobileNavLink>
              ))}
            </div>
          ))}

          <div className="pt-2">
            <Link
              to="/simulators/projectile-motion"
              className="block w-full text-center px-4 py-3 rounded-xl text-sm font-bold 
                       bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                       shadow-lg shadow-indigo-500/25"
            >
              🚀 Launch Simulator
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, children, scrolled, active }) {
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
        active
          ? scrolled
            ? 'text-indigo-700 bg-indigo-50'
            : 'text-white bg-white/15'
          : scrolled
          ? 'text-gray-700 hover:text-indigo-700 hover:bg-indigo-50'
          : 'text-white/90 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ to, children, active, disabled, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : active
          ? 'text-indigo-700 bg-indigo-50'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </Link>
  );
}