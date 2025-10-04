"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

// Avatar container
function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

// Avatar image
function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

// Avatar fallback seguro (sem erro de hidratação)
function AvatarFallback({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  // garantir que só renderize no client (evita mismatch SSR vs Client)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full font-medium text-sm uppercase",
        className
      )}
      {...props}
    >
      {mounted ? children : null}
    </AvatarPrimitive.Fallback>
  )
}

export { Avatar, AvatarImage, AvatarFallback }
