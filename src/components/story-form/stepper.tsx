import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface Step {
  title: string;
  description: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  isNextDisabled?: boolean;
  isBackDisabled?: boolean;
  showSubmit?: boolean;
  isSubmitLoading?: boolean;
}

export function Stepper({
  steps,
  currentStep,
  onNext,
  onBack,
  isNextDisabled = false,
  isBackDisabled = false,
  showSubmit = false,
  isSubmitLoading = false,
}: StepperProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="w-full">
      {/* Progress Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium">
            {Math.round(progress)}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-[#A891ED] transition-all duration-300 ease-in-out  "
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Title and Description */}
        <div className="mt-6 mb-2">
          <h2 className="text-2xl sm:text-4xl md:text-4xl font-bold text-center">
            {steps[currentStep].title}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-md text-center mt-2">
            {steps[currentStep].description}
          </p>
        </div>
      </div>
    </div>
  );
}
