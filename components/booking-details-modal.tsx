"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plane, Calendar, User, CreditCard } from "lucide-react"
import { format } from "date-fns"
import supabaseClient from "@/lib/supabase"

interface BookingDetailsModalProps {
  bookingId: string
  children: React.ReactNode
}

interface Passenger {
  passengerid: number
  firstname: string
  lastname: string
  passengertype: string
  seatnumber?: string
}

interface Flight {
  flightid: number
  flightnumber: string
  departureairportcode: string
  arrivalairportcode: string
  departuredatetime: string
  arrivaldatetime: string
  status: string
  departureAirport?: {
    airportname: string
    city: string
    country: string
  }
  arrivalAirport?: {
    airportname: string
    city: string
    country: string
  }
  seat?: {
    seatnumber: string
    seattype: string
  }
  ticketClass?: {
    classname: string
    cabintype: string
  }
}

interface Payment {
  paymentid: number
  paymentdatetime: string
  amount: number
  currencycode: string
  paymentmethod: string
  transactionid: string
  paymentstatus: string
}

interface BookingDetails {
  bookingid: string
  bookingreference: string
  bookingdatetime: string
  totalprice: number
  currencycode: string
  bookingstatus: string
  flights: Flight[]
  passengers: Passenger[]
  payment?: Payment
}

