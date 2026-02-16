import { useState } from "react";
import { ChevronDown, Search, FlaskConical } from "lucide-react";
import { PRESET_MOLECULES } from "../lib/molecules";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export function MoleculeSelector({
  onSelect,
  onCustomFormula,
  selectedMolecule,
}) {
  const [customFormula, setCustomFormula] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetSelect = (value) => {
    const molecule = PRESET_MOLECULES.find((m) => m.formula === value);
    if (molecule) {
      setIsCustom(false);
      onSelect(molecule);
    }
  };

  const handleCustomSubmit = () => {
    if (customFormula.trim()) {
      setIsCustom(true);
      onCustomFormula(customFormula.trim().toUpperCase());
    }
  };

  return (
    <div className="space-y-4">
      {/* Preset Molecules Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Common Molecules
        </label>
        <Select onValueChange={handlePresetSelect} value={isCustom ? "" : selectedMolecule?.formula}>
          <SelectTrigger className="w-full h-12 bg-card border-border/50 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              <SelectValue placeholder="Select a molecule..." />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {PRESET_MOLECULES.map((molecule) => (
              <SelectItem
                key={molecule.formula}
                value={molecule.formula}
                className="cursor-pointer hover:bg-secondary"
              >
                <div className="flex items-center justify-between w-full gap-4">
                  <span className="font-medium">{molecule.name}</span>
                  <span className="text-muted-foreground text-sm font-mono">
                    {molecule.formula}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Custom Formula Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Enter Custom Formula
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={customFormula}
              onChange={(e) => setCustomFormula(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
              placeholder="e.g., CH4, H2O, C2H5OH..."
              className="pl-10 h-12 bg-card border-border/50 focus:border-primary transition-colors font-mono"
            />
          </div>
          <Button
            onClick={handleCustomSubmit}
            className="h-12 px-6 gradient-primary hover:opacity-90 transition-opacity"
          >
            Visualize
          </Button>
        </div>
      </div>
    </div>
  );
}