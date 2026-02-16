import { useMemo } from "react";
import { PRESET_MOLECULES } from "../lib/molecules";

// Atom colors matching the design system
const ATOM_COLORS = {
  C: "#2d3748", // Carbon - dark gray
  H: "#a0aec0", // Hydrogen - light gray
  O: "#e53e3e", // Oxygen - red
  N: "#3182ce", // Nitrogen - blue
  S: "#d69e2e", // Sulfur - yellow
  Cl: "#38a169", // Chlorine - green
  Br: "#805ad5", // Bromine - purple
  F: "#38b2ac", // Fluorine - teal
  P: "#dd6b20", // Phosphorus - orange
  I: "#6b46c1", // Iodine - violet
};

// Pre-defined structural layouts for common molecules
const STRUCTURAL_LAYOUTS = {
  // Methane CH4
  "C": {
    atoms: [
      { symbol: "H", x: 50, y: 100 },
      { symbol: "C", x: 150, y: 100 },
      { symbol: "H", x: 250, y: 100 },
      { symbol: "H", x: 150, y: 30 },
      { symbol: "H", x: 150, y: 170 },
    ],
    bonds: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
    ],
  },
  // Water H2O
  "O": {
    atoms: [
      { symbol: "H", x: 60, y: 100 },
      { symbol: "O", x: 150, y: 100 },
      { symbol: "H", x: 240, y: 100 },
    ],
    bonds: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  // Carbon Dioxide CO2
  "O=C=O": {
    atoms: [
      { symbol: "O", x: 60, y: 100 },
      { symbol: "C", x: 150, y: 100 },
      { symbol: "O", x: 240, y: 100 },
    ],
    bonds: [
      { from: 0, to: 1, type: 2 },
      { from: 1, to: 2, type: 2 },
    ],
  },
  // Ammonia NH3
  "N": {
    atoms: [
      { symbol: "H", x: 60, y: 120 },
      { symbol: "N", x: 150, y: 100 },
      { symbol: "H", x: 240, y: 120 },
      { symbol: "H", x: 150, y: 170 },
    ],
    bonds: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
    ],
  },
  // Ethane C2H6
  "CC": {
    atoms: [
      { symbol: "H", x: 30, y: 60 },
      { symbol: "H", x: 30, y: 140 },
      { symbol: "H", x: 100, y: 20 },
      { symbol: "C", x: 100, y: 100 },
      { symbol: "C", x: 200, y: 100 },
      { symbol: "H", x: 200, y: 20 },
      { symbol: "H", x: 270, y: 60 },
      { symbol: "H", x: 270, y: 140 },
    ],
    bonds: [
      { from: 0, to: 3 },
      { from: 1, to: 3 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 4, to: 6 },
      { from: 4, to: 7 },
    ],
  },
  // Ethanol C2H5OH
  "CCO": {
    atoms: [
      { symbol: "H", x: 20, y: 50 },
      { symbol: "H", x: 20, y: 130 },
      { symbol: "H", x: 80, y: 10 },
      { symbol: "C", x: 80, y: 90 },
      { symbol: "C", x: 160, y: 90 },
      { symbol: "H", x: 160, y: 10 },
      { symbol: "H", x: 160, y: 170 },
      { symbol: "O", x: 240, y: 90 },
      { symbol: "H", x: 310, y: 90 },
    ],
    bonds: [
      { from: 0, to: 3 },
      { from: 1, to: 3 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 4, to: 6 },
      { from: 4, to: 7 },
      { from: 7, to: 8 },
    ],
  },
  // Methanol CH3OH
  "CO": {
    atoms: [
      { symbol: "H", x: 30, y: 50 },
      { symbol: "H", x: 30, y: 130 },
      { symbol: "H", x: 100, y: 10 },
      { symbol: "C", x: 100, y: 90 },
      { symbol: "O", x: 200, y: 90 },
      { symbol: "H", x: 280, y: 90 },
    ],
    bonds: [
      { from: 0, to: 3 },
      { from: 1, to: 3 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
    ],
  },
  // Propane C3H8
  "CCC": {
    atoms: [
      { symbol: "H", x: 20, y: 50 },
      { symbol: "H", x: 20, y: 130 },
      { symbol: "H", x: 80, y: 10 },
      { symbol: "C", x: 80, y: 90 },
      { symbol: "C", x: 160, y: 90 },
      { symbol: "H", x: 160, y: 10 },
      { symbol: "H", x: 160, y: 170 },
      { symbol: "C", x: 240, y: 90 },
      { symbol: "H", x: 240, y: 10 },
      { symbol: "H", x: 300, y: 50 },
      { symbol: "H", x: 300, y: 130 },
    ],
    bonds: [
      { from: 0, to: 3 },
      { from: 1, to: 3 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 4, to: 6 },
      { from: 4, to: 7 },
      { from: 7, to: 8 },
      { from: 7, to: 9 },
      { from: 7, to: 10 },
    ],
  },
  // Butane C4H10
  "CCCC": {
    atoms: [
      { symbol: "H", x: 10, y: 50 },
      { symbol: "H", x: 10, y: 130 },
      { symbol: "H", x: 60, y: 10 },
      { symbol: "C", x: 60, y: 90 },
      { symbol: "C", x: 130, y: 90 },
      { symbol: "H", x: 130, y: 10 },
      { symbol: "H", x: 130, y: 170 },
      { symbol: "C", x: 200, y: 90 },
      { symbol: "H", x: 200, y: 10 },
      { symbol: "H", x: 200, y: 170 },
      { symbol: "C", x: 270, y: 90 },
      { symbol: "H", x: 270, y: 10 },
      { symbol: "H", x: 320, y: 50 },
      { symbol: "H", x: 320, y: 130 },
    ],
    bonds: [
      { from: 0, to: 3 },
      { from: 1, to: 3 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 4, to: 6 },
      { from: 4, to: 7 },
      { from: 7, to: 8 },
      { from: 7, to: 9 },
      { from: 7, to: 10 },
      { from: 10, to: 11 },
      { from: 10, to: 12 },
      { from: 10, to: 13 },
    ],
  },
  // Benzene C6H6 - hexagonal ring
  "c1ccccc1": {
    atoms: [
      { symbol: "C", x: 150, y: 40 },
      { symbol: "C", x: 230, y: 85 },
      { symbol: "C", x: 230, y: 165 },
      { symbol: "C", x: 150, y: 210 },
      { symbol: "C", x: 70, y: 165 },
      { symbol: "C", x: 70, y: 85 },
      { symbol: "H", x: 150, y: -20 },
      { symbol: "H", x: 290, y: 55 },
      { symbol: "H", x: 290, y: 195 },
      { symbol: "H", x: 150, y: 270 },
      { symbol: "H", x: 10, y: 195 },
      { symbol: "H", x: 10, y: 55 },
    ],
    bonds: [
      { from: 0, to: 1, type: 2 },
      { from: 1, to: 2 },
      { from: 2, to: 3, type: 2 },
      { from: 3, to: 4 },
      { from: 4, to: 5, type: 2 },
      { from: 5, to: 0 },
      { from: 0, to: 6 },
      { from: 1, to: 7 },
      { from: 2, to: 8 },
      { from: 3, to: 9 },
      { from: 4, to: 10 },
      { from: 5, to: 11 },
    ],
  },
  // Oxygen O2
  "O=O": {
    atoms: [
      { symbol: "O", x: 100, y: 100 },
      { symbol: "O", x: 200, y: 100 },
    ],
    bonds: [
      { from: 0, to: 1, type: 2 },
    ],
  },
  // Nitrogen N2
  "N#N": {
    atoms: [
      { symbol: "N", x: 100, y: 100 },
      { symbol: "N", x: 200, y: 100 },
    ],
    bonds: [
      { from: 0, to: 1, type: 3 },
    ],
  },
  // Hydrogen H2
  "[H][H]": {
    atoms: [
      { symbol: "H", x: 100, y: 100 },
      { symbol: "H", x: 200, y: 100 },
    ],
    bonds: [
      { from: 0, to: 1 },
    ],
  },
  // Acetic Acid CH3COOH
  "CC(=O)O": {
    atoms: [
      { symbol: "H", x: 20, y: 50 },
      { symbol: "H", x: 20, y: 130 },
      { symbol: "H", x: 80, y: 10 },
      { symbol: "C", x: 80, y: 90 },
      { symbol: "C", x: 160, y: 90 },
      { symbol: "O", x: 160, y: 10 },
      { symbol: "O", x: 240, y: 90 },
      { symbol: "H", x: 310, y: 90 },
    ],
    bonds: [
      { from: 0, to: 3 },
      { from: 1, to: 3 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5, type: 2 },
      { from: 4, to: 6 },
      { from: 6, to: 7 },
    ],
  },
  // Glucose - simplified linear form
  "OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O": {
    atoms: [
      { symbol: "H", x: 10, y: 90 },
      { symbol: "O", x: 50, y: 90 },
      { symbol: "C", x: 110, y: 90 },
      { symbol: "H", x: 110, y: 30 },
      { symbol: "H", x: 110, y: 150 },
      { symbol: "C", x: 170, y: 90 },
      { symbol: "H", x: 170, y: 150 },
      { symbol: "O", x: 170, y: 30 },
      { symbol: "H", x: 220, y: 30 },
      { symbol: "C", x: 230, y: 90 },
      { symbol: "H", x: 230, y: 150 },
      { symbol: "O", x: 290, y: 90 },
      { symbol: "H", x: 340, y: 90 },
    ],
    bonds: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 2, to: 4 },
      { from: 2, to: 5 },
      { from: 5, to: 6 },
      { from: 5, to: 7 },
      { from: 7, to: 8 },
      { from: 5, to: 9 },
      { from: 9, to: 10 },
      { from: 9, to: 11 },
      { from: 11, to: 12 },
    ],
  },
};