export default function BookingDetailsModal({ bookingId, children }: BookingDetailsModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null)

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!open) return

      try {
        setLoading(true)
        setError(null)

        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabaseClient
          .from("bookings")
          .select("*")
          .eq("bookingid", bookingId)
          .single()

        if (bookingError) throw new Error(`Error fetching booking: ${bookingError.message}`)

        // Fetch tickets for this booking
        const { data: ticketsData, error: ticketsError } = await supabaseClient
          .from("tickets")
          .select("ticketid, flightid, passengerid, seatid, classid")
          .eq("bookingid", bookingId)

        if (ticketsError) throw new Error(`Error fetching tickets: ${ticketsError.message}`)

        // Get unique flight IDs
        const flightIds = [...new Set(ticketsData.map((ticket: any) => ticket.flightid))]

        // Fetch flight details
        const { data: flightsData, error: flightsError } = await supabaseClient
          .from("flights")
          .select("*")
          .in("flightid", flightIds)

        if (flightsError) throw new Error(`Error fetching flights: ${flightsError.message}`)

        // Fetch airport details
        const airportCodes = [
          ...flightsData.map((flight: any) => flight.departureairportcode),
          ...flightsData.map((flight: any) => flight.arrivalairportcode),
        ]

        const { data: airportsData, error: airportsError } = await supabaseClient
          .from("airports")
          .select("airportcode, airportname, city, country")
          .in("airportcode", airportCodes)

        if (airportsError) throw new Error(`Error fetching airports: ${airportsError.message}`)

        // Create a map of airport codes to airport details
        const airportsMap: Record<string, any> = {}
        airportsData.forEach((airport: any) => {
          airportsMap[airport.airportcode] = airport
        })

        // Fetch passenger details
        const passengerIds = [...new Set(ticketsData.map((ticket: any) => ticket.passengerid))]
        const { data: passengersData, error: passengersError } = await supabaseClient
          .from("passengers")
          .select("passengerid, customerid, passengertype")
          .in("passengerid", passengerIds)

        if (passengersError) throw new Error(`Error fetching passengers: ${passengersError.message}`)

        // Fetch customer details for each passenger
        const customerIds = [...new Set(passengersData.map((passenger: any) => passenger.customerid))]
        const { data: customersData, error: customersError } = await supabaseClient
          .from("customers")
          .select("customerid, firstname, lastname")
          .in("customerid", customerIds)

        if (customersError) throw new Error(`Error fetching customers: ${customersError.message}`)

        // Create a map of customer IDs to customer details
        const customersMap: Record<number, any> = {}
        customersData.forEach((customer: any) => {
          customersMap[customer.customerid] = customer
        })

        // Fetch seat details
        const seatIds = ticketsData.map((ticket: any) => ticket.seatid).filter(Boolean)
        const { data: seatsData, error: seatsError } = await supabaseClient
          .from("seats")
          .select("seatid, seatnumber, seattype")
          .in("seatid", seatIds)

        if (seatsError && seatIds.length > 0) throw new Error(`Error fetching seats: ${seatsError.message}`)

        // Create a map of seat IDs to seat details
        const seatsMap: Record<number, any> = {}
        if (seatsData) {
          seatsData.forEach((seat: any) => {
            seatsMap[seat.seatid] = seat
          })
        }

        // Fetch ticket class details
        const classIds = [...new Set(ticketsData.map((ticket: any) => ticket.classid))]
        const { data: classesData, error: classesError } = await supabaseClient
          .from("ticketclasses")
          .select("classid, classname, cabintype")
          .in("classid", classIds)

        if (classesError) throw new Error(`Error fetching ticket classes: ${classesError.message}`)

        // Create a map of class IDs to class details
        const classesMap: Record<number, any> = {}
        classesData.forEach((ticketClass: any) => {
          classesMap[ticketClass.classid] = ticketClass
        })

        // Fetch payment details
        const { data: paymentData, error: paymentError } = await supabaseClient
          .from("payments")
          .select("*")
          .eq("bookingid", bookingId)
          .order("paymentdatetime", { ascending: false })
          .limit(1)

        // Process flights data with airport details
        const processedFlights = flightsData.map((flight: any) => {
          // Find tickets for this flight
          const flightTickets = ticketsData.filter((ticket: any) => ticket.flightid === flight.flightid)

          // Get seat and class details from the first ticket (assuming all passengers have the same class)
          const firstTicket = flightTickets[0]
          const seatDetails = firstTicket.seatid ? seatsMap[firstTicket.seatid] : null
          const classDetails = firstTicket.classid ? classesMap[firstTicket.classid] : null

          return {
            ...flight,
            departureAirport: airportsMap[flight.departureairportcode],
            arrivalAirport: airportsMap[flight.arrivalairportcode],
            seat: seatDetails,
            ticketClass: classDetails,
          }
        })

        // Process passengers data with customer details
        const processedPassengers = passengersData.map((passenger: any) => {
          const customer = customersMap[passenger.customerid]

          // Find ticket for this passenger
          const passengerTicket = ticketsData.find((ticket: any) => ticket.passengerid === passenger.passengerid)
          const seatDetails = passengerTicket?.seatid ? seatsMap[passengerTicket.seatid] : null

          return {
            ...passenger,
            firstname: customer?.firstname || "Guest",
            lastname: customer?.lastname || "User",
            seatnumber: seatDetails?.seatnumber,
          }
        })

        // Combine all data
        const details: BookingDetails = {
          ...bookingData,
          flights: processedFlights,
          passengers: processedPassengers,
          payment: paymentData && paymentData.length > 0 ? paymentData[0] : undefined,
        }

        setBookingDetails(details)
      } catch (err: any) {
        console.error("Error fetching booking details:", err)
        setError(err.message || "Failed to load booking details")
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [bookingId, open])

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  // Calculate flight duration
  const calculateDuration = (departure: string, arrival: string) => {
    const departureTime = new Date(departure)
    const arrivalTime = new Date(arrival)
    const durationMs = arrivalTime.getTime() - departureTime.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl bg-[#0a1e29] text-white border-[#1a3a4a]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#9b6a4f]">Booking Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9b6a4f]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : bookingDetails ? (
          <div className="mt-4 space-y-6">
            {/* Booking Summary */}
            <div className="bg-[#0f2d3c] rounded-lg p-4">
              <div className="flex flex-wrap justify-between items-center">
                <div>
                  <p className="text-gray-400">Booking Reference</p>
                  <p className="text-xl font-bold">{bookingDetails.bookingreference}</p>
                </div>
                <div>
                  <p className="text-gray-400">Booking Date</p>
                  <p>{format(new Date(bookingDetails.bookingdatetime), "MMM d, yyyy HH:mm")}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p
                    className={`font-medium ${
                      bookingDetails.bookingstatus === "Confirmed"
                        ? "text-green-500"
                        : bookingDetails.bookingstatus === "Cancelled"
                          ? "text-red-500"
                          : "text-yellow-500"
                    }`}
                  >
                    {bookingDetails.bookingstatus}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Total Price</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(bookingDetails.totalprice, bookingDetails.currencycode)}{" "}
                    {bookingDetails.currencycode}
                  </p>
                </div>
              </div>
            </div>

            {/* Flight Details */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center">
                <Plane className="mr-2 h-5 w-5 text-[#9b6a4f]" />
                Flight Details
              </h3>
              <div className="space-y-4">
                {bookingDetails.flights.map((flight, index) => (
                  <div key={index} className="bg-[#0f2d3c] rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">{flight.flightnumber}</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
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
                      <div className="text-sm text-gray-400">
                        <Calendar className="inline-block mr-1 h-3 w-3" />
                        {format(new Date(flight.departuredatetime), "MMM d, yyyy")}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-gray-400">Departure</p>
                        <p className="text-xl font-bold">{format(new Date(flight.departuredatetime), "HH:mm")}</p>
                        <p className="font-medium">{flight.departureairportcode}</p>
                        <p className="text-sm text-gray-400">
                          {flight.departureAirport?.city}, {flight.departureAirport?.country}
                        </p>
                        <p className="text-xs mt-1">{flight.departureAirport?.airportname}</p>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        <div className="text-sm text-gray-400">
                          {calculateDuration(flight.departuredatetime, flight.arrivaldatetime)}
                        </div>
                        <div className="relative my-2 w-full flex items-center">
                          <div className="h-[1px] w-full flex-grow bg-gray-700"></div>
                          <Plane size={16} className="mx-2 rotate-90 text-[#9b6a4f]" />
                          <div className="h-[1px] w-full flex-grow bg-gray-700"></div>
                        </div>
                        <div className="text-center text-sm">Direct</div>
                      </div>

                      <div>
                        <p className="text-gray-400">Arrival</p>
                        <p className="text-xl font-bold">{format(new Date(flight.arrivaldatetime), "HH:mm")}</p>
                        <p className="font-medium">{flight.arrivalairportcode}</p>
                        <p className="text-sm text-gray-400">
                          {flight.arrivalAirport?.city}, {flight.arrivalAirport?.country}
                        </p>
                        <p className="text-xs mt-1">{flight.arrivalAirport?.airportname}</p>
                      </div>
                    </div>

                    {flight.ticketClass && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex flex-wrap gap-4">
                          <div>
                            <p className="text-gray-400 text-sm">Class</p>
                            <p>{flight.ticketClass.classname}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Cabin</p>
                            <p>{flight.ticketClass.cabintype}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Passenger Details */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center">
                <User className="mr-2 h-5 w-5 text-[#9b6a4f]" />
                Passenger Details
              </h3>
              <div className="bg-[#0f2d3c] rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookingDetails.passengers.map((passenger, index) => (
                    <div key={index} className="border border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {passenger.firstname} {passenger.lastname}
                          </p>
                          <p className="text-sm text-gray-400">{passenger.passengertype}</p>
                        </div>
                        <div className="bg-[#1a3a4a] px-2 py-1 rounded text-xs">
                          {passenger.seatnumber ? `Seat ${passenger.seatnumber}` : "No seat assigned"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Details */}
            {bookingDetails.payment && (
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center">
                  <CreditCard className="mr-2 h-5 w-5 text-[#9b6a4f]" />
                  Payment Details
                </h3>
                <div className="bg-[#0f2d3c] rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Payment Method</p>
                      <p className="font-medium">{bookingDetails.payment.paymentmethod}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Transaction ID</p>
                      <p className="font-medium">{bookingDetails.payment.transactionid}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Date & Time</p>
                      <p className="font-medium">
                        {format(new Date(bookingDetails.payment.paymentdatetime), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Amount</p>
                      <p className="font-medium">
                        {formatCurrency(bookingDetails.payment.amount, bookingDetails.payment.currencycode)}{" "}
                        {bookingDetails.payment.currencycode}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                      <p className="text-gray-400">Status</p>
                      <p
                        className={`font-medium ${
                          bookingDetails.payment.paymentstatus === "Completed"
                            ? "text-green-500"
                            : bookingDetails.payment.paymentstatus === "Failed"
                              ? "text-red-500"
                              : "text-yellow-500"
                        }`}
                      >
                        {bookingDetails.payment.paymentstatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">No booking details found</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
