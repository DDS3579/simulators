import { CheckCircle2, XCircle, AlertCircle, ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

export function ParsingSteps({ steps, isAnimating }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-organic" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'success':
        return 'bg-organic/10 border-organic/30';
      case 'error':
        return 'bg-destructive/10 border-destructive/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
    }
  };

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Enter an IUPAC name to see the parsing steps</p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={steps.map((_, i) => `step-${i}`)} className="space-y-2">
      {steps.map((step, index) => (
        <AccordionItem
          key={`step-${index}`}
          value={`step-${index}`}
          className={`rounded-lg border ${getStatusBg(step.status)} overflow-hidden transition-all duration-300`}
          style={{
            animationDelay: isAnimating ? `${index * 150}ms` : '0ms',
          }}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3 text-left">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-organic/20 text-organic font-bold text-sm">
                {step.step}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{step.title}</h4>
              </div>
              {getStatusIcon(step.status)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="pl-11 space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              <div className={`p-3 rounded-md text-sm font-mono whitespace-pre-line leading-relaxed ${
                step.status === 'success' ? 'bg-organic/5 text-organic-dark' :
                step.status === 'error' ? 'bg-destructive/5 text-destructive' :
                'bg-yellow-500/5 text-yellow-700'
              }`}>
                {step.result}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}