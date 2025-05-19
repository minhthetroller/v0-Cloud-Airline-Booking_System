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
  const [contactEmail, setContactEmail] = useState<string | null>(null)

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
    const storedContactEmail = sessionStorage.getItem("contactEmail")

    if (storedBookingId) setBookingId(storedBookingId)
    if (storedBookingReference) setBookingReference(storedBookingReference)
    if (storedTotalPrice) setTotalPrice(Number.parseFloat(storedTotalPrice))
    if (storedPaymentId) setPaymentId(storedPaymentId)
    if (storedContactEmail) setContactEmail(storedContactEmail)

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
      // Get contact email from state or session storage
      const emailToUse = contactEmail || sessionStorage.getItem("contactEmail")

      if (!emailToUse) {
        console.error("No contact email found")

        // Try to get email from booking record if not in session storage
        if (bookingId) {
          const { data: bookingData, error: bookingError } = await supabaseClient
            .from("bookings")
            .select("contactemail")
            .eq("bookingid", bookingId)
            .single()

          if (!bookingError && bookingData && bookingData.contactemail) {
            console.log("Retrieved email from booking record:", bookingData.contactemail)
            setContactEmail(bookingData.contactemail)
            sessionStorage.setItem("contactEmail", bookingData.contactemail)
            return await sendConfirmationEmail(bookingId) // Retry with the retrieved email
          }
        }

        // If we still don't have an email, log the error but don't throw an exception
        console.error("Could not find contact email for confirmation")
        return
      }

      // Validate email format
      if (!emailToUse.includes("@") || !emailToUse.includes(".")) {
        console.error("Invalid email format:", emailToUse)
        return
      }

      console.log("Sending confirmation email to:", emailToUse)

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
          email: emailToUse,
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

        <Tabs
          defaultValue="card"
          onValueChange={(value) => setPaymentMethod(value as "card" | "bank")}
          className="max-w-2xl mx-auto"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="card" className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              Credit/Debit Card
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center">
              <Building className="mr-2 h-4 w-4" />
              Bank Transfer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card">
            <div className="bg-[#1a3a4a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Credit/Debit Card Payment</h2>

              <form onSubmit={handlePayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4111 1111 1111 1111"
                    maxLength={19}
                    required
                    className="bg-white text-black"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardName">Cardholder Name</Label>
                  <Input
                    id="cardName"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="bg-white text-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date (MM/YY)</Label>
                    <Input
                      id="expiryDate"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      required
                      className="bg-white text-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                      placeholder="123"
                      maxLength={3}
                      required
                      className="bg-white text-black"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <div className="flex items-center space-x-2">
                    <img src="/visa-logo-generic.png" alt="Visa" className="h-8" />
                    <img src="/mastercard-logo.png" alt="Mastercard" className="h-8" />
                    <img src="/amex-logo.png" alt="American Express" className="h-8" />
                    <img src="/generic-construction-logo.png" alt="JCB" className="h-8" />
                  </div>
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Processing..." : "Pay Now"}
                  </Button>
                </div>

                <p className="text-sm text-gray-300 mt-2">
                  For testing, use card number 4111 1111 1111 1111, any future expiry date, and any 3-digit CVV.
                </p>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="bank">
            <div className="bg-[#1a3a4a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Bank Transfer</h2>

              {bankQrShown ? (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <img src="/placeholder-1b948.png" alt="Bank transfer QR code" className="w-48 h-48" />
                  </div>

                  <div className="text-center mb-6">
                    <p className="font-bold">Scan this QR code with your banking app</p>
                    <p className="text-sm text-gray-300 mt-2">
                      Amount: {new Intl.NumberFormat("vi-VN").format(totalPrice || 1500000)} VND
                      <br />
                      Reference: {bookingReference || "Your booking reference"}
                    </p>
                  </div>

                  <Button onClick={handlePayment} className="bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Verifying Payment..." : "I've Completed the Transfer"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="mb-6 text-center">Generate a QR code to make a bank transfer using your banking app.</p>

                  <Button onClick={handleGenerateQr} className="bg-blue-600 hover:bg-blue-700">
                    Generate QR Code
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky bar at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            className="border-[#0f2d3c] text-[#0f2d3c]"
            onClick={() => router.push("/confirmation")}
          >
            Back to Confirmation
          </Button>

          <div className="text-xl font-bold text-[#0f2d3c]">
            Total: {new Intl.NumberFormat("vi-VN").format(totalPrice || 1500000)} VND
          </div>
        </div>
      </div>
    </main>
  )
}
