"use client"

import * as React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Wand2, BookOpen, Check, Loader2, X } from "lucide-react"

type FeatureNotificationProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  featureName: string
}

export function FeatureNotification({
  open,
  onOpenChange,
  title,
  description,
  featureName
}: FeatureNotificationProps) {
  const [step, setStep] = React.useState<"intro" | "email" | "success" | "error">("intro")
  const [email, setEmail] = React.useState("")
  const [emailSubmitted, setEmailSubmitted] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      // Reset state after closing animation completes
      const timeout = setTimeout(() => {
        setStep("intro")
        setEmail("")
        setEmailSubmitted(false)
        setIsSubmitting(false)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [open])

  const handleNextStep = () => {
    setStep("email")
  }

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic email validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setEmailSubmitted(true)
      setStep("success")

      // In a real implementation, we would call an API here:
      // try {
      //   await fetch('/api/notify-me', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({
      //       email,
      //       featureName,
      //     }),
      //   })
      //   setStep("success")
      // } catch (error) {
      //   setStep("error")
      // } finally {
      //   setIsSubmitting(false)
      // }
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "intro" && <Sparkles className="h-5 w-5 text-primary" />}
            {step === "email" && <Wand2 className="h-5 w-5 text-primary" />}
            {step === "success" && <Check className="h-5 w-5 text-green-500" />}
            {step === "error" && <X className="h-5 w-5 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {step === "intro" && (
          <div className="flex flex-col items-center py-4">
            <BookOpen className="h-16 w-16 text-primary mb-4" />
            <p className="text-center mb-6">
              We're working on adding {featureName} to make your stories even more amazing!
            </p>
            <Button onClick={handleNextStep}>Get notified when it's ready</Button>
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleSubmitEmail} className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm">
                Enter your email to be notified when this feature is available.
              </p>
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={emailSubmitted || isSubmitting}
                required
              />
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={emailSubmitted || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Notify Me"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center py-4">
            <Check className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-center mb-6">
              Thanks! We'll notify you at <strong>{email}</strong> when this feature is ready.
            </p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center py-4">
            <X className="h-16 w-16 text-destructive mb-4" />
            <p className="text-center mb-6">
              Something went wrong. Please try again later.
            </p>
            <Button onClick={() => setStep("email")} variant="outline">Try Again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}