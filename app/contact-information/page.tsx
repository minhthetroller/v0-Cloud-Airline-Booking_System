"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import supabaseClient from "@/lib/supabase"

interface ContactInformation {
  contactName: string
  contactEmail: string
  contactPhone: string
  address: string
  city: string
  country: string
  sameAsPassenger: boolean
}

export default function ContactInformationPage() {
  const router = useRouter()
  const [contactInfo, setContactInfo] = useState<ContactInformation>({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "",
    country: "",
    sameAsPassenger: false,
  })
  const [errors, setErrors] = useState<Partial<ContactInformation>>({})
  const [loading, setLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [guestInfo, setGuestInfo] = useState<any>(null)

  useEffect(() => {
    // Load guest information from session storage
    const storedGuestInfo = sessionStorage.getItem("guestInformation")
    if (storedGuestInfo) {
      const parsedGuestInfo = JSON.parse(storedGuestInfo)
      setGuestInfo(parsedGuestInfo)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setContactInfo((prev) => ({ ...prev, [name]: value }))

    // Clear error for this field when user types
    if (errors[name as keyof ContactInformation]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    setContactInfo((prev) => ({ ...prev, sameAsPassenger: checked }))

    if (checked && guestInfo) {
      // Fill contact information with passenger information
      setContactInfo((prev) => ({
        ...prev,
        contactName: `${guestInfo.firstName} ${guestInfo.lastName}`,
        contactEmail: guestInfo.email,
        contactPhone: guestInfo.phone,
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactInformation> = {}
    let isValid = true

    // Required fields
    const requiredFields = ["contactName", "contactEmail", "contactPhone", "address", "city", "country"]
    requiredFields.forEach((field) => {
      if (!contactInfo[field as keyof ContactInformation]) {
        newErrors[field as keyof ContactInformation] = "This field is required"
        isValid = false
      }
    })

    // Email validation
    if (contactInfo.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.contactEmail)) {
      newErrors.contactEmail = "Please enter a valid email address"
      isValid = false
    }

    // Phone validation
    if (contactInfo.contactPhone && !/^\+?[0-9]{10,15}$/.test(contactInfo.contactPhone)) {
      newErrors.contactPhone = "Please enter a valid phone number"
      isValid = false
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
      // Store contact information in session storage
      sessionStorage.setItem("contactInformation", JSON.stringify(contactInfo))

      // Update customer record with contact information
      const customerId = sessionStorage.getItem("customerId")

      if (!customerId) {
        throw new Error("Customer ID not found")
      }

      const { error: updateError } = await supabaseClient
        .from("customers")
        .update({
          contactname: contactInfo.contactName,
          contactemail: contactInfo.contactEmail, // Using the correct column name
          contactphone: contactInfo.contactPhone, // Using the correct column name
          addressline: contactInfo.address, // Using the correct column name
          city: contactInfo.city,
          country: contactInfo.country,
          // Removed postalcode field
        })
        .eq("customerid", customerId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Redirect to payment page
      router.push("/payment")
    } catch (err: any) {
      console.error("Error saving contact information:", err)
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
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Please provide contact details for your booking.</CardDescription>
          </CardHeader>
          <CardContent>
            {generalError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="sameAsPassenger"
                  checked={contactInfo.sameAsPassenger}
                  onCheckedChange={handleCheckboxChange}
                />
                <Label htmlFor="sameAsPassenger">Same as passenger information</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    value={contactInfo.contactName}
                    onChange={handleChange}
                    placeholder="Enter contact name"
                    className={errors.contactName ? "border-red-500" : ""}
                  />
                  {errors.contactName && <p className="text-red-500 text-sm">{errors.contactName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={contactInfo.contactEmail}
                    onChange={handleChange}
                    placeholder="Enter contact email"
                    className={errors.contactEmail ? "border-red-500" : ""}
                  />
                  {errors.contactEmail && <p className="text-red-500 text-sm">{errors.contactEmail}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  value={contactInfo.contactPhone}
                  onChange={handleChange}
                  placeholder="Enter contact phone"
                  className={errors.contactPhone ? "border-red-500" : ""}
                />
                {errors.contactPhone && <p className="text-red-500 text-sm">{errors.contactPhone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={contactInfo.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={contactInfo.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                    className={errors.city ? "border-red-500" : ""}
                  />
                  {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={contactInfo.country}
                    onChange={handleChange}
                    placeholder="Enter country"
                    className={errors.country ? "border-red-500" : ""}
                  />
                  {errors.country && <p className="text-red-500 text-sm">{errors.country}</p>}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#1a91d9] hover:bg-[#1678b6] text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Continue to Payment"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
