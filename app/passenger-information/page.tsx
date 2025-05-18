"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Passenger {
  id: number
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  passportNumber: string
}

export default function PassengerInformationPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [passengerCount, setPassengerCount] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)

  useEffect(() => {
    const fetchUserAndInitialize = async () => {
      try {
        // Get passenger count from session storage
        const storedPassengerCount = sessionStorage.getItem("passengerCount")
        if (storedPassengerCount) {
          setPassengerCount(Number.parseInt(storedPassengerCount))
        }

        // Get user details if logged in
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          if (profileError) throw profileError

          if (profileData) {
            setUserDetails(profileData)

            // Initialize passengers array with user as first passenger
            const initialPassengers: Passenger[] = [
              {
                id: 1,
                firstName: profileData.first_name || "",
                lastName: profileData.last_name || "",
                dateOfBirth: profileData.date_of_birth || "",
                nationality: profileData.nationality || "",
                passportNumber: profileData.passport_number || "",
              },
            ]

            // Add empty passenger objects for additional passengers
            for (let i = 2; i <= Number.parseInt(storedPassengerCount || "1"); i++) {
              initialPassengers.push({
                id: i,
                firstName: "",
                lastName: "",
                dateOfBirth: "",
                nationality: "",
                passportNumber: "",
              })
            }

            setPassengers(initialPassengers)
          }
        }
      } catch (error: any) {
        console.error("Error fetching user details:", error.message)
        setError("Failed to load user information. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchUserAndInitialize()
  }, [supabase])

  const handleInputChange = (passengerId: number, field: keyof Passenger, value: string) => {
    setPassengers((prevPassengers) =>
      prevPassengers.map((passenger) => (passenger.id === passengerId ? { ...passenger, [field]: value } : passenger)),
    )
  }

  const handleSubmit = () => {
    // Validate all passenger information is filled
    const isValid = passengers.every(
      (passenger) =>
        passenger.firstName &&
        passenger.lastName &&
        passenger.dateOfBirth &&
        passenger.nationality &&
        passenger.passportNumber,
    )

    if (!isValid) {
      alert("Please fill in all passenger information.")
      return
    }

    // Store passenger information in session storage
    sessionStorage.setItem("passengers", JSON.stringify(passengers))

    // Navigate to confirmation page
    router.push("/confirmation")
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading passenger information...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Passenger Information</h1>

      {passengers.map((passenger, index) => (
        <div key={passenger.id} className="mb-8 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            Passenger {passenger.id} {passenger.id === 1 && userDetails ? "(You)" : ""}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`firstName-${passenger.id}`}>First Name</Label>
              <Input
                id={`firstName-${passenger.id}`}
                value={passenger.firstName}
                onChange={(e) => handleInputChange(passenger.id, "firstName", e.target.value)}
                disabled={passenger.id === 1 && userDetails}
              />
            </div>

            <div>
              <Label htmlFor={`lastName-${passenger.id}`}>Last Name</Label>
              <Input
                id={`lastName-${passenger.id}`}
                value={passenger.lastName}
                onChange={(e) => handleInputChange(passenger.id, "lastName", e.target.value)}
                disabled={passenger.id === 1 && userDetails}
              />
            </div>

            <div>
              <Label htmlFor={`dateOfBirth-${passenger.id}`}>Date of Birth</Label>
              <Input
                id={`dateOfBirth-${passenger.id}`}
                type="date"
                value={passenger.dateOfBirth}
                onChange={(e) => handleInputChange(passenger.id, "dateOfBirth", e.target.value)}
                disabled={passenger.id === 1 && userDetails}
              />
            </div>

            <div>
              <Label htmlFor={`nationality-${passenger.id}`}>Nationality</Label>
              <Input
                id={`nationality-${passenger.id}`}
                value={passenger.nationality}
                onChange={(e) => handleInputChange(passenger.id, "nationality", e.target.value)}
                disabled={passenger.id === 1 && userDetails}
              />
            </div>

            <div>
              <Label htmlFor={`passportNumber-${passenger.id}`}>Passport Number</Label>
              <Input
                id={`passportNumber-${passenger.id}`}
                value={passenger.passportNumber}
                onChange={(e) => handleInputChange(passenger.id, "passportNumber", e.target.value)}
                disabled={passenger.id === 1 && userDetails}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSubmit}>Continue to Confirmation</Button>
      </div>
    </div>
  )
}
