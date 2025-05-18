"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"

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

interface Ticket {
  id: string
  booking_id: string
  passenger_name: string
  flight_id: string
  seat_id: string
  flight_details: Flight
  seat_details: {
    seat_number: string
    seat_class: string
  }
}

export default function TicketConfirmationPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [departureFlight, setDepartureFlight] = useState<Flight | null>(null)
  const [returnFlight, setReturnFlight] = useState<Flight | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState<boolean>(false)

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        // Get booking ID
        const storedBookingId = sessionStorage.getItem("bookingId")
        if (storedBookingId) {
          setBookingId(storedBookingId)
        } else {
          throw new Error("Booking ID not found")
        }

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
        }

        // Check if tickets exist for this booking
        const { data: existingTickets, error: ticketsError } = await supabase
          .from("tickets")
          .select("*")
          .eq("booking_id", storedBookingId)

        if (ticketsError) throw ticketsError

        // If tickets don't exist, create them
        if (!existingTickets || existingTickets.length === 0) {
          await createTickets(storedBookingId)
        } else {
          // Fetch ticket details with flight and seat information
          const ticketsWithDetails = await Promise.all(
            existingTickets.map(async (ticket) => {
              // Get flight details
              const { data: flightData } = await supabase
                .from("flights")
                .select("*")
                .eq("id", ticket.flight_id)
                .single()

              // Get seat details
              const { data: seatData } = await supabase
                .from("seats")
                .select("seat_number, seat_class")
                .eq("id", ticket.seat_id)
                .single()

              return {
                ...ticket,
                flight_details: flightData,
                seat_details: seatData,
              }
            }),
          )

          setTickets(ticketsWithDetails)
        }
      } catch (error: any) {
        console.error("Error fetching ticket details:", error.message)
        setError("Failed to load ticket details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchTicketDetails()
  }, [supabase])

  const createTickets = async (bookingId: string) => {
    try {
      const ticketsToCreate = []

      // Create tickets for departure flight
      for (let i = 0; i < passengers.length; i++) {
        const passenger = passengers[i]
        const seat = selectedSeats.filter((s) => !s.isReturn)[i]

        if (passenger && seat && departureFlight) {
          ticketsToCreate.push({
            booking_id: bookingId,
            passenger_name: `${passenger.firstName} ${passenger.lastName}`,
            flight_id: departureFlight.id,
            seat_id: seat.seat_id,
          })
        }
      }

      // Create tickets for return flight if applicable
      if (returnFlight) {
        for (let i = 0; i < passengers.length; i++) {
          const passenger = passengers[i]
          const seat = selectedSeats.filter((s) => s.isReturn)[i]

          if (passenger && seat && returnFlight) {
            ticketsToCreate.push({
              booking_id: bookingId,
              passenger_name: `${passenger.firstName} ${passenger.lastName}`,
              flight_id: returnFlight.id,
              seat_id: seat.seat_id,
            })
          }
        }
      }

      // Insert tickets into database
      const { data: createdTickets, error: insertError } = await supabase
        .from("tickets")
        .insert(ticketsToCreate)
        .select()

      if (insertError) throw insertError

      // Fetch ticket details with flight and seat information
      const ticketsWithDetails = await Promise.all(
        ticketsToCreate.map(async (ticket, index) => {
          // Get flight details
          const { data: flightData } = await supabase.from("flights").select("*").eq("id", ticket.flight_id).single()

          // Get seat details
          const { data: seatData } = await supabase
            .from("seats")
            .select("seat_number, seat_class")
            .eq("id", ticket.seat_id)
            .single()

          return {
            ...ticket,
            id: createdTickets ? createdTickets[index].id : "",
            flight_details: flightData,
            seat_details: seatData,
          }
        }),
      )

      setTickets(ticketsWithDetails)
    } catch (error: any) {
      console.error("Error creating tickets:", error.message)
      throw error
    }
  }

  const handleSendEmail = async () => {
    try {
      setLoading(true)

      // Get contact information
      const storedContactInfo = sessionStorage.getItem("contactInfo")
      if (!storedContactInfo) {
        throw new Error("Contact information not found")
      }

      const contactInfo = JSON.parse(storedContactInfo)

      // Send email with ticket confirmation
      const response = await fetch("/api/send-ticket-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: contactInfo.email,
          name: contactInfo.name,
          tickets: tickets,
          bookingId: bookingId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send email")
      }

      setEmailSent(true)
    } catch (error: any) {
      console.error("Error sending email:", error.message)
      setError("Failed to send email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    // Clear session storage
    sessionStorage.removeItem("selectedDepartureFlight")
    sessionStorage.removeItem("selectedReturnFlight")
    sessionStorage.removeItem("selectedSeats")
    sessionStorage.removeItem("passengers")
    sessionStorage.removeItem("contactInfo")
    sessionStorage.removeItem("bookingId")
    sessionStorage.removeItem("totalPrice")

    // Navigate to home page
    router.push("/")
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading ticket details...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Ticket Confirmation</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Booking ID: {bookingId}</h2>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tickets.map((ticket, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Ticket #{index + 1}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">Passenger</h3>
                <p>{ticket.passenger_name}</p>
              </div>

              <div>
                <h3 className="font-medium">Flight</h3>
                <p>Flight Number: {ticket.flight_details?.flight_number}</p>
                <p>Airline: {ticket.flight_details?.airline}</p>
                <p>From: {ticket.flight_details?.departure_airport}</p>
                <p>To: {ticket.flight_details?.arrival_airport}</p>
                <p>
                  Departure:{" "}
                  {ticket.flight_details ? new Date(ticket.flight_details.departure_time).toLocaleString() : ""}
                </p>
                <p>
                  Arrival: {ticket.flight_details ? new Date(ticket.flight_details.arrival_time).toLocaleString() : ""}
                </p>
              </div>

              <div>
                <h3 className="font-medium">Seat</h3>
                <p>Seat Number: {ticket.seat_details?.seat_number}</p>
                <p>Class: {ticket.seat_details?.seat_class}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6 space-x-4">
        <Button onClick={handleSendEmail} disabled={emailSent || loading} variant={emailSent ? "outline" : "default"}>
          {emailSent ? "Email Sent" : "Send Tickets by Email"}
        </Button>
        <Button onClick={handleFinish}>Finish</Button>
      </div>
    </div>
  )
}