export function StructuralFormula({ smiles, formula }) {
  const layout = useMemo(() => {
    // Try to find a predefined layout
    if (STRUCTURAL_LAYOUTS[smiles]) {
      return STRUCTURAL_LAYOUTS[smiles];
    }
    
    // Check if we can match by formula from preset molecules
    if (formula) {
      const molecule = PRESET_MOLECULES.find(m => m.formula === formula);
      if (molecule && STRUCTURAL_LAYOUTS[molecule.smiles]) {
        return STRUCTURAL_LAYOUTS[molecule.smiles];
      }
    }
    
    return null;
  }, [smiles, formula]);

  if (!layout) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-muted-foreground">
          <p className="font-medium">Structural formula not available</p>
          <p className="text-sm mt-1">Try Lewis Structure or Bond-line view for this molecule</p>
        </div>
      </div>
    );
  }

  // Calculate viewBox dimensions
  const padding = 40;
  const maxX = Math.max(...layout.atoms.map(a => a.x)) + padding;
  const maxY = Math.max(...layout.atoms.map(a => a.y)) + padding;
  const minX = Math.min(...layout.atoms.map(a => a.x)) - padding;
  const minY = Math.min(...layout.atoms.map(a => a.y)) - padding;
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <div className="w-full h-full flex items-center justify-center animate-scale-in">
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        className="max-w-full max-h-full"
        style={{ width: "auto", height: "auto", maxWidth: "90%", maxHeight: "90%" }}
      >
        {/* Render bonds first (behind atoms) */}
        {layout.bonds.map((bond, index) => {
          const fromAtom = layout.atoms[bond.from];
          const toAtom = layout.atoms[bond.to];
          const bondType = bond.type || 1;

          if (bondType === 1) {
            return (
              <line
                key={`bond-${index}`}
                x1={fromAtom.x}
                y1={fromAtom.y}
                x2={toAtom.x}
                y2={toAtom.y}
                stroke="hsl(var(--foreground))"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          } else if (bondType === 2) {
            // Double bond
            const dx = toAtom.x - fromAtom.x;
            const dy = toAtom.y - fromAtom.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const offset = 4;
            const perpX = (-dy / len) * offset;
            const perpY = (dx / len) * offset;

            return (
              <g key={`bond-${index}`}>
                <line
                  x1={fromAtom.x + perpX}
                  y1={fromAtom.y + perpY}
                  x2={toAtom.x + perpX}
                  y2={toAtom.y + perpY}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <line
                  x1={fromAtom.x - perpX}
                  y1={fromAtom.y - perpY}
                  x2={toAtom.x - perpX}
                  y2={toAtom.y - perpY}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            );
          } else if (bondType === 3) {
            // Triple bond
            const dx = toAtom.x - fromAtom.x;
            const dy = toAtom.y - fromAtom.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const offset = 6;
            const perpX = (-dy / len) * offset;
            const perpY = (dx / len) * offset;

            return (
              <g key={`bond-${index}`}>
                <line
                  x1={fromAtom.x}
                  y1={fromAtom.y}
                  x2={toAtom.x}
                  y2={toAtom.y}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <line
                  x1={fromAtom.x + perpX}
                  y1={fromAtom.y + perpY}
                  x2={toAtom.x + perpX}
                  y2={toAtom.y + perpY}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <line
                  x1={fromAtom.x - perpX}
                  y1={fromAtom.y - perpY}
                  x2={toAtom.x - perpX}
                  y2={toAtom.y - perpY}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            );
          }
          return null;
        })}

        {/* Render atoms */}
        {layout.atoms.map((atom, index) => {
          const color = ATOM_COLORS[atom.symbol] || "#718096";
          const isHydrogen = atom.symbol === "H";
          const radius = isHydrogen ? 14 : 18;

          return (
            <g key={`atom-${index}`}>
              {/* White background circle to cover bond lines */}
              <circle
                cx={atom.x}
                cy={atom.y}
                r={radius + 2}
                fill="hsl(var(--card))"
              />
              {/* Atom label */}
              <text
                x={atom.x}
                y={atom.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize={isHydrogen ? "18" : "22"}
                fontWeight="600"
                fontFamily="Outfit, system-ui, sans-serif"
              >
                {atom.symbol}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}