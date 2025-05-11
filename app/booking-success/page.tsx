"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Home, Printer } from "lucide-react"

export default function BookingSuccessPage() {
  const router = useRouter()

  const handlePrint = () => {
    window.print()
  }

  const handleReturnHome = () => {
    router.push("/")
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] flex items-center justify-center text-white">
      <div className="container max-w-md mx-auto px-4 py-12 text-center">
        <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />

        <h1 className="text-3xl font-bold mb-4">Booking Successful!</h1>

        <p className="mb-8">
          Your booking has been confirmed. A confirmation email has been sent to your email address.
        </p>

        <div className="flex flex-col space-y-4">
          <Button onClick={handlePrint} className="bg-white text-[#0f2d3c] hover:bg-gray-100">
            <Printer className="mr-2 h-4 w-4" />
            Print Booking Details
          </Button>

          <Button onClick={handleReturnHome} variant="outline" className="border-white text-white">
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </div>
      </div>
    </main>
  )
}
