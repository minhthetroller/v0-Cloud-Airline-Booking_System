"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { createBooking, createTicketsForBooking, updateSeatOccupancy } from "@/lib/booking-actions"

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const flightId = searchParams.get("flightId")
  const returnFlightId = searchParams.get("returnFlightId")
  const passengers = searchParams.get("passengers")
  const selectedSeats = searchParams.get("selectedSeats")
  const returnSelectedSeats = searchParams.get("returnSelectedSeats")
  const totalPrice = searchParams.get("totalPrice")
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const supabase = createClientComponentClient()

  const handlePayment = async () => {
    if (!flightId || !passengers) {
      console.error("Missing required parameters")
      return
    }

    setIsProcessing(true)

    try {
      // Parse passengers data
      const parsedPassengers = JSON.parse(decodeURIComponent(passengers))

      // Create booking
      const bookingId = await createBooking(
        flightId,
        returnFlightId || null,
        parsedPassengers[0].email,
        parsedPassengers[0].phone,
        Number(totalPrice),
        "Credit Card",
      )

      if (!bookingId) {
        throw new Error("Failed to create booking")
      }

      // Update seat occupancy for outbound flight
      if (selectedSeats) {
        const parsedSeats = JSON.parse(decodeURIComponent(selectedSeats))
        await updateSeatOccupancy(flightId, parsedSeats, bookingId)
      }

      // Update seat occupancy for return flight if exists
      if (returnFlightId && returnSelectedSeats) {
        const parsedReturnSeats = JSON.parse(decodeURIComponent(returnSelectedSeats))
        await updateSeatOccupancy(returnFlightId, parsedReturnSeats, bookingId)
      }

      // Create tickets for all passengers
      await createTicketsForBooking(bookingId, parsedPassengers, flightId, returnFlightId || null)

      // Redirect to booking success page
      router.push(`/booking-success?bookingId=${bookingId}`)
    } catch (error) {
      console.error("Payment processing error:", error)
      setIsProcessing(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length > 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }
    return value
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Payment</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="card">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card">Credit Card</TabsTrigger>
              <TabsTrigger value="paypal" disabled>
                PayPal
              </TabsTrigger>
              <TabsTrigger value="apple" disabled>
                Apple Pay
              </TabsTrigger>
            </TabsList>
            <TabsContent value="card">
              <Card>
                <CardHeader>
                  <CardTitle>Credit Card Payment</CardTitle>
                  <CardDescription>Enter your credit card details below</CardDescription>
                  <div className="flex space-x-2 mt-2">
                    <Image src="/visa-logo-generic.png" alt="Visa" width={40} height={25} />
                    <Image src="/mastercard-logo.png" alt="Mastercard" width={40} height={25} />
                    <Image src="/amex-logo.png" alt="American Express" width={40} height={25} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Cardholder Name</Label>
                    <Input
                      id="name"
                      placeholder="John Smith"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Card Number</Label>
                    <Input
                      id="number"
                      placeholder="4111 1111 1111 1111"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                        maxLength={4}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={handlePayment}
                    disabled={isProcessing || !cardNumber || !cardName || !expiryDate || !cvv}
                  >
                    {isProcessing ? "Processing..." : `Pay $${totalPrice || "0"}`}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${Number(totalPrice) * 0.9 || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes & Fees</span>
                  <span>${Number(totalPrice) * 0.1 || 0}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${totalPrice || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
