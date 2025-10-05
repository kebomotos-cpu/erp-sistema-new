"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

// Root
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    data-slot="avatar"
    suppressHydrationWarning
    className={cn(
      // ⚠️ sem "size-8" para evitar conflito/ordem diferente no SSR
      "relative flex overflow-hidden h-20 w-20 rounded-lg",
      className
    )}
    {...props}
  />
))
Avatar.displayName = "Avatar"

// Image
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    data-slot="avatar-image"
    className={cn("h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

// Fallback (sem mismatch)
const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, children, ...props }, ref) => {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      data-slot="avatar-fallback"
      suppressHydrationWarning
      className={cn(
        "bg-muted text-foreground/70 flex h-full w-full items-center justify-center rounded-lg text-sm font-medium uppercase",
        className
      )}
      {...props}
    >
      {/* Render estável no SSR: espaço fino; client injeta iniciais depois */}
      {mounted ? children : "\u2009"}
    </AvatarPrimitive.Fallback>
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
