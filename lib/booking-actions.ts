"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function createBooking(
  flightId: string,
  returnFlightId: string | null,
  contactEmail: string,
  contactPhone: string,
  totalPrice: number,
  paymentMethod: string,
) {
  const supabase = createServerComponentClient({ cookies })

  try {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        flightid: flightId,
        returnflightid: returnFlightId,
        contactemail: contactEmail,
        contactphone: contactPhone,
        totalprice: totalPrice,
        paymentmethod: paymentMethod,
        bookingstatus: "Confirmed",
      })
      .select("bookingid")
      .single()

    if (error) throw error

    return data.bookingid
  } catch (error) {
    console.error("Error creating booking:", error)
    return null
  }
}

export async function updateSeatOccupancy(flightId: string, selectedSeats: string[], bookingId: string) {
  const supabase = createServerComponentClient({ cookies })

  try {
    // Update each selected seat to mark it as occupied
    for (const seatNumber of selectedSeats) {
      const { error } = await supabase
        .from("flightseatoccupancy")
        .update({
          isoccupied: true,
          bookingid: bookingId,
        })
        .eq("flightid", flightId)
        .eq("seatnumber", seatNumber)

      if (error) throw error
    }

    return true
  } catch (error) {
    console.error("Error updating seat occupancy:", error)
    return false
  }
}

export async function createTicketsForBooking(
  bookingId: string,
  passengers: any[],
  flightId: string,
  returnFlightId: string | null,
) {
  const supabase = createServerComponentClient({ cookies })

  try {
    // Create tickets for each passenger for the outbound flight
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i]

      // Create ticket for outbound flight
      const { error: outboundError } = await supabase.from("tickets").insert({
        bookingid: bookingId,
        flightid: flightId,
        passengerid: passenger.id || null,
        firstname: passenger.firstName,
        lastname: passenger.lastName,
        email: passenger.email,
        phone: passenger.phone,
        passportnumber: passenger.passportNumber || null,
        dateofbirth: passenger.dateOfBirth || null,
        customername: `${passenger.firstName} ${passenger.lastName}`,
        customeremail: passenger.email,
        customerphone: passenger.phone,
      })

      if (outboundError) throw outboundError

      // Create ticket for return flight if exists
      if (returnFlightId) {
        const { error: returnError } = await supabase.from("tickets").insert({
          bookingid: bookingId,
          flightid: returnFlightId,
          passengerid: passenger.id || null,
          firstname: passenger.firstName,
          lastname: passenger.lastName,
          email: passenger.email,
          phone: passenger.phone,
          passportnumber: passenger.passportNumber || null,
          dateofbirth: passenger.dateOfBirth || null,
          customername: `${passenger.firstName} ${passenger.lastName}`,
          customeremail: passenger.email,
          customerphone: passenger.phone,
        })

        if (returnError) throw returnError
      }
    }

    return true
  } catch (error) {
    console.error("Error creating tickets:", error)
    return false
  }
}
