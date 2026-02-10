// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import ProjectileMotion from './pages/ProjectileMotion';
import About from './pages/About';

function SimulatorLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}

function HomeLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <HomeLayout>
              <LandingPage />
            </HomeLayout>
          }
        />
                <Route
          path="/about"
          element={
            <HomeLayout>
              <About />
            </HomeLayout>
          }
        />
        <Route
          path="/simulators/projectile-motion"
          element={
            <SimulatorLayout>
              <ProjectileMotion />
            </SimulatorLayout>
          }
        />
        {/* Add more simulator routes here */}
      </Routes>
    </Router>
  );
}