import { useState } from "react";
import { Beaker, Eye, List, Info, ZoomIn, ZoomOut } from "lucide-react";
import { IUPACInput } from "./IUPACInput";
import { ParsingSteps } from "./ParsingSteps";
import { IUPACVisualization } from "./IUPACVisualization";
import { parseIUPACName } from "../../lib/organic-iupac/iupacParser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

export function IUPACSection() {
  const [parsedMolecule, setParsedMolecule] = useState(null);
  const [visualizationMode, setVisualizationMode] = useState('structural');
  const [structuralSubType, setStructuralSubType] = useState('expanded');
  const [isAnimating, setIsAnimating] = useState(false);
  const [zoom, setZoom] = useState(100);

  const handleParse = (name) => {
    setIsAnimating(true);
    const result = parseIUPACName(name);
    setParsedMolecule(result);

    setTimeout(() => setIsAnimating(false), 1000);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 50));

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="glass-card-organic rounded-2xl p-4 sm:p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-organic" />
          Enter IUPAC Name
        </h2>
        <IUPACInput onParse={handleParse} />
      </div>

      {/* Error Display */}
      {parsedMolecule && !parsedMolecule.isValid && (
        <Alert variant="destructive" className="animate-fade-in">
          <Info className="h-4 w-4" />
          <AlertTitle>Parsing Error</AlertTitle>
          <AlertDescription>{parsedMolecule.error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Parsing Steps */}
        <div
          className="glass-card-organic rounded-2xl p-4 sm:p-6 min-w-0 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <List className="w-5 h-5 text-organic" />
            Parsing Steps
          </h2>
          <div className="max-h-[280px] sm:max-h-[400px] overflow-y-auto pr-2">
            <ParsingSteps
              steps={parsedMolecule?.parsingSteps || []}
              isAnimating={isAnimating}
            />
          </div>
        </div>

        {/* Visualization */}
        <div
          className="glass-card-organic rounded-2xl p-4 sm:p-6 min-w-0 animate-fade-in"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-organic" />
              Structure Visualization
            </h2>

            {/* Zoom Controls */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 border-organic/30"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-[160px] sm:min-w-[220px] max-w-full">
                <Slider
                  value={[zoom]}
                  onValueChange={([v]) => setZoom(v)}
                  min={50}
                  max={200}
                  step={10}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground w-10 shrink-0">{zoom}%</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 border-organic/30"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Visualization Mode Tabs */}
          <Tabs
            value={visualizationMode}
            onValueChange={(v) => setVisualizationMode(v)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-organic/10">
              <TabsTrigger
                value="structural"
                className="text-xs sm:text-sm data-[state=active]:bg-organic data-[state=active]:text-white"
              >
                Structural
              </TabsTrigger>
              <TabsTrigger
                value="bondline"
                className="text-xs sm:text-sm data-[state=active]:bg-organic data-[state=active]:text-white"
              >
                Bond-line
              </TabsTrigger>
              <TabsTrigger
                value="lewis"
                className="text-xs sm:text-sm data-[state=active]:bg-organic data-[state=active]:text-white"
              >
                Lewis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="structural" className="mt-4 space-y-3">
              {/* Condensed / Expanded Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Format:</span>
                <ToggleGroup
                  type="single"
                  value={structuralSubType}
                  onValueChange={(v) => v && setStructuralSubType(v)}
                  className="bg-organic/10 rounded-md p-0.5"
                >
                  <ToggleGroupItem
                    value="condensed"
                    className="text-xs px-3 py-1 h-7 data-[state=on]:bg-organic data-[state=on]:text-white"
                  >
                    Condensed
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="expanded"
                    className="text-xs px-3 py-1 h-7 data-[state=on]:bg-organic data-[state=on]:text-white"
                  >
                    Expanded
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="bg-card rounded-lg h-[340px] sm:h-[420px] md:h-[500px] min-w-0 flex items-start justify-start border border-organic/20 overflow-auto p-3 sm:p-4">
                <IUPACVisualization molecule={parsedMolecule} mode="structural" subType={structuralSubType} zoom={zoom} />
              </div>
            </TabsContent>

            <TabsContent value="bondline" className="mt-4">
              <div className="bg-card rounded-lg h-[340px] sm:h-[420px] md:h-[500px] min-w-0 flex items-start justify-start border border-organic/20 overflow-auto p-3 sm:p-4">
                <IUPACVisualization molecule={parsedMolecule} mode="bondline" zoom={zoom} />
              </div>
            </TabsContent>

            <TabsContent value="lewis" className="mt-4">
              <div className="bg-card rounded-lg h-[340px] sm:h-[420px] md:h-[500px] min-w-0 flex items-start justify-start border border-organic/20 overflow-auto p-3 sm:p-4">
                <IUPACVisualization molecule={parsedMolecule} mode="lewis" zoom={zoom} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Molecule Info Card */}
      {parsedMolecule?.isValid && (
        <div
          className="glass-card-organic rounded-2xl p-4 sm:p-6 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Beaker className="w-5 h-5 text-organic" />
            Molecule Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 sm:p-4 rounded-lg bg-organic/10">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-lg font-semibold text-organic-dark">{parsedMolecule.name}</p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-organic/10">
              <p className="text-sm text-muted-foreground">Formula</p>
              <p className="text-lg font-semibold text-organic-dark">{parsedMolecule.molecularFormula}</p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-organic/10">
              <p className="text-sm text-muted-foreground">Molecular Weight</p>
              <p className="text-lg font-semibold text-organic-dark">
                {parsedMolecule.molecularWeight.toFixed(2)} g/mol
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-organic/10">
              <p className="text-sm text-muted-foreground">Main Chain</p>
              <p className="text-lg font-semibold text-organic-dark">{parsedMolecule.parentCarbonCount} carbons</p>
            </div>
          </div>

          {parsedMolecule.substituents.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-organic/5 border border-organic/20">
              <p className="text-sm font-medium text-muted-foreground mb-2">Substituents:</p>
              <div className="flex flex-wrap gap-2">
                {parsedMolecule.substituents.map((sub, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-organic/20 text-organic-dark text-sm"
                  >
                    {sub.type} at C{sub.position}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parsedMolecule.functionalGroup.type !== 'none' && (
            <div className="mt-4 p-4 rounded-lg bg-organic/5 border border-organic/20">
              <p className="text-sm font-medium text-muted-foreground mb-2">Functional Group:</p>
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm">
                {parsedMolecule.functionalGroup.type} at position {parsedMolecule.functionalGroup.position}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}