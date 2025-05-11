"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronRight, AlertCircle, Check, Printer } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"

interface SelectedFlightDetails {
  flightId: number
  class: string
  fareType: string
  price: number
  flightNumber?: string
  departureTime?: string
  arrivalTime?: string
  departureAirport?: string
  arrivalAirport?: string
  duration?: string
}

interface Seat {
  seatid: number
  airplanetypeid: number
  seatnumber: string
  classid: number
  seattype: string
  isoccupied?: boolean
}

interface CustomerInfo {
  name: string
  email: string
  phone: string
}

export default function ConfirmationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departureFlight, setDepartureFlight] = useState<SelectedFlightDetails | null>(null)
  const [returnFlight, setReturnFlight] = useState<SelectedFlightDetails | null>(null)
  const [departureSeat, setDepartureSeat] = useState<Seat | null>(null)
  const [returnSeat, setReturnSeat] = useState<Seat | null>(null)
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [bookingReference, setBookingReference] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is logged in
    const loggedIn = sessionStorage.getItem("isLoggedIn") === "true"
    const email = sessionStorage.getItem("userEmail")

    setIsLoggedIn(loggedIn)
    setUserEmail(email)

    // Load flight and seat details from session storage
    const loadBookingDetails = async () => {
      try {
        setLoading(true)

        // Load flight details
        const departureFlightData = sessionStorage.getItem("selectedDepartureFlight")
        const returnFlightData = sessionStorage.getItem("selectedReturnFlight")

        if (!departureFlightData) {
          throw new Error("No departure flight selected")
        }

        const parsedDepartureFlight = JSON.parse(departureFlightData)
        setDepartureFlight(parsedDepartureFlight)

        if (returnFlightData) {
          setReturnFlight(JSON.parse(returnFlightData))
          setIsRoundTrip(true)
        }

        // Load seat details
        const departureSeatData = sessionStorage.getItem("selectedDepartureSeat")
        const returnSeatData = sessionStorage.getItem("selectedReturnSeat")

        if (!departureSeatData) {
          throw new Error("No departure seat selected")
        }

        setDepartureSeat(JSON.parse(departureSeatData))

        if (returnSeatData) {
          setReturnSeat(JSON.parse(returnSeatData))
        }

        // Generate a booking reference
        setBookingReference(generateBookingReference())

        // If logged in, fetch customer info
        if (loggedIn && email) {
          // In a real app, fetch customer info from database
          // For now, use mock data
          setCustomerInfo({
            name: "John Doe",
            email: email,
            phone: "+1234567890",
          })
        } else {
          // For guest users, use data from session storage if available
          const guestInfo = sessionStorage.getItem("guestInfo")
          if (guestInfo) {
            setCustomerInfo(JSON.parse(guestInfo))
          }
        }
      } catch (err: any) {
        console.error("Error loading booking details:", err)
        setError(err.message || "Failed to load booking details")
      } finally {
        setLoading(false)
      }
    }

    loadBookingDetails()
  }, [])

  // Generate a random booking reference
  const generateBookingReference = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Calculate total price
  const calculateTotalPrice = () => {
    let total = 0
    if (departureFlight) {
      total += departureFlight.price
    }
    if (returnFlight) {
      total += returnFlight.price
    }
    return total
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  const handleContinueToPayment = () => {
    router.push("/payment")
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/results")} className="mt-4">
          Return to Flight Selection
        </Button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Booking Confirmation</h1>
            <Button variant="outline" onClick={handlePrint} className="border-white text-white">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </header>

        {/* Booking Reference */}
        <section className="mb-6 bg-green-600 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="h-6 w-6 mr-2" />
            <div>
              <h2 className="text-xl font-bold">Booking Reference: {bookingReference}</h2>
              <p>Please save this reference for your records</p>
            </div>
          </div>
        </section>

        {/* Customer Info */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Customer Information</h2>
          {customerInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-medium">Name</p>
                <p>{customerInfo.name}</p>
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p>{customerInfo.email}</p>
              </div>
              <div>
                <p className="font-medium">Phone</p>
                <p>{customerInfo.phone}</p>
              </div>
            </div>
          ) : (
            <p>Customer information not available</p>
          )}
        </section>

        {/* Departure Flight */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Departure Flight</h2>
          {departureFlight && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Flight Number</p>
                <p>{departureFlight.flightNumber}</p>
                <p className="font-medium mt-2">Route</p>
                <p>
                  {departureFlight.departureAirport} → {departureFlight.arrivalAirport}
                </p>
                <p className="font-medium mt-2">Date & Time</p>
                <p>
                  {departureFlight.departureTime &&
                    format(new Date(departureFlight.departureTime), "MMM d, yyyy HH:mm")}
                </p>
              </div>
              <div>
                <p className="font-medium">Class</p>
                <p>{departureFlight.fareType}</p>
                <p className="font-medium mt-2">Seat</p>
                <p>{departureSeat?.seatnumber || "Not selected"}</p>
                <p className="font-medium mt-2">Price</p>
                <p>{formatCurrency(departureFlight.price)} VND</p>
              </div>
            </div>
          )}
        </section>

        {/* Return Flight (if round trip) */}
        {isRoundTrip && returnFlight && (
          <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Return Flight</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Flight Number</p>
                <p>{returnFlight.flightNumber}</p>
                <p className="font-medium mt-2">Route</p>
                <p>
                  {returnFlight.departureAirport} → {returnFlight.arrivalAirport}
                </p>
                <p className="font-medium mt-2">Date & Time</p>
                <p>{returnFlight.departureTime && format(new Date(returnFlight.departureTime), "MMM d, yyyy HH:mm")}</p>
              </div>
              <div>
                <p className="font-medium">Class</p>
                <p>{returnFlight.fareType}</p>
                <p className="font-medium mt-2">Seat</p>
                <p>{returnSeat?.seatnumber || "Not selected"}</p>
                <p className="font-medium mt-2">Price</p>
                <p>{formatCurrency(returnFlight.price)} VND</p>
              </div>
            </div>
          </section>
        )}

        {/* Total Price */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Total Price</h2>
            <p className="text-2xl font-bold">{formatCurrency(calculateTotalPrice())} VND</p>
          </div>
        </section>
      </div>

      {/* Sticky bar at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="text-xl font-bold text-[#0f2d3c]">Total: {formatCurrency(calculateTotalPrice())} VND</div>
          <Button className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90" onClick={handleContinueToPayment}>
            Continue to Payment
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  )
}
