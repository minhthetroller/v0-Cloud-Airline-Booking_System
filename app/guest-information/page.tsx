"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, AlertCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  identityCardNumber: string
  pronoun: string
  passengerType?: string
}

export default function GuestInformationPage() {
  const router = useRouter()
  const [passengers, setPassengers] = useState<GuestInformation[]>([])
  const [currentPassengerIndex, setCurrentPassengerIndex] = useState(0)
  const [totalPassengers, setTotalPassengers] = useState(1)
  const [errors, setErrors] = useState<Partial<GuestInformation>>({})
  const [loading, setLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [passengerTypes, setPassengerTypes] = useState({ adults: 1, children: 0, infants: 0 })
  const [userDataAttempted, setUserDataAttempted] = useState(false); // New state for controlling user data fetch

  // Effect 1: Initialize passengers array (runs once on mount)
  useEffect(() => {
    // Try to get passenger count from URL parameters first
    const searchParams = new URLSearchParams(window.location.search)
    const urlAdults = Number.parseInt(searchParams.get("adults") || "0")
    const urlChildren = Number.parseInt(searchParams.get("children") || "0")
    const urlInfants = Number.parseInt(searchParams.get("infants") || "0")

    // Then try to get from session storage
    const storedPassengerDetails = sessionStorage.getItem("passengerDetails")
    const storedTotalPassengers = sessionStorage.getItem("totalPassengers")

    let adults = 1
    let children = 0
    let infants = 0
    let total = 1

    // Use URL parameters if available
    if (urlAdults > 0 || urlChildren > 0 || urlInfants > 0) {
      adults = urlAdults || 1
      children = urlChildren || 0
      infants = urlInfants || 0
      total = adults + children + infants
    }
    // Otherwise use session storage if available
    else if (storedPassengerDetails) {
      try {
        const details = JSON.parse(storedPassengerDetails)
        adults = details.adults || 1
        children = details.children || 0
        infants = details.infants || 0
        total = adults + children + infants
      } catch (e) {
        console.error("Error parsing passenger details from session storage:", e)
      }
    }
    // Or use stored total if available
    else if (storedTotalPassengers) {
      total = Number.parseInt(storedTotalPassengers, 10) || 1
      adults = total // Default to all adults if we only have total
    }

    setPassengerTypes({
      adults,
      children,
      infants,
    })
    setTotalPassengers(total)

    // Initialize passenger array with the correct number of passengers
    const initialPassengers = Array(total)
      .fill(null)
      .map((_, index) => {
        // Determine passenger type
        let passengerType = "adult"
        if (index < adults) {
          passengerType = "adult"
        } else if (index < adults + children) {
          passengerType = "child"
        } else {
          passengerType = "infant"
        }

        return {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          dateOfBirth: "",
          nationality: "",
          passportNumber: "",
          passportExpiry: "",
          identityCardNumber: "",
          pronoun: "Mr.",
          passengerType,
        }
      })

    setPassengers(initialPassengers)
  }, []) // Empty dependency array ensures this runs once on mount

  // Effect 2: Fetch logged-in user data if available (runs once after passengers are initialized)
  useEffect(() => {
    const fetchAndPopulateUserData = async () => {
      const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true"
      const userEmail = sessionStorage.getItem("userEmail")

      // If not logged in or no email, no need to fetch. Mark as attempted.
      if (!isLoggedIn || !userEmail) {
        setUserDataAttempted(true)
        return
      }

      try {
        // First get the user record
        const { data: userData, error: userError } = await supabaseClient
          .from("users")
          .select("userid, customerid")
          .eq("username", userEmail)
          .single()

        if (userError) throw userError

        if (userData && userData.customerid) {
          // Then get the customer details
          const { data: customerData, error: customerError } = await supabaseClient
            .from("customers")
            .select("*")
            .eq("customerid", userData.customerid)
            .single()

          if (customerError) throw customerError

          if (customerData) {
            // ---- MODIFIED PHONE NUMBER FORMATTING LOGIC ----
            let formattedPhone = customerData.phonenumber || ""
            if (formattedPhone && formattedPhone.startsWith("+")) {
              const cleanedPhone = formattedPhone.replace(/\s+/g, "") // Remove all spaces
              const countryCodeMatch = cleanedPhone.match(/^\+\d+/) // Match +countrycode

              if (countryCodeMatch) {
                const countryCode = countryCodeMatch[0]
                const localNumberPart = cleanedPhone.substring(countryCode.length)

                if (localNumberPart.trim()) { // Check if there's an actual number after the country code
                  formattedPhone = "0" + localNumberPart.trim()
                } else {
                  // If only country code was present (e.g., "+84" or "+84 "), set to empty.
                  formattedPhone = ""
                }
              } else {
                // If it starts with "+" but not a valid country code pattern (e.g., "+abc"),
                // keep the cleaned version. Validation should catch it if invalid.
                formattedPhone = cleanedPhone
              }
            }
            // ---- END OF MODIFIED PHONE NUMBER FORMATTING LOGIC ----

            // Pre-populate the first passenger with the logged-in user's data
            // Use functional update for setPassengers to ensure we have the latest state
            setPassengers((prevPassengers) => {
              // Ensure prevPassengers is not empty before trying to update
              if (prevPassengers.length === 0) return prevPassengers;

              const updatedPassengers = [...prevPassengers]
              updatedPassengers[0] = {
                ...updatedPassengers[0], // Keep existing fields like passengerType
                firstName: customerData.firstname || "",
                lastName: customerData.lastname || "",
                email: userEmail, // userEmail is from session storage
                phone: formattedPhone, // Use the corrected formattedPhone
                dateOfBirth: customerData.dateofbirth || "",
                nationality: customerData.nationality || "",
                passportNumber: customerData.passportnumber || "",
                passportExpiry: customerData.passportexpiry || "",
                identityCardNumber: customerData.identitycardnumber || "",
                // Pronoun is already defaulted in initialPassengers, can be overridden if customerData has it
                ...(customerData.pronoun && { pronoun: customerData.pronoun }),
              }
              return updatedPassengers
            })

            // Store customer ID for later use
            sessionStorage.setItem("customerId", userData.customerid)
            sessionStorage.setItem("userId", userData.userid)
          }
        }
      } catch (err) {
        console.error("Error fetching logged-in user data:", err)
        // Optionally, set a general error for the user here if needed
      } finally {
        setUserDataAttempted(true) // Mark that the fetch attempt has been made
      }
    }

    // Only attempt to fetch if passengers array is populated and we haven't tried yet.
    if (passengers.length > 0 && !userDataAttempted) {
      fetchAndPopulateUserData()
    }
  }, [passengers, userDataAttempted]) // Dependencies control when this effect runs

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setPassengers((prev) => {
      const updated = [...prev]
      if (updated[currentPassengerIndex]) {
        updated[currentPassengerIndex] = {
          ...updated[currentPassengerIndex],
          [name]: value,
        }
      }
      return updated
    })

    // Clear error for this field when user types
    if (errors[name as keyof GuestInformation]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setPassengers((prev) => {
      const updated = [...prev]
      if (updated[currentPassengerIndex]) {
        updated[currentPassengerIndex] = {
          ...updated[currentPassengerIndex],
          [name]: value,
        }
      }
      return updated
    })

    // Clear error for this field when user selects
    if (errors[name as keyof GuestInformation]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const goToNextPassenger = () => {
    if (!validateForm()) return

    if (currentPassengerIndex < totalPassengers - 1) {
      setCurrentPassengerIndex((prev) => prev + 1)
      setErrors({})
    } else {
      handleSubmit()
    }
  }

  const goToPreviousPassenger = () => {
    if (currentPassengerIndex > 0) {
      setCurrentPassengerIndex((prev) => prev - 1)
      setErrors({})
    }
  }

  const validateForm = (): boolean => {
    const currentPassenger = passengers[currentPassengerIndex]
    if (!currentPassenger) return false

    const newErrors: Partial<GuestInformation> = {}
    let isValid = true

    // Required fields (excluding identityCardNumber which is optional)
    const requiredFields: (keyof GuestInformation)[] = [
      "firstName",
      "lastName",
      "dateOfBirth",
      "nationality",
      "passportNumber",
      "passportExpiry",
      "pronoun",
    ]

    // Add email and phone as required only for the first passenger
    if (currentPassengerIndex === 0) {
      requiredFields.push("email", "phone")
    }

    requiredFields.forEach((field) => {
      if (!currentPassenger[field]?.trim()) {
        newErrors[field] = "This field is required"
        isValid = false
      }
    })

    // Email validation for first passenger
    if (
      currentPassengerIndex === 0 &&
      currentPassenger.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentPassenger.email)
    ) {
      newErrors.email = "Please enter a valid email address"
      isValid = false
    }

    // Phone validation for first passenger
    // Updated regex to be more flexible: allows optional + and digits, also allows leading 0 for local numbers.
    // This validation runs AFTER our formatting. If formattedPhone is "", this will fail if phone is required.
    if (currentPassengerIndex === 0 && currentPassenger.phone && !/^(?:\+?[0-9]{10,15}|0[0-9]{9,10})$/.test(currentPassenger.phone.replace(/\s+/g, ''))) {
      newErrors.phone = "Please enter a valid phone number"
      isValid = false
    }


    // Date of birth validation
    if (currentPassenger.dateOfBirth) {
      const dob = new Date(currentPassenger.dateOfBirth)
      const today = new Date()
      // Add time to today to compare dates correctly
      today.setHours(0,0,0,0); 
      if (dob > today) {
        newErrors.dateOfBirth = "Date of birth cannot be in the future"
        isValid = false
      }
    }

    // Passport expiry validation
    if (currentPassenger.passportExpiry) {
      const expiry = new Date(currentPassenger.passportExpiry)
      const today = new Date()
      today.setHours(0,0,0,0);
      if (expiry < today) {
        newErrors.passportExpiry = "Passport has expired or expires today"
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      // If current form is invalid, but it's not the last passenger,
      // still allow navigation if user tries to submit all.
      // However, the primary "Next" button already calls validateForm.
      // This handleSubmit is typically for the final submission.
      // So, if validateForm fails here, it means the current (last) passenger form is invalid.
      setGeneralError("Please correct the errors before submitting.");
      return
    }

    setLoading(true)
    setGeneralError(null)

    try {
      // Store all passengers information in session storage
      sessionStorage.setItem("passengers", JSON.stringify(passengers))

      // Create customer records for all passengers
      const customerIds = []

      for (const passenger of passengers) {
        const { data: customerData, error: customerError } = await supabaseClient
          .from("customers")
          .insert({
            firstname: passenger.firstName,
            lastname: passenger.lastName,
            email: passenger.email || passengers[0].email, // Use first passenger's email if not provided
            phonenumber: passenger.phone || passengers[0].phone, // Use first passenger's phone if not provided
            dateofbirth: passenger.dateOfBirth,
            nationality: passenger.nationality,
            passportnumber: passenger.passportNumber,
            passportexpiry: passenger.passportExpiry,
            // Only include identitycardnumber if it's provided
            ...(passenger.identityCardNumber ? { identitycardnumber: passenger.identityCardNumber } : {}),
            pronoun: passenger.pronoun,
            // Add default values for required fields that aren't in the form
            gender: "Not specified", // Default, consider if this should be part of the form
            country: passenger.nationality, // Use nationality as default country
            city: "Not specified", // Default, consider if this should be part of the form
          })
          .select("customerid")
          .single()

        if (customerError) {
          // Provide more specific error if possible
          console.error("Supabase customer insert error:", customerError);
          throw new Error(`Error saving passenger ${passenger.firstName}: ${customerError.message}`)
        }
        if (!customerData) {
            throw new Error(`Failed to retrieve customer ID for ${passenger.firstName}.`);
        }
        customerIds.push(customerData.customerid)
      }

      // Store customer IDs in session storage
      sessionStorage.setItem("customerIds", JSON.stringify(customerIds))
      sessionStorage.setItem("primaryCustomerId", customerIds[0]) // Assuming first passenger is primary

      // Create a booking record immediately
      const bookingReference = generateBookingReference()
      const totalPrice = calculateInitialPrice() 
      const { data: bookingData, error: bookingError } = await supabaseClient
        .from("bookings")
        .insert({
          bookingdatetime: new Date().toISOString(),
          bookingstatus: "Pending", // Or "Confirmed" if payment is immediate
          totalprice: totalPrice,
          currencycode: "VND", // Or get from settings/flight details
          bookingreference: bookingReference,
          userid: sessionStorage.getItem("userId") || null, // Use stored userId if available
        })
        .select("bookingid")
        .single()

      if (bookingError) {
        console.error("Supabase booking insert error:", bookingError);
        throw new Error(`Error creating booking: ${bookingError.message}`)
      }
       if (!bookingData) {
            throw new Error("Failed to retrieve booking ID.");
       }

      // Store booking ID and reference in session storage
      sessionStorage.setItem("bookingId", bookingData.bookingid)
      sessionStorage.setItem("bookingReference", bookingReference)

      // Create passenger records linking customers to the booking
      for (let i = 0; i < customerIds.length; i++) {
        const customerId = customerIds[i];
        const passengerDetail = passengers[i]; // Get corresponding passenger detail for type
        const { error: passengerError } = await supabaseClient.from("passengers").insert({
          customerid: customerId,
          bookingid: bookingData.bookingid,
          passengertype: passengerDetail.passengerType || "Adult", // Use stored passenger type
        })

        if (passengerError) {
          console.error("Supabase passenger insert error:", passengerError);
          throw new Error(`Error creating passenger record for customer ${customerId}: ${passengerError.message}`)
        }
      }

      // Redirect to the next step, e.g., contact information or payment
      router.push("/contact-information") // Or your next page
    } catch (err: any) {
      console.error("Error saving passenger information:", err)
      setGeneralError(err.message || "Failed to save your information. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const generateBookingReference = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const calculateInitialPrice = () => {
    const departureFlightItem = sessionStorage.getItem("selectedDepartureFlight");
    const returnFlightItem = sessionStorage.getItem("selectedReturnFlight");

    const departureFlight = departureFlightItem ? JSON.parse(departureFlightItem) : null;
    const returnFlight = returnFlightItem ? JSON.parse(returnFlightItem) : null;

    let total = 0
    if (departureFlight && typeof departureFlight.price === "number") {
      total += departureFlight.price
    }
    if (returnFlight && typeof returnFlight.price === "number") {
      total += returnFlight.price
    }
    
    // Calculate price based on passenger types (adults, children, infants)
    // This is a simplified example. You might have different prices per type.
    // For now, assuming all passengers (adults, children, infants) pay the same base flight price.
    // A more complex calculation would involve different rates.
    const numAdults = passengerTypes.adults;
    const numChildren = passengerTypes.children;
    const numInfants = passengerTypes.infants; // Infants might have different pricing (e.g., 10% of adult fare)

    // Example: Adults and Children pay full, Infants pay 10%
    // This assumes `total` is the price per adult/child ticket for one leg.
    // If `total` is already the sum of one-way prices for one person.
    
    let finalPrice = 0;
    if (departureFlight && typeof departureFlight.price === "number") {
        finalPrice += (numAdults * departureFlight.price) + (numChildren * departureFlight.price) + (numInfants * departureFlight.price * 0.1); // Example: infants 10%
    }
    if (returnFlight && typeof returnFlight.price === "number") {
        finalPrice += (numAdults * returnFlight.price) + (numChildren * returnFlight.price) + (numInfants * returnFlight.price * 0.1); // Example: infants 10%
    }


    if (isNaN(finalPrice) || finalPrice <= 0) {
      console.warn("Invalid initial price calculated, using default minimum price if applicable or re-evaluating logic. Current totalPassengers:", totalPassengers, "PassengerTypes:", passengerTypes)
      // Fallback price logic might be needed here, or ensure flights always have prices.
      // For now, if calculation leads to 0 or NaN, it might indicate missing flight data.
      // Let's return 0 and handle it upstream or ensure flight prices are always present.
      return 1500000; // Default used previously, ensure this is appropriate.
    }

    console.log("Calculated initial price:", finalPrice, "for", passengerTypes);
    return finalPrice;
  }


  // Render loading state or the form
  if (passengers.length === 0 && !userDataAttempted) {
    // Initial loading state before passengers are initialized by the first useEffect
    return (
        <main className="min-h-screen bg-[#0f2d3c] py-8 flex items-center justify-center">
            <p className="text-white text-xl">Loading passenger information...</p>
            {/* You could add a spinner here */}
        </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#0f2d3c] py-8">
      {/* Full width progress bar */}
      <div className="w-full bg-[#1a3a4a] py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between w-full">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                1
              </div>
              <span className="text-xs text-white mt-1">Passenger</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                2
              </div>
              <span className="text-xs text-white mt-1">Contact</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="text-xs text-white mt-1">Confirmation</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                4
              </div>
              <span className="text-xs text-white mt-1">Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6">
        <div className="flex items-center max-w-2xl mx-auto mb-6">
          <button onClick={() => router.back()} className="mr-4 text-white hover:text-gray-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Passenger Information</h1>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Passenger Information</CardTitle>
            <CardDescription>Please enter the passenger details for your booking. All fields marked with * are required for the primary passenger.</CardDescription>
          </CardHeader>
          <CardContent>
            {generalError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}
            {passengers.length > 0 && passengers[currentPassengerIndex] ? ( // Ensure passenger data is available
                 <form
                 id="guestInfoForm"
                 onSubmit={(e) => {
                   e.preventDefault()
                   goToNextPassenger()
                 }}
                 className="space-y-4"
               >
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-medium">
                     Passenger {currentPassengerIndex + 1} of {totalPassengers}
                     {passengers[currentPassengerIndex]?.passengerType === 'adult' && currentPassengerIndex === 0 ? " (Primary Contact - Adult)" : ` (${passengers[currentPassengerIndex]?.passengerType || 'N/A'})`}
                   </h3>
                   <div className="flex space-x-2">
                     {Array.from({ length: totalPassengers }).map((_, index) => (
                       <div
                         key={index}
                         className={`w-3 h-3 rounded-full ${
                           index === currentPassengerIndex ? "bg-blue-500" : "bg-gray-300"
                         }`}
                       />
                     ))}
                   </div>
                 </div>
   
                 <div className="space-y-2">
                   <Label htmlFor="pronoun">Title *</Label>
                   <Select
                     value={passengers[currentPassengerIndex]?.pronoun || "Mr."}
                     onValueChange={(value) => handleSelectChange("pronoun", value)}
                   >
                     <SelectTrigger className={errors.pronoun ? "border-red-500" : ""}>
                       <SelectValue placeholder="Select a title" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Mr.">Mr.</SelectItem>
                       <SelectItem value="Mrs.">Mrs.</SelectItem>
                       <SelectItem value="Ms.">Ms.</SelectItem>
                       <SelectItem value="Dr.">Dr.</SelectItem>
                       <SelectItem value="Prof.">Prof.</SelectItem>
                     </SelectContent>
                   </Select>
                   {errors.pronoun && <p className="text-red-500 text-sm">{errors.pronoun}</p>}
                 </div>
   
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="firstName">First Name *</Label>
                     <Input
                       id="firstName"
                       name="firstName"
                       value={passengers[currentPassengerIndex]?.firstName || ""}
                       onChange={handleChange}
                       placeholder="Enter first name"
                       className={errors.firstName ? "border-red-500" : ""}
                     />
                     {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="lastName">Last Name *</Label>
                     <Input
                       id="lastName"
                       name="lastName"
                       value={passengers[currentPassengerIndex]?.lastName || ""}
                       onChange={handleChange}
                       placeholder="Enter last name"
                       className={errors.lastName ? "border-red-500" : ""}
                     />
                     {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
                   </div>
                 </div>
   
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="email">
                       Email {currentPassengerIndex === 0 ? "*" : <span className="text-gray-400 text-sm">(Optional)</span>}
                     </Label>
                     <Input
                       id="email"
                       name="email"
                       type="email"
                       value={passengers[currentPassengerIndex]?.email || ""}
                       onChange={handleChange}
                       placeholder="Enter email address"
                       className={errors.email ? "border-red-500" : ""}
                       disabled={currentPassengerIndex !== 0 && !!passengers[0]?.email} // Disable for non-primary if primary has email
                     />
                     {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="phone">
                       Phone Number{" "}
                       {currentPassengerIndex === 0 ? "*" : <span className="text-gray-400 text-sm">(Optional)</span>}
                     </Label>
                     <Input
                       id="phone"
                       name="phone"
                       value={passengers[currentPassengerIndex]?.phone || ""}
                       onChange={handleChange}
                       placeholder="Enter phone number"
                       className={errors.phone ? "border-red-500" : ""}
                       disabled={currentPassengerIndex !== 0 && !!passengers[0]?.phone} // Disable for non-primary if primary has phone
                     />
                     {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                   </div>
                 </div>
   
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                     <Input
                       id="dateOfBirth"
                       name="dateOfBirth"
                       type="date"
                       value={passengers[currentPassengerIndex]?.dateOfBirth || ""}
                       onChange={handleChange}
                       placeholder="Enter date of birth"
                       className={errors.dateOfBirth ? "border-red-500" : ""}
                       max={new Date().toISOString().split("T")[0]} // Prevent future dates
                     />
                     {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="nationality">Nationality *</Label>
                     <Input
                       id="nationality"
                       name="nationality"
                       value={passengers[currentPassengerIndex]?.nationality || ""}
                       onChange={handleChange}
                       placeholder="Enter nationality"
                       className={errors.nationality ? "border-red-500" : ""}
                     />
                     {errors.nationality && <p className="text-red-500 text-sm">{errors.nationality}</p>}
                   </div>
                 </div>
   
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="passportNumber">Passport Number *</Label>
                     <Input
                       id="passportNumber"
                       name="passportNumber"
                       value={passengers[currentPassengerIndex]?.passportNumber || ""}
                       onChange={handleChange}
                       placeholder="Enter passport number"
                       className={errors.passportNumber ? "border-red-500" : ""}
                     />
                     {errors.passportNumber && <p className="text-red-500 text-sm">{errors.passportNumber}</p>}
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="passportExpiry">Passport Expiry *</Label>
                     <Input
                       id="passportExpiry"
                       name="passportExpiry"
                       type="date"
                       value={passengers[currentPassengerIndex]?.passportExpiry || ""}
                       onChange={handleChange}
                       placeholder="Enter passport expiry"
                       className={errors.passportExpiry ? "border-red-500" : ""}
                       min={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split("T")[0]} // Passport must be valid for at least tomorrow
                     />
                     {errors.passportExpiry && <p className="text-red-500 text-sm">{errors.passportExpiry}</p>}
                   </div>
                 </div>
   
                 <div className="space-y-2">
                   <Label htmlFor="identityCardNumber">
                     Identity Card Number <span className="text-gray-400 text-sm">(Optional)</span>
                   </Label>
                   <Input
                     id="identityCardNumber"
                     name="identityCardNumber"
                     value={passengers[currentPassengerIndex]?.identityCardNumber || ""}
                     onChange={handleChange}
                     placeholder="Enter identity card number (if applicable)"
                     className={errors.identityCardNumber ? "border-red-500" : ""}
                   />
                   {errors.identityCardNumber && <p className="text-red-500 text-sm">{errors.identityCardNumber}</p>}
                   <p className="text-gray-400 text-xs">Not required for children under 14 years old or if passport is provided.</p>
                 </div>
               </form>
            ) : (
                <p>Loading passenger form...</p> // Fallback if passenger data isn't ready for the form
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-6 px-6">
            <Button
              type="button"
              onClick={goToPreviousPassenger}
              disabled={currentPassengerIndex === 0 || loading}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              type="submit"
              form="guestInfoForm" // ensure this matches the form id
              disabled={loading || (passengers.length > 0 && !passengers[currentPassengerIndex])} // Disable if current passenger data is not loaded
              className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90"
            >
              {loading ? "Saving..." : currentPassengerIndex === totalPassengers - 1 ? "Submit All Information" : "Next Passenger"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
