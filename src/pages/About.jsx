// src/pages/About.jsx
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Atom, ArrowRight, Github, Linkedin, Globe,
  BookOpen, Cpu, Eye, Target, Play, Mail,
  Code2, GraduationCap, MapPin
} from 'lucide-react';

/* ───────────────── Reveal wrapper ───────────────── */

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────── Data ───────────────── */

const principles = [
  {
    icon: <Eye size={20} />,
    title: 'Visual First',
    body: 'Every concept is a simulation, not a paragraph. If you can see it move, you understand it faster than reading about it three times.',
  },
  {
    icon: <Target size={20} />,
    title: 'Curriculum Aligned',
    body: 'Built around the Nepal NEB Grade 11 & 12 syllabus. Every simulator maps to a specific chapter so it fits right into your study flow.',
  },
  {
    icon: <Cpu size={20} />,
    title: 'Real Physics Engine',
    body: 'No pre-recorded animations. Every frame is calculated in real-time using actual physics equations. Change a variable, see real results.',
  },
  {
    icon: <BookOpen size={20} />,
    title: 'Solve, Don\'t Just Watch',
    body: 'Inverse solvers let you input what you know and calculate what you don\'t. Built for the way exam questions actually work.',
  },
];

const milestones = [
  { label: 'Projectile Motion', status: 'live', detail: 'Angled & horizontal, inverse solver, velocity vectors' },
  { label: 'Simple Pendulum', status: 'building', detail: 'SHM, period, energy conservation' },
  { label: 'Wave Motion', status: 'planned', detail: 'Transverse, longitudinal, interference' },
  { label: 'Molecular Viewer', status: 'planned', detail: '3D structures, bond angles' },
  { label: 'Periodic Table', status: 'planned', detail: 'Interactive, electron configurations' },
  { label: 'Newton\'s Laws', status: 'planned', detail: 'Force diagrams, friction' },
  { label: 'Gas Laws', status: 'planned', detail: 'Boyle\'s, Charles\'s, ideal gas' },
  { label: 'More coming...', status: 'planned', detail: 'Circuits, optics, thermodynamics, bonding' },
];

const techStack = [
  'React', 'Vite', 'Three.js', 'Framer Motion', 'Tailwind CSS', 'Canvas API'
];

const socials = [
  { name: 'Portfolio', url: 'https://dds3579.github.io/portfolio', Icon: Globe },
  { name: 'GitHub', url: 'https://github.com/dds3579', Icon: Github },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/dds3579/', Icon: Linkedin },
];

/* ───────────────── Component ───────────────── */

