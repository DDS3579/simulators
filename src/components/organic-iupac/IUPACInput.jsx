import { useState } from "react";
import { FlaskConical, Play, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { IUPAC_EXAMPLES } from "../../lib/organic-iupac/iupacParser";

export function IUPACInput({ onParse, isLoading }) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onParse(inputValue.trim());
    }
  };

  const handleExampleClick = (name) => {
    setInputValue(name);
    onParse(name);
  };

  const handleClear = () => {
    setInputValue("");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-organic" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter IUPAC name (e.g., 3,3-diethylpentane)"
            className="pl-11 h-12 text-base bg-background border-organic/30 focus:border-organic focus:ring-organic/30"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex-1 h-11 bg-organic hover:bg-organic-dark text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Parse & Visualize
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="h-11 border-organic/30 hover:bg-organic/10"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Try these examples:</p>
        <div className="flex flex-wrap gap-2">
          {IUPAC_EXAMPLES.slice(0, 6).map((example) => (
            <button
              key={example.name}
              onClick={() => handleExampleClick(example.name)}
              className="px-3 py-1.5 text-sm rounded-full bg-organic/10 text-organic-dark hover:bg-organic/20 transition-colors border border-organic/20"
              title={example.description}
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}