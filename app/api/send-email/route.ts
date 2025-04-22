import { NextResponse } from "next/server"
import { Resend } from "resend"
import { VerificationEmail } from "@/emails/verification-email"

// Initialize Resend with your API key
const resend = new Resend("re_9t6RJG9a_ATA1mBWE7wzB66zTLnBQAjkE")

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json()

    if (!email || !token) {
      return NextResponse.json({ error: "Email and token are required" }, { status: 400 })
    }

    // Create the verification URL
    const verificationUrl = `https://cloud-airline.vercel.app/register/set-password?token=${token}`

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: "STARLUX Airlines <noreply@starluxairlines.com>",
      to: email,
      subject: "Welcome to COSMILE - Verify Your Email",
      react: VerificationEmail({ verificationUrl, email }),
    })

    if (error) {
      console.error("Resend API error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error sending email:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
