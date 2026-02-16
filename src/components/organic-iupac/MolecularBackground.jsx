export function MolecularBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Gradient overlay */}
      <div className="absolute inset-0 gradient-molecule opacity-50" />
      
      {/* Floating molecules decoration */}
      <svg
        className="absolute top-10 left-10 w-32 h-32 text-primary/5 animate-float"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="30" cy="30" r="15" />
        <circle cx="70" cy="30" r="10" />
        <circle cx="70" cy="70" r="10" />
        <circle cx="30" cy="70" r="10" />
        <line x1="30" y1="30" x2="70" y2="30" stroke="currentColor" strokeWidth="4" />
        <line x1="70" y1="30" x2="70" y2="70" stroke="currentColor" strokeWidth="4" />
        <line x1="70" y1="70" x2="30" y2="70" stroke="currentColor" strokeWidth="4" />
        <line x1="30" y1="70" x2="30" y2="30" stroke="currentColor" strokeWidth="4" />
      </svg>

      <svg
        className="absolute bottom-20 right-20 w-48 h-48 text-accent/5 animate-float"
        style={{ animationDelay: "-2s" }}
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="50" cy="20" r="12" />
        <circle cx="25" cy="60" r="8" />
        <circle cx="75" cy="60" r="8" />
        <circle cx="50" cy="85" r="6" />
        <line x1="50" y1="32" x2="25" y2="52" stroke="currentColor" strokeWidth="3" />
        <line x1="50" y1="32" x2="75" y2="52" stroke="currentColor" strokeWidth="3" />
        <line x1="25" y1="68" x2="50" y2="79" stroke="currentColor" strokeWidth="3" />
        <line x1="75" y1="68" x2="50" y2="79" stroke="currentColor" strokeWidth="3" />
      </svg>

      <svg
        className="absolute top-1/3 right-10 w-24 h-24 text-primary/5 animate-float"
        style={{ animationDelay: "-4s" }}
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="50" cy="50" r="20" />
        <circle cx="20" cy="50" r="8" />
        <circle cx="80" cy="50" r="8" />
        <line x1="30" y1="50" x2="42" y2="50" stroke="currentColor" strokeWidth="3" />
        <line x1="58" y1="50" x2="72" y2="50" stroke="currentColor" strokeWidth="3" />
      </svg>

      {/* Large decorative ring */}
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 border-[40px] border-primary/[0.02] rounded-full animate-spin-slow"
      />
      
      <div
        className="absolute -top-20 -right-20 w-64 h-64 border-[30px] border-accent/[0.03] rounded-full animate-spin-slow"
        style={{ animationDirection: "reverse" }}
      />
    </div>
  );
}