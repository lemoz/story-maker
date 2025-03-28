"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { FeatureNotification } from "@/components/feature-notification"

type ComingSoonFeatureProps = {
  title: string
  description: string
  featureName: string
  buttonText?: string
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
}

export function ComingSoonFeature({
  title,
  description,
  featureName,
  buttonText = "Coming Soon",
  variant = "secondary"
}: ComingSoonFeatureProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        variant={variant}
      >
        {buttonText}
      </Button>
      
      <FeatureNotification
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        featureName={featureName}
      />
    </>
  )
}