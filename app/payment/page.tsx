"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, CreditCard, Building, ArrowLeft, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import supabaseClient from "@/lib/supabase"

export default function PaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card")
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60) // 30 minutes in seconds
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [totalPrice, setTotalPrice] = useState<number>(0)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [totalPassengers, setTotalPassengers] = useState(1)

  // Card payment state
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")

  // Bank transfer state
  const [bankQrShown, setBankQrShown] = useState(false)

  useEffect(() => {
    // Get booking ID and reference from session storage
    const storedBookingId = sessionStorage.getItem("bookingId")
    const storedBookingReference = sessionStorage.getItem("bookingReference")
    const storedTotalPrice = sessionStorage.getItem("totalPrice")
    const storedPaymentId = sessionStorage.getItem("paymentId")
    const storedTotalPassengers = sessionStorage.getItem("totalPassengers")

    if (storedBookingId) setBookingId(storedBookingId)
    if (storedBookingReference) setBookingReference(storedBookingReference)
    if (storedTotalPrice) setTotalPrice(Number.parseFloat(storedTotalPrice))
    if (storedPaymentId) setPaymentId(storedPaymentId)
    if (storedTotalPassengers) setTotalPassengers(Number.parseInt(storedTotalPassengers, 10))

    // Create payment record in database
    const createPaymentRecord = async () => {
      try {
        setInitialLoading(true)

        // Get booking ID from session storage
        const storedBookingId = sessionStorage.getItem("bookingId")

        if (!storedBookingId) {
          console.error("No booking ID found in session storage")

          // Check if we need to redirect back to confirmation page
          const hasFlightData = sessionStorage.getItem("selectedDepartureFlight")

          if (hasFlightData) {
            // We have flight data but no booking ID, redirect to confirmation page
            setError("Booking information not found. Redirecting to confirmation page...")
            setTimeout(() => {
              router.push("/confirmation")
            }, 2000)
          } else {
            // No flight data either, redirect to home
            setError("No booking information found. Redirecting to home page...")
            setTimeout(() => {
              router.push("/")
            }, 2000)
          }

          setInitialLoading(false)
          return
        }

        // Check if we already have a payment ID
        if (storedPaymentId) {
          console.log("Using existing payment ID:", storedPaymentId)
          setInitialLoading(false)
          return
        }

        // Calculate expiration time (30 minutes from now)
        const now = new Date()
        const expirationTime = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes in milliseconds

        // Create payment record
        const { data, error } = await supabaseClient
          .from("payments")
          .insert({
            bookingid: storedBookingId,
            paymentdatetime: now.toISOString(),
            amount: storedTotalPrice ? Number.parseFloat(storedTotalPrice) : 0,
            currencycode: "VND",
            paymentmethod: "Pending",
            paymentstatus: "Pending",
          })
          .select()
          .single()

        if (error) {
          console.error("Error creating payment record:", error)
          setError("Failed to create payment record. Please try again.")
        } else {
          console.log("Payment record created:", data)
          setPaymentId(data.paymentid)
          sessionStorage.setItem("paymentId", data.paymentid)
        }
      } catch (err) {
        console.error("Error in payment creation:", err)
        setError("An error occurred while setting up payment. Please try again.")
      } finally {
        setInitialLoading(false)
      }
    }

    createPaymentRecord()

    // Set up timer
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer)
          // Handle payment expiration
          handlePaymentExpiration()
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handlePaymentExpiration = async () => {
    setError("Payment session has expired. Please try booking again.")

    // Update payment record to expired
    const currentPaymentId = paymentId || sessionStorage.getItem("paymentId")
    if (currentPaymentId) {
      try {
        await supabaseClient
          .from("payments")
          .update({
            paymentstatus: "Expired",
          })
          .eq("paymentid", currentPaymentId)
      } catch (err) {
        console.error("Error updating payment status:", err)
      }
    }
  }

  const sendConfirmationEmail = async (bookingId: string) => {
    try {
      const contactEmail = sessionStorage.getItem("contactEmail")

      if (!contactEmail) {
        console.error("No contact email found")
        return
      }

      // Validate email format
      if (!contactEmail.includes("@") || !contactEmail.includes(".")) {
        console.error("Invalid email format:", contactEmail)
        return
      }

      console.log("Sending confirmation email to:", contactEmail)

      // Get booking details
      const { data: bookingData, error: bookingError } = await supabaseClient
        .from("bookings")
        .select("*")
        .eq("bookingid", bookingId)
        .single()

      if (bookingError) {
        console.error("Error fetching booking details:", bookingError)
        return
      }

      // Get ticket details
      const { data: ticketsData, error: ticketsError } = await supabaseClient
        .from("tickets")
        .select(`
        *,
        flights(*),
        passengers(*),
        seats(*)
      `)
        .eq("bookingid", bookingId)

      if (ticketsError) {
        console.error("Error fetching ticket details:", ticketsError)
        return
      }

      if (!ticketsData || ticketsData.length === 0) {
        console.error("No tickets found for booking:", bookingId)
        return
      }

      console.log("Tickets data for email:", ticketsData)

      // Process tickets to ensure they have all required data
      const processedTickets = ticketsData.map((ticket) => {
        // Ensure passengers data is available
        if (!ticket.passengers) {
          ticket.passengers = { firstname: "Passenger", lastname: "" }
        }

        // Ensure flights data is available
        if (!ticket.flights) {
          ticket.flights = {
            flightnumber: "Unknown",
            departureairport: "Unknown",
            arrivalairport: "Unknown",
            departuretime: new Date().toISOString(),
          }
        }

        return ticket
      })

      // Send email using our API route
      const response = await fetch("/api/send-ticket-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: contactEmail,
          booking: bookingData,
          tickets: processedTickets,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error sending confirmation email:", errorData)
      } else {
        console.log("Confirmation email sent successfully")
      }
    } catch (err) {
      console.error("Error sending confirmation email:", err)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate payment information based on method
      if (paymentMethod === "card") {
        if (!cardNumber || !cardName || !expiryDate || !cvv) {
          throw new Error("Please fill in all card details")
        }
      }

      // Get the current payment ID
      const currentPaymentId = paymentId || sessionStorage.getItem("paymentId")

      // If no payment ID exists, create a new payment record
      if (!currentPaymentId) {
        if (!bookingId) {
          throw new Error("Booking information not found")
        }

        // Create a new payment record
        const { data, error } = await supabaseClient
          .from("payments")
          .insert({
            bookingid: bookingId,
            paymentdatetime: new Date().toISOString(),
            amount: totalPrice,
            currencycode: "VND",
            paymentmethod: paymentMethod === "card" ? "Credit Card" : "Bank Transfer",
            paymentstatus: "Completed",
            transactionid: `TXN${Math.floor(Math.random() * 1000000)}`,
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to process payment: ${error.message}`)
        }

        // Store the new payment ID
        setPaymentId(data.paymentid)
        sessionStorage.setItem("paymentId", data.paymentid)
      } else {
        // Update existing payment record
        const { error } = await supabaseClient
          .from("payments")
          .update({
            paymentmethod: paymentMethod === "card" ? "Credit Card" : "Bank Transfer",
            paymentstatus: "Completed",
            transactionid: `TXN${Math.floor(Math.random() * 1000000)}`,
          })
          .eq("paymentid", currentPaymentId)

        if (error) {
          throw new Error(`Failed to update payment: ${error.message}`)
        }
      }

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Send confirmation email
      if (bookingId) {
        await sendConfirmationEmail(bookingId)
      }

      // Redirect to ticket confirmation page instead of success page
      router.push("/ticket-confirmation")
    } catch (err: any) {
      console.error("Payment error:", err)
      setError(err.message || "Payment failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQr = () => {
    setBankQrShown(true)
  }

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  // Format expiry date (MM/YY)
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")

    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }

    return v
  }

  // Format time left
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      {/* Full width progress bar */}
      <div className="w-full bg-[#1a3a4a] py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between w-full">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                1
              </div>
              <span className="text-xs text-white mt-1">Passenger</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                2
              </div>
              <span className="text-xs text-white mt-1">Contact</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="text-xs text-white mt-1">Confirmation</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                4
              </div>
              <span className="text-xs text-white mt-1">Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-6">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="mr-4 text-white hover:text-gray-300 transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-white">Payment</h1>
          </div>
          <div className="flex items-center text-white">
            <Clock className="h-5 w-5 mr-2 text-yellow-400" />
            <span className="font-mono">{formatTimeLeft()}</span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-[#f8f5f0] rounded-lg p-6 mb-6 text-[#0f2d3c] max-w-2xl mx-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Total price</h2>
            <div className="text-right">
              <span className="text-sm">VND</span>
              <p className="text-2xl font-bold">{new Intl.NumberFormat("vi-VN").format(totalPrice || 1500000)}</p>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4 max-w-2xl mx-auto">Payment options</h2>

        <Tabs defaultValue="card" onValueChange={(value) => setPaymentMethod(value as "card" | "bank")}>
          <TabsList>
            <TabsTrigger value="card">
              <CreditCard className="h-5 w-5 mr-2" />
              Credit Card
            </TabsTrigger>
            <TabsTrigger value="bank">
              <Building className="h-5 w-5 mr-2" />
              Bank Transfer
            </TabsTrigger>
          </TabsList>
          <TabsContent value="card">
            {/* Card payment form */}
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardName">Card Name</Label>
                <Input
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  placeholder="MM/YY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  type="password"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Processing..." : "Pay Now"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="bank">
            {/* Bank transfer instructions */}
            <div className="space-y-4">
              <p>Please follow the instructions below to complete your bank transfer:</p>
              <Button onClick={handleGenerateQr} disabled={bankQrShown}>
                Generate QR Code
              </Button>
              {bankQrShown && (
                <div className="bg-white rounded-lg p-6">
                  {/* QR Code component */}
                  <p>QR Code will be displayed here</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
