import { useEffect, useRef, useState } from "react";
import { FORMULA_TO_SMILES } from "../lib/molecules";
import { AlertCircle, Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { StructuralFormula } from "../components/StructuralFormula";
import $3Dmol from "3dmol";

export function VisualizationCanvas({ smiles, mode, formula }) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const [rdkit, setRdkit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [svgContent, setSvgContent] = useState(null);

  // Load RDKit
  useEffect(() => {
    const loadRDKit = async () => {
      try {
        if (window.RDKit) {
          setRdkit(window.RDKit);
          setIsLoading(false);
          return;
        }

        // Check if script is already loading
        const existingScript = document.querySelector('script[src*="RDKit"]');
        if (existingScript) {
          // Wait for it to load
          const checkLoaded = setInterval(() => {
            if (window.RDKit) {
              setRdkit(window.RDKit);
              setIsLoading(false);
              clearInterval(checkLoaded);
            }
          }, 100);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://unpkg.com/@rdkit/rdkit/Code/MinimalLib/dist/RDKit_minimal.js";
        script.async = true;
        
        script.onload = async () => {
          try {
            const RDKit = await window.initRDKitModule();
            window.RDKit = RDKit;
            setRdkit(RDKit);
            setIsLoading(false);
          } catch (err) {
            console.error("Failed to initialize RDKit:", err);
            setError("Failed to initialize chemistry library");
            setIsLoading(false);
          }
        };

        script.onerror = () => {
          setError("Failed to load chemistry library");
          setIsLoading(false);
        };

        document.head.appendChild(script);
      } catch (err) {
        setError("Failed to load chemistry library");
        setIsLoading(false);
      }
    };

    loadRDKit();
  }, []);

  // Render molecule when SMILES or mode changes
  useEffect(() => {
    if (!smiles || isLoading) return;

    // Get actual SMILES - check if formula was passed and needs conversion
    let actualSmiles = smiles;
    if (formula && FORMULA_TO_SMILES[formula.toUpperCase()]) {
      actualSmiles = FORMULA_TO_SMILES[formula.toUpperCase()];
    }

    setError(null);

    if (mode === "structural") {
      // Structural formula is rendered as a separate component
      setSvgContent(null);
      return;
    } else if (mode === "3d") {
      render3D(actualSmiles);
    } else {
      render2D(actualSmiles, mode);
    }
  }, [smiles, mode, rdkit, isLoading, formula]);

  const render2D = (smilesStr, vizMode) => {
    if (!rdkit || !canvasRef.current) return;

    try {
      const mol = rdkit.get_mol(smilesStr);
      if (!mol) {
        setError("Could not parse molecule. Please check the formula.");
        return;
      }

      // Configure drawing options based on mode
      const width = canvasRef.current.clientWidth || 500;
      const height = canvasRef.current.clientHeight || 400;

      let drawOptions = {
        width: Math.min(width, 600),
        height: Math.min(height - 40, 400),
        bondLineWidth: 2,
        addAtomIndices: false,
        addStereoAnnotation: true,
        backgroundColour: [0, 0, 0, 0], // Transparent
      };

      if (vizMode === "lewis") {
        // Lewis structure - show all atoms including hydrogens
        drawOptions = {
          ...drawOptions,
          addAtomIndices: false,
          explicitMethyl: true,
        };
        
        // Add hydrogens for Lewis structure
        const molWithH = rdkit.get_mol(smilesStr);
        if (molWithH) {
          const svg = molWithH.get_svg_with_highlights(JSON.stringify({
            ...drawOptions,
            useMolBlockWedging: true,
          }));
          setSvgContent(svg);
          molWithH.delete();
        }
      } else {
        // Bond-line structure - skeletal formula
        drawOptions = {
          ...drawOptions,
          explicitMethyl: false,
        };
        const svg = mol.get_svg_with_highlights(JSON.stringify(drawOptions));
        setSvgContent(svg);
      }

      mol.delete();
      
      // Clear 3D viewer if exists
      if (viewerRef.current) {
        viewerRef.current = null;
      }
    } catch (err) {
      console.error("Error rendering molecule:", err);
      setError("Could not render molecule structure.");
    }
  };

  const render3D = async (smilesStr) => {
    if (!canvasRef.current) return;

    try {
      setSvgContent(null);
      
      // Clear previous viewer
      canvasRef.current.innerHTML = '';
      
      const viewerContainer = document.createElement('div');
      viewerContainer.style.width = '100%';
      viewerContainer.style.height = '100%';
      viewerContainer.style.position = 'relative';
      canvasRef.current.appendChild(viewerContainer);

      const viewer = $3Dmol.createViewer(viewerContainer, {
        backgroundColor: 'white',
      });

      // Use SDF from PubChem or generate from SMILES
      try {
        // First try to get 3D structure from PubChem
        const response = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smilesStr)}/SDF?record_type=3d`
        );
        
        if (response.ok) {
          const sdf = await response.text();
          viewer.addModel(sdf, "sdf");
        } else {
          // Fallback: generate basic 3D from SMILES
          const response2D = await fetch(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smilesStr)}/SDF`
          );
          if (response2D.ok) {
            const sdf = await response2D.text();
            viewer.addModel(sdf, "sdf");
          } else {
            throw new Error("Could not fetch molecular structure");
          }
        }
      } catch (fetchErr) {
        // If PubChem fails, try using RDKit to generate coordinates
        if (rdkit) {
          const mol = rdkit.get_mol(smilesStr);
          if (mol) {
            const molBlock = mol.get_molblock();
            viewer.addModel(molBlock, "mol");
            mol.delete();
          }
        }
      }

      viewer.setStyle({}, {
        stick: { 
          radius: 0.15,
          colorscheme: 'Jmol'
        },
        sphere: { 
          scale: 0.25,
          colorscheme: 'Jmol'
        }
      });
      
      viewer.zoomTo();
      viewer.render();
      viewer.spin(true);
      
      viewerRef.current = viewer;
    } catch (err) {
      console.error("Error rendering 3D:", err);
      setError("Could not render 3D structure. Try another visualization mode.");
    }
  };

  const handleReset = () => {
    if (viewerRef.current) {
      viewerRef.current.zoomTo();
      viewerRef.current.spin(true);
    }
  };

  const handleZoomIn = () => {
    if (viewerRef.current) {
      viewerRef.current.zoom(1.2);
    }
  };

  const handleZoomOut = () => {
    if (viewerRef.current) {
      viewerRef.current.zoom(0.8);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading chemistry library...</p>
      </div>
    );
  }

  if (!smiles) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center animate-pulse-slow">
          <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="12" r="3" />
            <line x1="9" y1="12" x2="15" y2="12" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">No Molecule Selected</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Select a molecule from the dropdown or enter a formula to visualize
          </p>
        </div>
      </div>
    );
  }

  // Render structural formula component
  if (mode === "structural" && smiles) {
    const actualSmiles = formula && FORMULA_TO_SMILES[formula.toUpperCase()] 
      ? FORMULA_TO_SMILES[formula.toUpperCase()] 
      : smiles;
    
    return (
      <div className="w-full h-full relative">
        <StructuralFormula smiles={actualSmiles} formula={formula} />
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-card/80 backdrop-blur-sm rounded-full text-xs font-medium text-muted-foreground border border-border/50">
          Structural Formula • All atoms shown with straight bonds
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Visualization Error</h3>
          <p className="text-muted-foreground text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* 3D Controls */}
      {mode === "3d" && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            className="w-9 h-9 bg-card/80 backdrop-blur-sm"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            className="w-9 h-9 bg-card/80 backdrop-blur-sm"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleReset}
            className="w-9 h-9 bg-card/80 backdrop-blur-sm"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Canvas Container */}
      <div
        ref={canvasRef}
        className="w-full h-full flex items-center justify-center"
        style={{ minHeight: "300px" }}
      >
        {svgContent && (
          <div
            className="animate-scale-in"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        )}
      </div>

      {/* Mode indicator */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-card/80 backdrop-blur-sm rounded-full text-xs font-medium text-muted-foreground border border-border/50">
        {mode === "lewis" && "Lewis Structure"}
        {mode === "bondline" && "Bond-line Structure"}
        {mode === "3d" && "3D Ball-and-stick Model • Drag to rotate"}
      </div>
    </div>
  );
}