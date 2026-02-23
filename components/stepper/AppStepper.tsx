import { useOcrTemplate } from '@/contexts/OcrTemplateContexts';
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from '@/components/ui/stepper';

type Step = {
  value: number;
  label?: string;
  content: React.ReactNode;
};

type AppStepperProps = {
  steps: Step[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
};

export default function AppStepper({ steps, currentStep, setCurrentStep }: AppStepperProps) {  
  return (
    <Stepper value={currentStep} className="space-y-8">
        <StepperNav>
            {steps.map((step, index) => (
            <StepperItem key={step.value} step={step.value}>
                <StepperTrigger>
                  <StepperIndicator className="
                      data-[state=completed]:bg-blue-300 
                      data-[state=completed]:text-white 
                      data-[state=active]:bg-orange-300 
                      data-[state=active]:text-primary-foreground 
                      data-[state=inactive]:bg-gray-300
                      data-[state=inactive]:text-gray-500
                  ">
                      {step.value}
                  </StepperIndicator>
                </StepperTrigger>
                {index < steps.length - 1 && <StepperSeparator className="bg-gray-300 group-data-[state=completed]/step:bg-blue-300" />}
            </StepperItem>
            ))}
        </StepperNav>

        <StepperPanel className="text-sm">
            {steps.map((step) => (
            <StepperContent 
                className="w-full min-h-full" 
                key={step.value} 
                value={step.value}
            >
                {step.content}
            </StepperContent>
            ))}
        </StepperPanel>
    </Stepper>
  );
}
