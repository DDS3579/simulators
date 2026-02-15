// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import ProjectileMotion from './pages/ProjectileMotion';
import About from './pages/About';

// Newton's Laws pages
import NewtonsLawsHub from './pages/newtons-laws/NewtonsLawsHub';
import SecondLawSimulator from './pages/newtons-laws/SecondLawSimulator';
import ApparentWeight from './pages/newtons-laws/ApparentWeight';
import ImpulseMomentum from './pages/newtons-laws/ImpulseMomentum';
import MomentumConservation from './pages/newtons-laws/MomentumConservation';
import RelativeVelocity from './pages/newtons-laws/RelativeVelocity';

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

        {/* Newton's Laws routes */}
        <Route
          path="/simulators/newtons-laws"
          element={
            <SimulatorLayout>
              <NewtonsLawsHub />
            </SimulatorLayout>
          }
        />
        <Route
          path="/simulators/newtons-laws/second-law"
          element={
            <SimulatorLayout>
              <SecondLawSimulator />
            </SimulatorLayout>
          }
        />
        <Route
          path="/simulators/newtons-laws/apparent-weight"
          element={
            <SimulatorLayout>
              <ApparentWeight />
            </SimulatorLayout>
          }
        />
        <Route
          path="/simulators/newtons-laws/impulse-momentum"
          element={
            <SimulatorLayout>
              <ImpulseMomentum />
            </SimulatorLayout>
          }
        />
        <Route
          path="/simulators/newtons-laws/conservation"
          element={
            <SimulatorLayout>
              <MomentumConservation />
            </SimulatorLayout>
          }
        />
        <Route
          path="/simulators/newtons-laws/relative-velocity"
          element={
            <SimulatorLayout>
              <RelativeVelocity />
            </SimulatorLayout>
          }
        />
      </Routes>
    </Router>
  );
}