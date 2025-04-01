"use client"

import * as React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Loader2, 
  Check, 
  FileText, 
  Sparkles, 
  BookOpen, 
  ImageIcon as IllustrationIcon, 
  Mail, 
  BookMarked
} from "lucide-react"

type ProgressStep = "validating" | "writing" | "illustrating" | "saving" | "complete" | "error"

export type StoryGenerationStatus = {
  step: ProgressStep
  error?: string
  detail?: string // General detail message for any step
  illustrationProgress?: {
    current: number
    total: number
    detail?: string
    previewUrl?: string // URL of the most recently generated illustration
  }
}

type StoryGenerationProgressProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: StoryGenerationStatus
  onEmailSubmit?: (email: string) => void
}

export function StoryGenerationProgress({
  open,
  onOpenChange,
  status,
  onEmailSubmit
}: StoryGenerationProgressProps) {
  const [email, setEmail] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [emailSubmitted, setEmailSubmitted] = React.useState(false)
  
  // Calculate progress percentage based on current step
  const calculateProgress = () => {
    if (status.step === "error") return 100 // Full bar but in red
    
    const stepPositions = {
      validating: 20,
      writing: 40,
      illustrating: 60,
      saving: 80,
      complete: 100
    }
    
    return stepPositions[status.step] || 0
  }
  
  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic email validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Call the parent handler if provided
    if (onEmailSubmit) {
      onEmailSubmit(email);
    }
    
    // Track email submission event with Meta Pixel
    if (typeof window !== 'undefined' && window.trackFBEvent) {
      window.trackFBEvent('Lead', {
        content_name: 'story_generation_email',
        content_category: 'story_creation'
      });
      console.log("Meta Pixel: Tracked Lead event for email collection");
    }
    
    // Simulate API call for now
    setTimeout(() => {
      setIsSubmitting(false);
      setEmailSubmitted(true);
    }, 800);
  };
  
  // Get icon and text for the current step
  const getStepInfo = (step: ProgressStep) => {
    const steps = {
      validating: {
        icon: <FileText className="h-6 w-6 text-primary" />,
        title: "Validating Information",
        description: "Checking character details and story parameters..."
      },
      writing: {
        icon: <BookOpen className="h-6 w-6 text-primary" />,
        title: "Writing Your Story",
        description: "Creating a unique tale with your characters..."
      },
      illustrating: {
        icon: <IllustrationIcon className="h-6 w-6 text-primary" />,
        title: "Generating Illustrations",
        description: status.illustrationProgress 
          ? `Creating image ${status.illustrationProgress.current} of ${status.illustrationProgress.total}${status.illustrationProgress.detail ? `: ${status.illustrationProgress.detail}` : ''}`
          : "Drawing beautiful images for each page..."
      },
      saving: {
        icon: <Sparkles className="h-6 w-6 text-primary" />,
        title: "Finalizing Your Story",
        description: "Saving everything and preparing your story book..."
      },
      complete: {
        icon: <BookMarked className="h-6 w-6 text-green-600" />,
        title: "Story Complete!",
        description: "Your magical story is ready to explore!"
      },
      error: {
        icon: <FileText className="h-6 w-6 text-destructive" />,
        title: "Oops! Something Went Wrong",
        description: status.error || "There was an error generating your story."
      }
    }
    
    return steps[step]
  }
  
  const currentStep = getStepInfo(status.step)
  const progressPercentage = calculateProgress()
  
  // Calculate which steps are completed
  const isStepComplete = (step: ProgressStep) => {
    const stepOrder = ["validating", "writing", "illustrating", "saving", "complete"];
    const currentIdx = stepOrder.indexOf(status.step);
    const stepIdx = stepOrder.indexOf(step);
    
    return stepIdx < currentIdx;
  }
  
  // Debug logs to check if preview URLs are reaching the component
  console.log("Progress Component Status Prop:", status);
  if (status.step === 'illustrating' && status.illustrationProgress) {
    const previewUrl = status.illustrationProgress.previewUrl;
    console.log("Illustrating - Preview URL Received by Component:", previewUrl);
    
    // Check if the URL is a valid data URL
    if (previewUrl) {
      if (previewUrl.startsWith('data:image/')) {
        console.log("Preview URL is a valid data URL");
        // Optionally check length to see if it's truncated
        console.log("Preview URL length:", previewUrl.length);
      } else if (previewUrl.startsWith('http')) {
        console.log("Preview URL is a valid HTTP URL");
        // We could add an image loader here to verify the URL works
        const img = new Image();
        img.onload = () => console.log("✅ Preview image loaded successfully");
        img.onerror = (err) => console.error("❌ Preview image failed to load:", err);
        img.src = previewUrl;
      } else {
        console.warn("Preview URL has an unexpected format:", previewUrl.substring(0, 30) + "...");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Creating Your Magical Story
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Current step visualization */}
          <div className="relative pt-12 pb-8 px-4">
            <div className="absolute w-full h-full inset-0 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 z-0"></div>
            
            {/* Center icon and animation */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <div className="h-24 w-24 rounded-full flex items-center justify-center bg-white shadow-md border">
                  {status.step === "illustrating" ? (
                    <div className="h-20 w-20 relative overflow-hidden rounded-full bg-muted">
                      {status.illustrationProgress?.previewUrl ? (
                        // Show the actual generated image when available
                        <div className="w-full h-full relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={status.illustrationProgress.previewUrl} 
                            alt={`Illustration ${status.illustrationProgress.current}`}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              console.error("Error loading image in central circle:", e);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-full border-2 border-primary/20"></div>
                          <div className="absolute bottom-1 right-1 bg-primary text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                            {status.illustrationProgress.current}
                          </div>
                        </div>
                      ) : (
                        // Show placeholder animation when no image is available yet
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse rounded-full"></div>
                          <IllustrationIcon className="h-8 w-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
                        </>
                      )}
                    </div>
                  ) : status.step === "writing" ? (
                    <div className="h-16 w-16 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary animate-pulse" />
                    </div>
                  ) : status.step === "complete" ? (
                    <div className="h-16 w-16 flex items-center justify-center bg-green-50 rounded-full">
                      <Check className="h-10 w-10 text-green-600" />
                    </div>
                  ) : status.step === "error" ? (
                    <div className="h-16 w-16 flex items-center justify-center bg-red-50 rounded-full">
                      <FileText className="h-10 w-10 text-destructive" />
                    </div>
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center">
                      {currentStep.icon}
                    </div>
                  )}
                </div>
                
                {/* Loading spinner ring */}
                {status.step !== "complete" && status.step !== "error" && (
                  <div className="absolute -inset-2">
                    <div className="w-28 h-28 rounded-full border-4 border-t-primary border-r-primary/30 border-b-primary/10 border-l-primary/50 animate-spin"></div>
                  </div>
                )}
              </div>
              
              <h3 className="mt-4 text-lg font-semibold">{currentStep.title}</h3>
              <p className="text-sm text-center text-muted-foreground mt-1">
                {status.detail || currentStep.description}
              </p>
            </div>
          </div>
          
          {/* Illustration progress - only show when relevant */}
          {status.step === "illustrating" && status.illustrationProgress && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Illustrations</span>
                <span className="text-sm font-medium">
                  {status.illustrationProgress.current}/{status.illustrationProgress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary"
                  style={{ 
                    width: `${(status.illustrationProgress.current / status.illustrationProgress.total) * 100}%`,
                    transition: "width 0.5s ease-in-out"
                  }}
                />
              </div>
              
              {/* Show detail text for illustration progress */}
              <div className="text-xs text-muted-foreground italic">
                {status.illustrationProgress.detail || "Generating illustration..."}
              </div>
            </div>
          )}
          
          {/* Steps progress tracker */}
          <div className="w-full">
            <div className="relative">
              {/* Progress bar */}
              <div className="absolute top-[14px] left-0 w-full h-0.5 bg-muted">
                <div 
                  className={`h-full ${status.step === "error" ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${progressPercentage}%`, transition: "width 0.5s ease-in-out" }}
                />
              </div>
              
              {/* Step indicators */}
              <div className="relative flex justify-between items-center">
                {(["validating", "writing", "illustrating", "saving", "complete"] as const).map((step, index) => {
                  const isActive = status.step === step;
                  const isDone = isStepComplete(step);
                  
                  return (
                    <div key={step} className="flex flex-col items-center">
                      <div className={`h-7 w-7 rounded-full z-10 flex items-center justify-center
                        ${isActive ? 'bg-primary text-white' : 
                          isDone ? 'bg-primary text-white' : 
                          'bg-muted'}`}>
                        {isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : isDone ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                        )}
                      </div>
                      <span className={`text-xs mt-2 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {step.charAt(0).toUpperCase() + step.slice(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Email collection form */}
          {(status.step === "writing" || status.step === "illustrating" || status.step === "validating") && !emailSubmitted && (
            <div className="bg-muted/30 rounded-lg p-4 border mt-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium">Story generation can take several minutes</h4>
                    <p className="text-xs text-muted-foreground">Get notified when your story is ready</p>
                  </div>
                </div>
                
                <form onSubmit={handleSubmitEmail} className="flex mt-2 gap-2 items-center">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-8 text-sm flex-grow"
                    required
                  />
                  <Button 
                    type="submit" 
                    size="sm"
                    className="h-8 py-0 px-3"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span>Notify Me</span>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}
          
          {/* Email submitted confirmation */}
          {emailSubmitted && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-100 mt-4 flex items-start">
              <Check className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-green-800">We'll email you when your story is ready!</h4>
                <p className="text-xs text-green-700">Sent to: {email}</p>
              </div>
            </div>
          )}
          
          {/* Error state */}
          {status.step === "error" && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm space-y-3">
              <p>{status.error || "Something went wrong during story generation. Please try again."}</p>
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          )}
          
          {/* Complete state */}
          {status.step === "complete" && (
            <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-md text-green-800 text-sm space-y-3">
              <p>Your story has been created successfully! Redirecting you to your story...</p>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-progress"></div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}