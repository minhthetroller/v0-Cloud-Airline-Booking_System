"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, ArrowLeft } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface Passenger {
  id: number
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  passportNumber: string
}

interface Seat {
  seat_id: string
  seat_number: string
  seat_class: string
  price: number
  isReturn: boolean
}

interface Flight {
  id: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_time: string
  arrival_time: string
  airline: string
  price: number
}

export default function ConfirmationPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [departureFlight, setDepartureFlight] = useState<Flight | null>(null)
  const [returnFlight, setReturnFlight] = useState<Flight | null>(null)
  const [contactInfo, setContactInfo] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPrice, setTotalPrice] = useState<number>(0)
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [bookingReference, setBookingReference] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [existingBookingId, setExistingBookingId] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        // Get passenger information
        const storedPassengers = sessionStorage.getItem("passengers")
        if (storedPassengers) {
          setPassengers(JSON.parse(storedPassengers))
        }

        // Get selected seats
        const storedSeats = sessionStorage.getItem("selectedSeats")
        if (storedSeats) {
          setSelectedSeats(JSON.parse(storedSeats))
        }

        // Get contact information
        const storedContactInfo = sessionStorage.getItem("contactInfo")
        if (storedContactInfo) {
          setContactInfo(JSON.parse(storedContactInfo))
        }

        // Get flight details
        const departureFightId = sessionStorage.getItem("selectedDepartureFlight")
        const returnFlightId = sessionStorage.getItem("selectedReturnFlight")

        if (departureFightId) {
          const { data: departureData, error: departureError } = await supabase
            .from("flights")
            .select("*")
            .eq("id", departureFightId)
            .single()

          if (departureError) throw departureError
          setDepartureFlight(departureData)
        }

        if (returnFlightId) {
          const { data: returnData, error: returnError } = await supabase
            .from("flights")
            .select("*")
            .eq("id", returnFlightId)
            .single()

          if (returnError) throw returnError
          setReturnFlight(returnData)
          setIsRoundTrip(true)
        }

        // Calculate total price
        calculateTotalPrice()
      } catch (error: any) {
        console.error("Error fetching booking details:", error.message)
        setError("Failed to load booking details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [supabase])

  useEffect(() => {
    calculateTotalPrice()
  }, [departureFlight, returnFlight, selectedSeats])

  const calculateTotalPrice = () => {
    let total = 0

    // Add seat prices
    if (selectedSeats && selectedSeats.length > 0) {
      total += selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
    }

    setTotalPrice(total)
  }

  const handleContinue = () => {
    // Store total price in session storage
    sessionStorage.setItem("totalPrice", totalPrice.toString())

    // Navigate to payment page
    router.push("/payment")
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading booking details...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="w-full bg-[#1a3a4a] py-4">
        <div className="container mx-auto px-4">
          {/* Progress Steps - Now full width */}
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
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="text-xs text-white mt-1">Confirmation</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                4
              </div>
              <span className="text-xs text-white mt-1">Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-start max-w-2xl mx-auto mb-8">
          <button onClick={() => router.back()} className="mr-4 text-white hover:text-gray-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Booking Confirmation</h1>
        </div>

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

        {/* Passenger Information */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Passenger Information</h2>
          {passengers.map((passenger) => (
            <div key={passenger.id} className="mb-4">
              <h3 className="font-medium">Passenger {passenger.id}</h3>
              <p>
                Name: {passenger.firstName} {passenger.lastName}
              </p>
              <p>Date of Birth: {passenger.dateOfBirth}</p>
              <p>Nationality: {passenger.nationality}</p>
              <p>Passport Number: {passenger.passportNumber}</p>
            </div>
          ))}
        </section>

        {/* Contact Information */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Contact Information</h2>
          {contactInfo && (
            <>
              <p>Name: {contactInfo.name}</p>
              <p>Email: {contactInfo.email}</p>
              <p>Phone: {contactInfo.phone}</p>
            </>
          )}
        </section>

        {/* Departure Flight */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Departure Flight</h2>
          {departureFlight && (
            <>
              <p>Flight Number: {departureFlight.flight_number}</p>
              <p>Airline: {departureFlight.airline}</p>
              <p>From: {departureFlight.departure_airport}</p>
              <p>To: {departureFlight.arrival_airport}</p>
              <p>Departure: {new Date(departureFlight.departure_time).toLocaleString()}</p>
              <p>Arrival: {new Date(departureFlight.arrival_time).toLocaleString()}</p>
              <div className="mt-2">
                <h3 className="font-medium">Selected Seats:</h3>
                <ul>
                  {selectedSeats
                    .filter((seat) => !seat.isReturn)
                    .map((seat, index) => (
                      <li key={index}>
                        Passenger {index + 1}: Seat {seat.seat_number} ({seat.seat_class})
                      </li>
                    ))}
                </ul>
              </div>
            </>
          )}
        </section>

        {isRoundTrip && returnFlight && (
          <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Return Flight</h2>
            <p>Flight Number: {returnFlight.flight_number}</p>
            <p>Airline: {returnFlight.airline}</p>
            <p>From: {returnFlight.departure_airport}</p>
            <p>To: {returnFlight.arrival_airport}</p>
            <p>Departure: {new Date(returnFlight.departure_time).toLocaleString()}</p>
            <p>Arrival: {new Date(returnFlight.arrival_time).toLocaleString()}</p>
            <div className="mt-2">
              <h3 className="font-medium">Selected Seats:</h3>
              <ul>
                {selectedSeats
                  .filter((seat) => seat.isReturn)
                  .map((seat, index) => (
                    <li key={index}>
                      Passenger {index + 1}: Seat {seat.seat_number} ({seat.seat_class})
                    </li>
                  ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      <div className="mt-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Price Summary</h2>
        <p className="text-lg font-bold">Total Price: {totalPrice.toLocaleString("vi-VN")} VND</p>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={handleContinue}>Proceed to Payment</Button>
      </div>
    </main>
  )
}
