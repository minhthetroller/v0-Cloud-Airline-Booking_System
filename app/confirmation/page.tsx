"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Clock, MapPin, User, Phone, Mail } from "lucide-react"
import Link from "next/link"

export default function ConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("bookingId")
  const [booking, setBooking] = useState<any>(null)
  const [outboundFlight, setOutboundFlight] = useState<any>(null)
  const [returnFlight, setReturnFlight] = useState<any>(null)
  const [passengers, setPassengers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) return

      try {
        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("bookingid", bookingId)
          .single()

        if (bookingError) throw bookingError

        setBooking(bookingData)

        // Fetch outbound flight details
        if (bookingData.flightid) {
          const { data: flightData, error: flightError } = await supabase
            .from("flights")
            .select(`
              *,
              departureAirport:departureairportcode(name, city, country),
              arrivalAirport:arrivalairportcode(name, city, country)
            `)
            .eq("flightid", bookingData.flightid)
            .single()

          if (flightError) throw flightError

          setOutboundFlight(flightData)
        }

        // Fetch return flight details if exists
        if (bookingData.returnflightid) {
          const { data: returnFlightData, error: returnFlightError } = await supabase
            .from("flights")
            .select(`
              *,
              departureAirport:departureairportcode(name, city, country),
              arrivalAirport:arrivalairportcode(name, city, country)
            `)
            .eq("flightid", bookingData.returnflightid)
            .single()

          if (returnFlightError) throw returnFlightError

          setReturnFlight(returnFlightData)
        }

        // Fetch passengers/tickets
        const { data: ticketsData, error: ticketsError } = await supabase
          .from("tickets")
          .select("*")
          .eq("bookingid", bookingId)

        if (ticketsError) throw ticketsError

        // Group tickets by passenger
        const uniquePassengers = Array.from(
          new Map(
            ticketsData.map((ticket) => [
              `${ticket.firstname}-${ticket.lastname}`,
              {
                firstName: ticket.firstname,
                lastName: ticket.lastname,
                email: ticket.customeremail,
                phone: ticket.customerphone,
              },
            ]),
          ).values(),
        )

        setPassengers(uniquePassengers)
      } catch (error) {
        console.error("Error fetching booking details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [bookingId, supabase])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleContinueToTickets = () => {
    router.push(`/ticket-confirmation?bookingId=${bookingId}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center space-x-2 mb-6">
          <ArrowLeft className="h-5 w-5" />
          <Link href="/" className="text-sm font-medium">
            Back to Home
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">Loading booking details...</h1>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-start mb-6">
        <div className="mr-auto">
          <div className="flex items-center space-x-2">
            <ArrowLeft className="h-5 w-5" />
            <Link href="/" className="text-sm font-medium">
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="text-left mb-6">
        <h1 className="text-2xl font-bold">Booking Confirmation</h1>
        <p className="text-gray-500">Booking Reference: {bookingId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Outbound Flight */}
          {outboundFlight && (
            <Card>
              <CardHeader>
                <CardTitle>Outbound Flight</CardTitle>
                <CardDescription>{formatDate(outboundFlight.departuredatetime)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start">
                    <div className="min-w-[100px] text-center">
                      <div className="text-xl font-bold">{outboundFlight.departureairportcode}</div>
                      <div className="text-sm text-gray-500">{formatTime(outboundFlight.departuredatetime)}</div>
                    </div>
                    <div className="flex-1 px-4 py-2">
                      <div className="relative flex items-center justify-center">
                        <div className="border-t border-gray-300 flex-1"></div>
                        <div className="mx-2 text-xs text-gray-500">{outboundFlight.duration} min</div>
                        <div className="border-t border-gray-300 flex-1"></div>
                      </div>
                    </div>
                    <div className="min-w-[100px] text-center">
                      <div className="text-xl font-bold">{outboundFlight.arrivalairportcode}</div>
                      <div className="text-sm text-gray-500">{formatTime(outboundFlight.arrivaldatetime)}</div>
                    </div>
                  </div>

                  <div className="flex space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{outboundFlight.departureAirport?.city}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{outboundFlight.arrivalAirport?.city}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatDate(outboundFlight.departuredatetime)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{outboundFlight.duration} min</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return Flight */}
          {returnFlight && (
            <Card>
              <CardHeader>
                <CardTitle>Return Flight</CardTitle>
                <CardDescription>{formatDate(returnFlight.departuredatetime)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start">
                    <div className="min-w-[100px] text-center">
                      <div className="text-xl font-bold">{returnFlight.departureairportcode}</div>
                      <div className="text-sm text-gray-500">{formatTime(returnFlight.departuredatetime)}</div>
                    </div>
                    <div className="flex-1 px-4 py-2">
                      <div className="relative flex items-center justify-center">
                        <div className="border-t border-gray-300 flex-1"></div>
                        <div className="mx-2 text-xs text-gray-500">{returnFlight.duration} min</div>
                        <div className="border-t border-gray-300 flex-1"></div>
                      </div>
                    </div>
                    <div className="min-w-[100px] text-center">
                      <div className="text-xl font-bold">{returnFlight.arrivalairportcode}</div>
                      <div className="text-sm text-gray-500">{formatTime(returnFlight.arrivaldatetime)}</div>
                    </div>
                  </div>

                  <div className="flex space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{returnFlight.departureAirport?.city}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{returnFlight.arrivalAirport?.city}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatDate(returnFlight.departuredatetime)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{returnFlight.duration} min</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Passengers */}
          <Card>
            <CardHeader>
              <CardTitle>Passengers</CardTitle>
              <CardDescription>
                {passengers.length} {passengers.length === 1 ? "passenger" : "passengers"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {passengers.map((passenger, index) => (
                  <div key={index} className="flex items-center space-x-4 p-2 border-b last:border-0">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="font-medium">
                        {passenger.firstName} {passenger.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {index === 0 ? "Primary Passenger" : `Passenger ${index + 1}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Booking Status</span>
                  <span className="font-medium text-green-600">{booking?.bookingstatus}</span>
                </div>
                <div className="flex justify-between">
                  <span>Booking Date</span>
                  <span>{booking?.createdat ? formatDate(booking.createdat) : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span>{booking?.paymentmethod || "N/A"}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Total Price</span>
                  <span>${booking?.totalprice || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{booking?.contactemail || "N/A"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{booking?.contactphone || "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleContinueToTickets} className="w-full">
            View Tickets
          </Button>
        </div>
      </div>
    </div>
  )
}
