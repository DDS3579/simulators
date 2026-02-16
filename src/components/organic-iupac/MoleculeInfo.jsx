import { Beaker, Scale, FileText } from "lucide-react";

export function MoleculeInfo({ molecule, customFormula }) {
  if (!molecule && !customFormula) return null;

  return (
    <div className="glass-card rounded-xl p-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Beaker className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Name</p>
            <p className="font-semibold text-foreground">
              {molecule?.name || "Custom Molecule"}
            </p>
          </div>
        </div>

        {/* Formula */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Formula</p>
            <p className="font-mono font-semibold text-foreground">
              {molecule?.formula || customFormula}
            </p>
          </div>
        </div>

        {/* Molecular Weight */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Molecular Weight
            </p>
            <p className="font-semibold text-foreground">
              {molecule?.molecularWeight
                ? `${molecule.molecularWeight.toFixed(2)} g/mol`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {molecule?.description && (
        <p className="mt-4 text-sm text-muted-foreground border-t border-border/50 pt-4">
          {molecule.description}
        </p>
      )}
    </div>
  );
}