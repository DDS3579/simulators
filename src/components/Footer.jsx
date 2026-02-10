// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import { Atom, Github, Linkedin, Globe, Heart, Mail, ArrowUpRight } from 'lucide-react';

const footerLinks = {
  physics: [
    { name: 'Projectile Motion', path: '/simulators/projectile-motion', live: true },
    { name: 'Simple Pendulum', path: '/simulators/pendulum', live: false },
    { name: 'Wave Motion', path: '/simulators/waves', live: false },
    { name: "Newton's Laws", path: '/simulators/newtons-laws', live: false },
    { name: 'Circular Motion', path: '/simulators/circular-motion', live: false },
    { name: 'Electric Circuits', path: '/simulators/circuits', live: false },
    { name: 'Optics & Lenses', path: '/simulators/optics', live: false },
    { name: 'Thermodynamics', path: '/simulators/thermodynamics', live: false },
  ],
  chemistry: [
    { name: 'Molecular Viewer', path: '/simulators/molecular-viewer', live: false },
    { name: 'Periodic Table', path: '/simulators/periodic-table', live: false },
    { name: 'Chemical Bonding', path: '/simulators/bonding', live: false },
    { name: 'Gas Laws', path: '/simulators/gas-laws', live: false },
    { name: 'Reaction Rates', path: '/simulators/reaction-rates', live: false },
    { name: 'Electrochemistry', path: '/simulators/electrochemistry', live: false },
  ],
  resources: [
    { name: 'About Project', path: '/about' },
    { name: 'How to Use', path: '/guide' },
    { name: 'Nepal NEB Syllabus', path: '/syllabus' },
    { name: 'Formula Sheets', path: '/formulas' },
    { name: 'Report a Bug', path: '/report' },
  ],
};

const socialLinks = [
  {
    name: 'Portfolio',
    url: 'https://dds3579.github.io/portfolio',
    icon: Globe,
    color: 'hover:text-emerald-400',
    bgColor: 'hover:bg-emerald-500/10',
  },
  {
    name: 'GitHub',
    url: 'https://github.com/dds3579',
    icon: Github,
    color: 'hover:text-white',
    bgColor: 'hover:bg-white/10',
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/dds3579/',
    icon: Linkedin,
    color: 'hover:text-blue-400',
    bgColor: 'hover:bg-blue-500/10',
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gray-950 text-gray-300 overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="px-6 pt-16 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
            {/* Brand column */}
            <div className="lg:col-span-4">
              <Link to="/" className="inline-flex items-center gap-2.5 group mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
                              flex items-center justify-center shadow-lg shadow-indigo-500/20
                              group-hover:shadow-indigo-500/40 transition-all duration-300
                              group-hover:scale-110">
                  <Atom size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-xl font-extrabold text-white">Sci</span>
                  <span className="text-xl font-extrabold text-indigo-400">Sim</span>
                  <span className="text-xl font-extrabold text-white">Lab</span>
                </div>
              </Link>

              <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-sm">
                Interactive science simulations built for Nepalese Grade 11 & 12 students. 
                Making Physics and Chemistry intuitive, visual, and engaging — one simulation at a time.
              </p>

              {/* Social links */}
              <div className="flex items-center gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-xl border border-gray-800 flex items-center justify-center
                              text-gray-500 transition-all duration-300 ${social.color} ${social.bgColor}
                              hover:border-gray-700 hover:scale-110`}
                    title={social.name}
                  >
                    <social.icon size={18} />
                  </a>
                ))}
              </div>
            </div>

            {/* Physics simulators */}
            <div className="lg:col-span-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="text-lg">⚡</span> Physics
              </h3>
              <ul className="space-y-2.5">
                {footerLinks.physics.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.live ? link.path : '#'}
                      onClick={(e) => !link.live && e.preventDefault()}
                      className={`group flex items-center gap-2 text-sm transition-all duration-200 ${
                        link.live
                          ? 'text-gray-400 hover:text-indigo-400'
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                        link.live
                          ? 'bg-emerald-500 group-hover:bg-indigo-400 group-hover:scale-150'
                          : 'bg-gray-700'
                      }`} />
                      {link.name}
                      {link.live && (
                        <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 
                                                          transition-all duration-200 -translate-x-1 
                                                          group-hover:translate-x-0" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chemistry simulators */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="text-lg">🧪</span> Chemistry
              </h3>
              <ul className="space-y-2.5">
                {footerLinks.chemistry.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.live ? link.path : '#'}
                      onClick={(e) => !link.live && e.preventDefault()}
                      className={`group flex items-center gap-2 text-sm transition-all duration-200 ${
                        link.live
                          ? 'text-gray-400 hover:text-indigo-400'
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        link.live ? 'bg-emerald-500' : 'bg-gray-700'
                      }`} />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div className="lg:col-span-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="text-lg">📚</span> Resources
              </h3>
              <ul className="space-y-2.5">
                {footerLinks.resources.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="group flex items-center gap-2 text-sm text-gray-400 
                               hover:text-indigo-400 transition-all duration-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover:bg-indigo-400 
                                     group-hover:scale-150 transition-all duration-200" />
                      {link.name}
                      <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 
                                                        transition-all duration-200" />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Newsletter-style CTA */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 
                            border border-indigo-500/20">
                <p className="text-xs font-semibold text-indigo-300 mb-2">🚀 New simulators coming soon!</p>
                <p className="text-xs text-gray-500 mb-3">Star us on GitHub to stay updated</p>
                <a
                  href="https://github.com/dds3579"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold
                           bg-white/5 text-gray-300 hover:text-white hover:bg-white/10
                           border border-white/10 transition-all duration-200"
                >
                  <Github size={14} />
                  Star on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800/80">
          <div className="px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span>© {currentYear} SciSimLab.</span>
              <span>Developed with</span>
              <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" />
              <span>by</span>
              <a
                href="https://dds3579.github.io/portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors 
                         underline decoration-indigo-500/30 underline-offset-2 
                         hover:decoration-indigo-400/60"
              >
                Divya Darsheel Sharma
              </a>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </span>
              <span>•</span>
              <span>Made in 🇳🇵 Nepal</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}