"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import supabaseClient from "@/lib/supabase"

interface GuestInformation {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  nationality: string
  passportNumber: string
  passportExpiry: string
}

export default function GuestInformationPage() {
  const router = useRouter()
  const [guestInfo, setGuestInfo] = useState<GuestInformation>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    nationality: "",
    passportNumber: "",
    passportExpiry: "",
  })
  const [errors, setErrors] = useState<Partial<GuestInformation>>({})
  const [loading, setLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setGuestInfo((prev) => ({ ...prev, [name]: value }))

    // Clear error for this field when user types
    if (errors[name as keyof GuestInformation]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<GuestInformation> = {}
    let isValid = true

    // Required fields
    Object.entries(guestInfo).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key as keyof GuestInformation] = "This field is required"
        isValid = false
      }
    })

    // Email validation
    if (guestInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
      newErrors.email = "Please enter a valid email address"
      isValid = false
    }

    // Phone validation
    if (guestInfo.phone && !/^\+?[0-9]{10,15}$/.test(guestInfo.phone)) {
      newErrors.phone = "Please enter a valid phone number"
      isValid = false
    }

    // Date of birth validation
    if (guestInfo.dateOfBirth) {
      const dob = new Date(guestInfo.dateOfBirth)
      const today = new Date()
      if (dob > today) {
        newErrors.dateOfBirth = "Date of birth cannot be in the future"
        isValid = false
      }
    }

    // Passport expiry validation
    if (guestInfo.passportExpiry) {
      const expiry = new Date(guestInfo.passportExpiry)
      const today = new Date()
      if (expiry < today) {
        newErrors.passportExpiry = "Passport has expired"
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setGeneralError(null)

    try {
      // Store guest information in session storage
      sessionStorage.setItem("guestInformation", JSON.stringify(guestInfo))

      // Create a temporary customer record
      const { data: customerData, error: customerError } = await supabaseClient
        .from("customers")
        .insert({
          firstname: guestInfo.firstName,
          lastname: guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone,
          dateofbirth: guestInfo.dateOfBirth,
          nationality: guestInfo.nationality,
          passportnumber: guestInfo.passportNumber,
          passportexpiry: guestInfo.passportExpiry,
          isguest: true,
        })
        .select("customerid")
        .single()

      if (customerError) {
        throw new Error(customerError.message)
      }

      // Store customer ID in session storage
      sessionStorage.setItem("customerId", customerData.customerid)

      // Redirect to contact information page
      router.push("/contact-information")
    } catch (err: any) {
      console.error("Error saving guest information:", err)
      setGeneralError(err.message || "Failed to save your information. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] py-8">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Passenger Information</CardTitle>
            <CardDescription>Please enter the passenger details for your booking.</CardDescription>
          </CardHeader>
          <CardContent>
            {generalError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={guestInfo.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={guestInfo.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={guestInfo.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={guestInfo.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={guestInfo.dateOfBirth}
                    onChange={handleChange}
                    className={errors.dateOfBirth ? "border-red-500" : ""}
                  />
                  {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    name="nationality"
                    value={guestInfo.nationality}
                    onChange={handleChange}
                    placeholder="Enter nationality"
                    className={errors.nationality ? "border-red-500" : ""}
                  />
                  {errors.nationality && <p className="text-red-500 text-sm">{errors.nationality}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passportNumber">Passport Number</Label>
                  <Input
                    id="passportNumber"
                    name="passportNumber"
                    value={guestInfo.passportNumber}
                    onChange={handleChange}
                    placeholder="Enter passport number"
                    className={errors.passportNumber ? "border-red-500" : ""}
                  />
                  {errors.passportNumber && <p className="text-red-500 text-sm">{errors.passportNumber}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passportExpiry">Passport Expiry Date</Label>
                  <Input
                    id="passportExpiry"
                    name="passportExpiry"
                    type="date"
                    value={guestInfo.passportExpiry}
                    onChange={handleChange}
                    className={errors.passportExpiry ? "border-red-500" : ""}
                  />
                  {errors.passportExpiry && <p className="text-red-500 text-sm">{errors.passportExpiry}</p>}
                </div>
              </div>

              <CardFooter className="flex justify-between pt-6 px-0">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90">
                  {loading ? "Saving..." : "Continue"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
