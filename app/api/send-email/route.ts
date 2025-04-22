import { NextResponse } from "next/server"
import { Resend } from "resend"
import { VerificationEmail } from "@/emails/verification-email"

// Initialize Resend with your API key
const resend = new Resend("re_9t6RJG9a_ATA1mBWE7wzB66zTLnBQAjkE")

export async function POST(request: Request) {
  try {
    const { email, token, baseUrl } = await request.json()

    if (!email || !token) {
      return NextResponse.json({ error: "Email and token are required" }, { status: 400 })
    }

    // Use the provided baseUrl or fall back to the environment variable
    const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://www.cloud-airlines.space/"

    // Create the verification URL with the correct base URL
    // Make sure the URL doesn't have double slashes
    const verificationUrl = `${appUrl.replace(/\/$/, "")}/register/set-password?token=${token}`

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: "Cloud Airline <noreply@cloudairline.com>",
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
