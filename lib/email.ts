export async function sendVerificationEmail(email: string, token: string) {
  try {
    // Use the environment variable for the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.cloud-airlines.space/"

    // Use our server-side API route instead of calling Resend directly
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        token,
        baseUrl, // Pass the base URL to the API route
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to send verification email")
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error sending email:", error)
    throw new Error(`Failed to send verification email: ${error.message}`)
  }
}
