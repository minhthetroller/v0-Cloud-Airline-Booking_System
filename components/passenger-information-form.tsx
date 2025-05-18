"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import supabaseClient from "@/lib/supabase"

interface PassengerFormProps {
  totalPassengers: number
  onComplete: (passengers: any[]) => void
  onCancel: () => void
}

export function PassengerInformationForm({ totalPassengers, onComplete, onCancel }: PassengerFormProps) {
  const [passengers, setPassengers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const initializePassengers = async () => {
      try {
        setLoading(true)
        const email = sessionStorage.getItem("userEmail")
        setUserEmail(email)

        // Initialize passengers array
        const initialPassengers = []

        // If user is logged in, fetch their details for the first passenger
        if (email) {
          try {
            // Get user record from users table
            const { data: userData, error: userError } = await supabaseClient
              .from("users")
              .select("*")
              .eq("username", email)
              .single()

            if (userError) throw userError

            // Get customer details
            const { data: customerData, error: customerError } = await supabaseClient
              .from("customers")
              .select("*")
              .eq("customerid", userData.customerid)
              .single()

            if (customerError) throw customerError

            // Add primary passenger with user's details
            initialPassengers.push({
              firstName: customerData.firstname || "",
              lastName: customerData.lastname || "",
              passportNumber: customerData.passportnumber || "",
              identityCardNumber: customerData.identitycardnumber || "",
              isPrimary: true,
              isUserAccount: true,
            })
          } catch (err) {
            console.error("Error fetching user data:", err)
            // Add empty primary passenger if user data fetch fails
            initialPassengers.push({
              firstName: "",
              lastName: "",
              passportNumber: "",
              identityCardNumber: "",
              isPrimary: true,
              isUserAccount: false,
            })
          }
        } else {
          // Add empty primary passenger if not logged in
          initialPassengers.push({
            firstName: "",
            lastName: "",
            passportNumber: "",
            identityCardNumber: "",
            isPrimary: true,
            isUserAccount: false,
          })
        }

        // Add remaining passengers
        for (let i = 1; i < totalPassengers; i++) {
          initialPassengers.push({
            firstName: "",
            lastName: "",
            passportNumber: "",
            identityCardNumber: "",
            isPrimary: false,
            isUserAccount: false,
          })
        }

        setPassengers(initialPassengers)
      } catch (err: any) {
        console.error("Error initializing passengers:", err)
        setError(err.message || "Failed to initialize passenger information")
      } finally {
        setLoading(false)
      }
    }

    initializePassengers()
  }, [totalPassengers])

  const handleInputChange = (index: number, field: string, value: string) => {
    const updatedPassengers = [...passengers]
    updatedPassengers[index] = {
      ...updatedPassengers[index],
      [field]: value,
    }
    setPassengers(updatedPassengers)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all required fields
    let isValid = true
    let errorMessage = ""

    passengers.forEach((passenger, index) => {
      if (!passenger.firstName || !passenger.lastName) {
        isValid = false
        errorMessage = `Passenger ${index + 1}: First name and last name are required`
      }

      // Require either passport number or identity card number
      if (!passenger.passportNumber && !passenger.identityCardNumber) {
        isValid = false
        errorMessage = `Passenger ${index + 1}: Either passport number or identity card number is required`
      }
    })

    if (!isValid) {
      setError(errorMessage)
      return
    }

    // Clear any previous errors
    setError(null)

    // Store passengers in session storage
    sessionStorage.setItem("passengers", JSON.stringify(passengers))

    // Call the onComplete callback with the passengers data
    onComplete(passengers)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0f2d3c]"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-[#0f2d3c]">Passenger Information</h2>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {passengers.map((passenger, index) => (
          <div key={index} className="mb-8 p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-[#0f2d3c]">
              {passenger.isPrimary ? "Primary Passenger" : `Passenger ${index + 1}`}
              {passenger.isUserAccount && " (Your Account)"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor={`firstName-${index}`} className="text-[#0f2d3c]">
                  First Name
                </Label>
                <Input
                  id={`firstName-${index}`}
                  value={passenger.firstName}
                  onChange={(e) => handleInputChange(index, "firstName", e.target.value)}
                  required
                  disabled={passenger.isUserAccount}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`lastName-${index}`} className="text-[#0f2d3c]">
                  Last Name
                </Label>
                <Input
                  id={`lastName-${index}`}
                  value={passenger.lastName}
                  onChange={(e) => handleInputChange(index, "lastName", e.target.value)}
                  required
                  disabled={passenger.isUserAccount}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`passportNumber-${index}`} className="text-[#0f2d3c]">
                  Passport Number
                </Label>
                <Input
                  id={`passportNumber-${index}`}
                  value={passenger.passportNumber}
                  onChange={(e) => handleInputChange(index, "passportNumber", e.target.value)}
                  className="mt-1"
                  disabled={passenger.isUserAccount && passenger.passportNumber}
                />
              </div>
              <div>
                <Label htmlFor={`identityCardNumber-${index}`} className="text-[#0f2d3c]">
                  Identity Card Number
                </Label>
                <Input
                  id={`identityCardNumber-${index}`}
                  value={passenger.identityCardNumber}
                  onChange={(e) => handleInputChange(index, "identityCardNumber", e.target.value)}
                  className="mt-1"
                  disabled={passenger.isUserAccount && passenger.identityCardNumber}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90">
            Continue
          </Button>
        </div>
      </form>
    </div>
  )
}

export default PassengerInformationForm
