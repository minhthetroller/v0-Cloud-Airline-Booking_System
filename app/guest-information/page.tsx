"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PassengerInformationForm } from "@/components/passenger-information-form"
import { useAuth } from "@/lib/auth-context"

interface Passenger {
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  passportNumber?: string
  dateOfBirth?: string
}

export default function GuestInformationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createClientComponentClient()

  const flightId = searchParams.get("flightId")
  const returnFlightId = searchParams.get("returnFlightId")
  const passengersParam = searchParams.get("passengers")
  const totalPrice = searchParams.get("totalPrice")
  const selectedSeats = searchParams.get("selectedSeats")
  const returnSelectedSeats = searchParams.get("returnSelectedSeats")

  const [passengerCount, setPassengerCount] = useState(1)
  const [passengers, setPassengers] = useState<Passenger[]>([{ firstName: "", lastName: "", email: "", phone: "" }])
  const [isLoading, setIsLoading] = useState(false)
  const [userCustomerData, setUserCustomerData] = useState<any>(null)

  useEffect(() => {
    // Parse passengers count from URL if available
    if (passengersParam) {
      try {
        const parsedPassengers = JSON.parse(decodeURIComponent(passengersParam))
        setPassengerCount(parsedPassengers.length || 1)

        // Initialize passengers array with empty values
        const initialPassengers = Array(parsedPassengers.length || 1)
          .fill(null)
          .map(() => ({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
          }))
        setPassengers(initialPassengers)
      } catch (error) {
        console.error("Error parsing passengers:", error)
      }
    }
  }, [passengersParam])

  useEffect(() => {
    // Fetch customer data for logged-in user
    const fetchCustomerData = async () => {
      if (user) {
        try {
          const { data, error } = await supabase.from("customers").select("*").eq("userid", user.id).single()

          if (error) throw error

          setUserCustomerData(data)

          // Pre-populate first passenger with user data
          if (data && passengers.length > 0) {
            const updatedPassengers = [...passengers]
            updatedPassengers[0] = {
              id: data.customerid,
              firstName: data.firstname,
              lastName: data.lastname,
              email: data.email,
              phone: data.phone || "",
              passportNumber: data.passportnumber || "",
              dateOfBirth: data.dateofbirth || "",
            }
            setPassengers(updatedPassengers)
          }
        } catch (error) {
          console.error("Error fetching customer data:", error)
        }
      }
    }

    fetchCustomerData()
  }, [user, supabase])

  const handlePassengerChange = (index: number, data: Passenger) => {
    const updatedPassengers = [...passengers]
    updatedPassengers[index] = data
    setPassengers(updatedPassengers)
  }

  const handleContinue = () => {
    // Validate all passengers have required fields
    const isValid = passengers.every(
      (p) => p.firstName.trim() !== "" && p.lastName.trim() !== "" && p.email.trim() !== "" && p.phone.trim() !== "",
    )

    if (!isValid) {
      alert("Please fill in all required fields for all passengers")
      return
    }

    setIsLoading(true)

    // Encode passengers data for URL
    const encodedPassengers = encodeURIComponent(JSON.stringify(passengers))

    // Build query parameters
    const queryParams = new URLSearchParams()
    if (flightId) queryParams.append("flightId", flightId)
    if (returnFlightId) queryParams.append("returnFlightId", returnFlightId)
    queryParams.append("passengers", encodedPassengers)
    if (totalPrice) queryParams.append("totalPrice", totalPrice)
    if (selectedSeats) queryParams.append("selectedSeats", selectedSeats)
    if (returnSelectedSeats) queryParams.append("returnSelectedSeats", returnSelectedSeats)

    // Navigate to contact information page
    router.push(`/contact-information?${queryParams.toString()}`)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Passenger Information</h1>
      <Card>
        <CardHeader>
          <CardTitle>Passenger Details</CardTitle>
          <CardDescription>Please provide information for all passengers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: passengerCount }).map((_, index) => (
            <div key={index} className="border p-4 rounded-md">
              <h3 className="text-lg font-medium mb-4">
                {index === 0 ? "Primary Passenger" : `Passenger ${index + 1}`}
                {index === 0 && user && " (Your Information)"}
              </h3>
              <PassengerInformationForm
                passenger={passengers[index]}
                onChange={(data) => handlePassengerChange(index, data)}
                isDisabled={index === 0 && !!user} // Disable editing for logged-in user's info
              />
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button onClick={handleContinue} disabled={isLoading}>
            {isLoading ? "Processing..." : "Continue to Contact Information"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
