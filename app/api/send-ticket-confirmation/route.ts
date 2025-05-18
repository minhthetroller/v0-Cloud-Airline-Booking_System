import { NextResponse } from "next/server"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { sendEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const body = await request.json()
    const { email, name, tickets, bookingId } = body

    if (!email || !tickets || !bookingId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Format ticket information for email
    const ticketInfo = tickets
      .map((ticket: any) => {
        return `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h3 style="margin-top: 0;">Passenger: ${ticket.passenger_name}</h3>
          <p><strong>Flight:</strong> ${ticket.flight_details?.flight_number}</p>
          <p><strong>Airline:</strong> ${ticket.flight_details?.airline}</p>
          <p><strong>From:</strong> ${ticket.flight_details?.departure_airport}</p>
          <p><strong>To:</strong> ${ticket.flight_details?.arrival_airport}</p>
          <p><strong>Departure:</strong> ${new Date(ticket.flight_details?.departure_time).toLocaleString()}</p>
          <p><strong>Arrival:</strong> ${new Date(ticket.flight_details?.arrival_time).toLocaleString()}</p>
          <p><strong>Seat:</strong> ${ticket.seat_details?.seat_number} (${ticket.seat_details?.seat_class})</p>
        </div>
      `
      })
      .join("")

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Your Ticket Confirmation</h1>
        <p>Dear ${name},</p>
        <p>Thank you for booking with us. Below are your ticket details:</p>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
        
        <h2 style="margin-top: 20px;">Tickets</h2>
        ${ticketInfo}
        
        <p style="margin-top: 30px;">We wish you a pleasant journey!</p>
        <p>Best regards,<br>Airline Booking Team</p>
      </div>
    `

    // Send email
    await sendEmail({
      to: email,
      subject: `Ticket Confirmation - Booking #${bookingId}`,
      html: emailContent,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error sending ticket confirmation email:", error.message)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
