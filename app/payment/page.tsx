"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, CreditCard, Building } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card")

  // Card payment state
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")

  // Bank transfer state
  const [bankQrShown, setBankQrShown] = useState(false)

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Redirect to success page
      router.push("/booking-success")
    } catch (err: any) {
      console.error("Payment error:", err)
      setError(err.message || "Payment failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQr = () => {
    setBankQrShown(true)
  }

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  // Format expiry date (MM/YY)
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")

    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }

    return v
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Payment</h1>
        </header>

        <Tabs defaultValue="card" onValueChange={(value) => setPaymentMethod(value as "card" | "bank")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="card" className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              Credit/Debit Card
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center">
              <Building className="mr-2 h-4 w-4" />
              Bank Transfer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card">
            <div className="bg-[#1a3a4a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Credit/Debit Card Payment</h2>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handlePayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4111 1111 1111 1111"
                    maxLength={19}
                    required
                    className="bg-white text-black"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardName">Cardholder Name</Label>
                  <Input
                    id="cardName"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="bg-white text-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date (MM/YY)</Label>
                    <Input
                      id="expiryDate"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      required
                      className="bg-white text-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                      placeholder="123"
                      maxLength={3}
                      required
                      className="bg-white text-black"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Processing..." : "Pay Now"}
                  </Button>
                </div>

                <p className="text-sm text-gray-300 mt-2">
                  For testing, use card number 4111 1111 1111 1111, any future expiry date, and any 3-digit CVV. use
                  card number 4111 1111 1111 1111, any future expiry date, and any 3-digit CVV.
                </p>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="bank">
            <div className="bg-[#1a3a4a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Bank Transfer</h2>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {bankQrShown ? (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <img src="/placeholder.svg?key=d143b" alt="Bank transfer QR code" className="w-48 h-48" />
                  </div>

                  <div className="text-center mb-6">
                    <p className="font-bold">Scan this QR code with your banking app</p>
                    <p className="text-sm text-gray-300 mt-2">
                      Amount: 1,500,000 VND
                      <br />
                      Reference: Your booking reference
                    </p>
                  </div>

                  <Button onClick={handlePayment} className="bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Verifying Payment..." : "I've Completed the Transfer"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="mb-6 text-center">
                    Generate a QR code to make a bank transfer using VNPay or your banking app.
                  </p>

                  <Button onClick={handleGenerateQr} className="bg-blue-600 hover:bg-blue-700">
                    Generate QR Code
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky bar at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            className="border-[#0f2d3c] text-[#0f2d3c]"
            onClick={() => router.push("/confirmation")}
          >
            Back to Confirmation
          </Button>

          <div className="text-xl font-bold text-[#0f2d3c]">Total: 1,500,000 VND</div>
        </div>
      </div>
    </main>
  )
}
