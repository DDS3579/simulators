import { VISUALIZATION_MODES } from "../lib/molecules";
import { cn } from "../lib/utils";
import { Atom, GitBranch, Box, Minus } from "lucide-react";

const modeIcons = {
  structural: Minus,
  lewis: Atom,
  bondline: GitBranch,
  "3d": Box,
};

export function VisualizationModeSelector({
  mode,
  onModeChange,
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground/80">
        Visualization Mode
      </label>
      <div className="flex flex-wrap gap-2">
        {VISUALIZATION_MODES.map((vizMode) => {
          const Icon = modeIcons[vizMode.value];
          const isActive = mode === vizMode.value;

          return (
            <button
              key={vizMode.value}
              onClick={() => onModeChange(vizMode.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200",
                "hover:border-primary/50 hover:bg-secondary/50",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-card border-border/50 text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{vizMode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}