export default function About() {
  return (
    <div className="bg-white text-gray-900">

      {/* ═══════ HERO ═══════ */}
      <section className="bg-gray-950 pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-700
                          text-xs font-medium text-gray-400 mb-8">
              <Atom size={13} className="text-indigo-400" />
              About the project
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
              We built the lab
              <br />
              <span className="text-indigo-400">our classrooms didn't have.</span>
            </h1>

            <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
              SciSimLab is an open-source collection of interactive science simulators
              designed specifically for Nepalese high school students. It turns the physics
              and chemistry formulas in your NEB textbook into things you can actually
              see, touch, and play with — right in your browser.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ THE PROBLEM / WHY ═══════ */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <Reveal>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">The problem</p>
          </Reveal>

          <Reveal delay={0.05}>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-6 leading-tight">
              You can memorize v² = u² + 2as and still have no idea what's happening.
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="space-y-5 text-gray-600 leading-relaxed">
              <p>
                Most of us learn physics and chemistry through derivations, numerical
                problems, and rote memorization. We solve for "the angle at which range
                is maximum" without ever watching a projectile fly. We balance chemical
                equations without seeing the molecules.
              </p>
              <p>
                Labs help — but not every school has them, not every chapter has an
                experiment, and you can't rewind a real pendulum to see what happens
                when you double the length.
              </p>
              <p>
                SciSimLab exists to fill that gap. It's not a replacement for your
                textbook or your teacher. It's the thing that sits between "I read the
                formula" and "I actually understand it." You change the angle, you see
                the trajectory change. You increase gravity, the projectile drops
                faster. That's it. That's the whole idea.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ PRINCIPLES ═══════ */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <Reveal>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">Principles</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-12 leading-tight">
              What guides how we build
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="p-6 rounded-xl border border-gray-200 bg-white
                              hover:border-gray-300 transition-colors duration-200">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600
                                flex items-center justify-center mb-4">
                    {p.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ ROADMAP ═══════ */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <Reveal>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">Roadmap</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 leading-tight">
              Where we are
            </h2>
            <p className="text-gray-500 mb-10 max-w-md">
              One simulator is live. The rest are on their way.
            </p>
          </Reveal>

          <div className="space-y-3">
            {milestones.map((m, i) => (
              <Reveal key={m.label} delay={i * 0.04}>
                <div className={`flex items-start gap-4 p-4 rounded-xl border transition-colors duration-200 ${
                  m.status === 'live'
                    ? 'bg-indigo-50/50 border-indigo-200'
                    : m.status === 'building'
                    ? 'bg-amber-50/30 border-amber-200/60'
                    : 'bg-white border-gray-150 hover:border-gray-250'
                }`}>
                  {/* Status dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    {m.status === 'live' && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </span>
                    )}
                    {m.status === 'building' && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      </span>
                    )}
                    {m.status === 'planned' && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${
                        m.status === 'live' ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {m.label}
                      </span>
                      {m.status === 'live' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100
                                       px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Live
                        </span>
                      )}
                      {m.status === 'building' && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100
                                       px-2 py-0.5 rounded-full uppercase tracking-wide">
                          In Progress
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{m.detail}</p>
                  </div>

                  {m.status === 'live' && (
                    <Link
                      to="/simulators/projectile-motion"
                      className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700
                               flex items-center gap-1 transition-colors"
                    >
                      Open <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TECH ═══════ */}
      <section className="py-16 bg-gray-50 border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-1">Built with</p>
                <p className="text-sm text-gray-500">Modern web tech. No downloads. No installs.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {techStack.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs
                             font-semibold text-gray-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ DEVELOPER ═══════ */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <Reveal>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">The developer</p>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="mt-6 flex flex-col md:flex-row gap-8 items-start">
              {/* Photo */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <img
                    src="https://avatars.githubusercontent.com/u/87577570?v=4"
                    alt="Divya Darsheel Sharma"
                    className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border-2 border-gray-200
                             shadow-lg shadow-gray-200/50"
                  />
                  {/* decorative corner */}
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-indigo-600
                                flex items-center justify-center">
                    <Code2 size={13} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="text-2xl font-black text-gray-900 mb-1">
                  Divya Darsheel Sharma
                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-gray-400" />
                    Grade 11 · National School of Sciences
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-gray-400" />
                    Kathmandu, Nepal
                  </span>
                </div>

                <p className="text-gray-600 leading-relaxed mb-5">
                  17-year-old full-stack developer with a thing for building tools that
                  make learning less painful. Started coding to automate homework, stayed
                  because building things is more fun than most things. When not writing
                  React components, probably debugging one. MERN stack by trade, curiosity
                  by nature — currently channeling both into making science simulators
                  that actually make sense.
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="px-2.5 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                    MongoDB
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                    Express
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                    React
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                    Node.js
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                    Three.js
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                    Tailwind
                  </span>
                </div>

                {/* Social links */}
                <div className="flex items-center gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.name}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200
                               text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300
                               hover:bg-gray-50 transition-all duration-200"
                    >
                      <s.Icon size={15} />
                      {s.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ OPEN SOURCE NOTE ═══════ */}
      <section className="py-16 bg-gray-950">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <Reveal>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  This project is open source.
                </h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Found a bug? Want to add a simulator? Want to improve the physics?
                  The code is on GitHub. Contributions are welcome.
                </p>
              </div>

              <a
                href="https://github.com/dds3579"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white
                         text-gray-900 text-sm font-semibold hover:bg-gray-100
                         transition-colors duration-200 flex-shrink-0"
              >
                <Github size={16} />
                View on GitHub
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ MINI CTA ═══════ */}
      <section className="py-20 bg-white">
        <div className="max-w-xl mx-auto px-6 text-center">
          <Reveal>
            <p className="text-gray-400 text-sm font-medium mb-3">Enough reading.</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-6">
              Go simulate something.
            </h2>
            <Link
              to="/simulators/projectile-motion"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full
                       bg-gray-900 text-white font-semibold text-sm
                       hover:bg-gray-800 transition-all duration-200 hover:scale-[1.03]
                       active:scale-[0.98] shadow-xl shadow-gray-900/15"
            >
              <Play size={15} fill="currentColor" />
              Open Projectile Motion
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}