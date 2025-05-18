"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Check, ArrowLeft, Home } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import supabaseClient from "@/lib/supabase"

interface Ticket {
  ticketid: string
  ticketnumber: string
  bookingid: string
  flightid: number
  passengerid: string
  seatid: number
  status: string
  ticketprice: number
  classid: number
  flights?: any
  passengers?: any
  seats?: any
}

export default function TicketConfirmationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [contactEmail, setContactEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        setLoading(true)

        // Get booking ID from session storage
        const storedBookingId = sessionStorage.getItem("bookingId")
        const storedBookingReference = sessionStorage.getItem("bookingReference")
        const storedContactEmail = sessionStorage.getItem("contactEmail")

        if (!storedBookingId) {
          throw new Error("Booking ID not found")
        }

        setBookingId(storedBookingId)
        setBookingReference(storedBookingReference)
        setContactEmail(storedContactEmail)

        console.log("Fetching tickets for booking ID:", storedBookingId)

        // Fetch tickets with related data
        const { data: ticketsData, error: ticketsError } = await supabaseClient
          .from("tickets")
          .select(`
            *,
            flights(*),
            passengers(*),
            seats(*)
          `)
          .eq("bookingid", storedBookingId)

        if (ticketsError) {
          console.error("Error fetching tickets:", ticketsError)
          throw new Error(`Error fetching tickets: ${ticketsError.message}`)
        }

        console.log("Tickets data:", ticketsData)
        setTickets(ticketsData || [])
      } catch (err: any) {
        console.error("Error fetching ticket details:", err)
        setError(err.message || "Failed to load ticket details")
      } finally {
        setLoading(false)
      }
    }

    fetchTicketDetails()
  }, [])

  const handleReturnHome = () => {
    router.push("/")
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
        <Button onClick={() => router.push("/")} className="mt-4">
          Return to Home
        </Button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-start max-w-3xl mx-auto mb-8">
          <button onClick={() => router.push("/")} className="mr-4 text-white hover:text-gray-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Ticket Confirmation</h1>
        </div>

        {/* Success Message */}
        <section className="mb-6 bg-green-600 rounded-lg p-4 max-w-3xl mx-auto">
          <div className="flex items-center">
            <Check className="h-6 w-6 mr-2" />
            <div>
              <h2 className="text-xl font-bold">Payment Successful</h2>
              <p>Your payment has been processed and your tickets are confirmed.</p>
            </div>
          </div>
        </section>

        {/* Booking Reference */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-2">Booking Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Booking Reference</p>
              <p className="text-lg">{bookingReference}</p>
            </div>
            {contactEmail && (
              <div>
                <p className="font-medium">Confirmation Email</p>
                <p>Sent to: {contactEmail}</p>
              </div>
            )}
          </div>
        </section>

        {/* Tickets */}
        <section className="mb-6 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Your Tickets</h2>

          {tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.ticketid} className="bg-[#1a3a4a] rounded-lg p-4 print:border print:border-gray-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        {ticket.flights?.departureairport} → {ticket.flights?.arrivalairport}
                      </h3>
                      <p className="text-sm text-gray-300">Flight {ticket.flights?.flightnumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">Ticket #{ticket.ticketnumber}</p>
                      <p className="text-sm text-gray-300">
                        {ticket.status === "Confirmed" ? (
                          <span className="text-green-400">✓ Confirmed</span>
                        ) : (
                          ticket.status
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-medium">Passenger</p>
                      <p>
                        {ticket.passengers?.firstname} {ticket.passengers?.lastname}
                      </p>

                      {ticket.passengers?.passportnumber && (
                        <p className="text-sm text-gray-300">Passport: {ticket.passengers?.passportnumber}</p>
                      )}
                      {ticket.passengers?.identitycardnumber && (
                        <p className="text-sm text-gray-300">ID Card: {ticket.passengers?.identitycardnumber}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Seat</p>
                      <p>{ticket.seats?.seatnumber || ticket.seatid}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Departure Time</p>
                      <p>
                        {ticket.flights?.departuretime
                          ? new Date(ticket.flights.departuretime).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Price</p>
                      <p>{new Intl.NumberFormat("vi-VN").format(ticket.ticketprice || 0)} VND</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No tickets found.</p>
          )}
        </section>

        {/* Actions */}
        <div className="flex justify-center max-w-3xl mx-auto">
          <Button onClick={handleReturnHome} className="bg-green-600 hover:bg-green-700">
            <Home className="h-4 w-4 mr-2" />
            Return to Home Page
          </Button>
        </div>
      </div>
    </main>
  )
}
