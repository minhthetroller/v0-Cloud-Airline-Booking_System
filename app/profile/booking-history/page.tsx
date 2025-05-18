"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Calendar, Plane, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import supabaseClient from "@/lib/supabase"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import BookingDetailsModal from "@/components/booking-details-modal"

interface Booking {
  bookingid: string
  bookingreference: string
  bookingdatetime: string
  totalprice: number
  currencycode: string
  bookingstatus: string
  flights: {
    flightnumber: string
    departureairport: string
    arrivalairport: string
    departuredatetime: string
    status: string
  }[]
}

export default function BookingHistoryPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    const fetchBookingHistory = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get user ID from auth context
        if (!user?.email) {
          throw new Error("User email not found")
        }

        // Get user record from users table
        const { data: userData, error: userError } = await supabaseClient
          .from("users")
          .select("userid")
          .eq("username", user.email)
          .single()

        if (userError) {
          throw new Error(`Error fetching user data: ${userError.message}`)
        }

        // Get bookings for this user
        const { data: bookingsData, error: bookingsError } = await supabaseClient
          .from("bookings")
          .select("*")
          .eq("userid", userData.userid)
          .order("bookingdatetime", { ascending: false })

        if (bookingsError) {
          throw new Error(`Error fetching bookings: ${bookingsError.message}`)
        }

        // For each booking, get the associated flights
        const bookingsWithFlights = await Promise.all(
          bookingsData.map(async (booking: any) => {
            // Get tickets for this booking
            const { data: ticketsData, error: ticketsError } = await supabaseClient
              .from("tickets")
              .select("flightid")
              .eq("bookingid", booking.bookingid)

            if (ticketsError) {
              console.error(`Error fetching tickets for booking ${booking.bookingid}:`, ticketsError)
              return {
                ...booking,
                flights: [],
              }
            }

            // Get flight details for each ticket
            const flightIds = ticketsData.map((ticket: any) => ticket.flightid)
            const { data: flightsData, error: flightsError } = await supabaseClient
              .from("flights")
              .select("*")
              .in("flightid", flightIds)

            if (flightsError) {
              console.error(`Error fetching flights for booking ${booking.bookingid}:`, flightsError)
              return {
                ...booking,
                flights: [],
              }
            }

            return {
              ...booking,
              flights: flightsData,
            }
          }),
        )

        setBookings(bookingsWithFlights)
      } catch (err: any) {
        console.error("Error fetching booking history:", err)
        setError(err.message || "Failed to load booking history")
      } finally {
        setLoading(false)
      }
    }

    fetchBookingHistory()
  }, [isAuthenticated, router, user])

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
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
        <Button onClick={() => router.push("/profile")} className="mt-4">
          Return to Profile
        </Button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/profile" className="mr-4 text-white hover:text-gray-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-3xl font-bold">Booking History</h1>
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.bookingid} className="bg-[#1a3a4a] rounded-lg overflow-hidden">
                <div className="bg-[#0a1e29] p-4 flex justify-between items-center">
                  <div>
                    <p className="text-gray-400">Booking Reference</p>
                    <p className="text-xl font-bold">{booking.bookingreference}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400">Booking Date</p>
                    <p>{format(new Date(booking.bookingdatetime), "MMM d, yyyy")}</p>
                  </div>
                </div>

                <div className="p-4">
                  {booking.flights.map((flight, index) => (
                    <div key={index} className="mb-4 pb-4 border-b border-[#2a4a5a] last:border-0 last:mb-0 last:pb-0">
                      <div className="flex items-center mb-2">
                        <Plane className="mr-2 h-4 w-4 text-[#9b6a4f]" />
                        <span className="font-medium">{flight.flightnumber}</span>
                        <span
                          className={`ml-auto px-2 py-1 rounded-full text-xs ${
                            flight.status === "Confirmed"
                              ? "bg-green-500/20 text-green-500"
                              : flight.status === "Cancelled"
                                ? "bg-red-500/20 text-red-500"
                                : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {flight.status}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div>
                          <p className="font-medium">
                            {flight.departureairport} → {flight.arrivalairport}
                          </p>
                          <div className="flex items-center mt-1 text-sm text-gray-400">
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(flight.departuredatetime), "MMM d, yyyy HH:mm")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#2a4a5a]">
                    <div>
                      <p className="text-gray-400">Total Price</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(booking.totalprice, booking.currencycode)} {booking.currencycode}
                      </p>
                    </div>
                    <BookingDetailsModal bookingId={booking.bookingid}>
                      <Button variant="outline" className="border-[#9b6a4f] text-[#9b6a4f]">
                        View Details
                      </Button>
                    </BookingDetailsModal>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#1a3a4a] rounded-lg">
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto text-gray-500"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h4 className="text-xl font-bold mb-2">No Bookings Found</h4>
            <p className="text-gray-400 mb-6">You don't have any bookings in our system yet.</p>
            <Link href="/">
              <Button className="bg-[#9b6a4f] hover:bg-[#9b6a4f]/90">Book Your First Flight</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
