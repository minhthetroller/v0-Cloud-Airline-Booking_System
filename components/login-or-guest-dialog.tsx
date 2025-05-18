"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LoginModal } from "@/components/login-modal"
import { useAuth } from "@/lib/auth-context"

export default function LoginOrGuestDialog() {
  const [open, setOpen] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()

  const flightId = searchParams.get("flightId")
  const returnFlightId = searchParams.get("returnFlightId")
  const passengers = searchParams.get("passengers")
  const totalPrice = searchParams.get("totalPrice")
  const selectedSeats = searchParams.get("selectedSeats")
  const returnSelectedSeats = searchParams.get("returnSelectedSeats")

  useEffect(() => {
    // If user is already logged in, redirect directly to guest information page
    if (!isLoading && user) {
      const queryParams = new URLSearchParams()
      if (flightId) queryParams.append("flightId", flightId)
      if (returnFlightId) queryParams.append("returnFlightId", returnFlightId)
      if (passengers) queryParams.append("passengers", passengers)
      if (totalPrice) queryParams.append("totalPrice", totalPrice)
      if (selectedSeats) queryParams.append("selectedSeats", selectedSeats)
      if (returnSelectedSeats) queryParams.append("returnSelectedSeats", returnSelectedSeats)

      router.push(`/guest-information?${queryParams.toString()}`)
    }
  }, [user, isLoading, router, flightId, returnFlightId, passengers, totalPrice, selectedSeats, returnSelectedSeats])

  const handleContinueAsGuest = () => {
    setOpen(false)

    const queryParams = new URLSearchParams()
    if (flightId) queryParams.append("flightId", flightId)
    if (returnFlightId) queryParams.append("returnFlightId", returnFlightId)
    if (passengers) queryParams.append("passengers", passengers)
    if (totalPrice) queryParams.append("totalPrice", totalPrice)
    if (selectedSeats) queryParams.append("selectedSeats", selectedSeats)
    if (returnSelectedSeats) queryParams.append("returnSelectedSeats", returnSelectedSeats)

    router.push(`/guest-information?${queryParams.toString()}`)
  }

  const handleLogin = () => {
    setShowLoginModal(true)
  }

  // Don't show the dialog if user is already logged in or still loading
  if (isLoading || user) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue Booking</DialogTitle>
            <DialogDescription>
              You can continue as a guest or log in to your account to access your saved information.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 mt-4">
            <Button onClick={handleLogin} variant="default">
              Log In
            </Button>
            <Button onClick={handleContinueAsGuest} variant="outline">
              Continue as Guest
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}
