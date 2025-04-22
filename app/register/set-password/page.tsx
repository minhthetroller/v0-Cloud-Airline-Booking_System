"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Eye, EyeOff, Check, X } from "lucide-react"
import supabaseClient from "@/lib/supabase"

export default function SetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Password validation states
  const [hasMinLength, setHasMinLength] = useState(false)
  const [hasUppercase, setHasUppercase] = useState(false)
  const [hasLowercase, setHasLowercase] = useState(false)
  const [hasNumber, setHasNumber] = useState(false)
  const [hasSpecialChar, setHasSpecialChar] = useState(false)
  const [passwordsMatch, setPasswordsMatch] = useState(false)

  // Check token from URL
  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      // Try to get token from session storage if not in URL
      const storedToken = sessionStorage.getItem("registrationToken")

      if (!storedToken) {
        setError("Invalid or expired verification link. Please request a new one.")
      }
    }
  }, [searchParams])

  // Validate password as user types
  useEffect(() => {
    setHasMinLength(password.length >= 8)
    setHasUppercase(/[A-Z]/.test(password))
    setHasLowercase(/[a-z]/.test(password))
    setHasNumber(/[0-9]/.test(password))
    setHasSpecialChar(/[!@#$%^&*(),.?":{}|<>]/.test(password))
    setPasswordsMatch(password === confirmPassword && password !== "")
  }, [password, confirmPassword])

  const isPasswordValid = () => {
    return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar && passwordsMatch
  }

  const handleSubmit = async () => {
    if (!isPasswordValid()) {
      setError("Please ensure your password meets all requirements")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get token from URL or session storage
      const token = searchParams.get("token") || sessionStorage.getItem("registrationToken")

      if (!token) {
        throw new Error("Verification token not found")
      }

      // Get registration data from session storage
      const email = sessionStorage.getItem("registrationEmail") || ""
      const title = sessionStorage.getItem("registrationTitle") || ""
      const firstName = sessionStorage.getItem("registrationFirstName") || ""
      const lastName = sessionStorage.getItem("registrationLastName") || ""
      const dateOfBirth = sessionStorage.getItem("registrationDateOfBirth") || ""
      const gender = sessionStorage.getItem("registrationGender") || ""
      const nationality = sessionStorage.getItem("registrationNationality") || ""
      const idNumber = sessionStorage.getItem("registrationIdNumber") || ""
      const phoneNumber = sessionStorage.getItem("registrationPhoneNumber") || ""
      const addressLine = sessionStorage.getItem("registrationAddressLine") || ""
      const city = sessionStorage.getItem("registrationCity") || ""
      const country = sessionStorage.getItem("registrationCountry") || ""

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            title,
            first_name: firstName,
            last_name: lastName,
          },
        },
      })

      if (authError) throw authError

      // Create customer record in customers table
      const { data: customerData, error: customerError } = await supabaseClient
        .from("customers")
        .insert([
          {
            pronoun: title,
            firstname: firstName,
            lastname: lastName,
            dateofbirth: new Date(dateOfBirth),
            gender,
            nationality,
            identitycardnumber: idNumber,
            contactname: `${firstName} ${lastName}`,
            phonenumber: phoneNumber,
            email,
            addressline: addressLine,
            city,
            country,
          },
        ])
        .select()

      if (customerError) throw customerError

      // Get the customer ID
      const customerId = customerData[0].customerid

      // Update user record in users table
      const { error: userError } = await supabaseClient.from("users").insert([
        {
          customerid: customerId,
          username: email,
          pointsavailable: 0,
          accountstatus: "active",
          dateregistered: new Date().toISOString(),
        },
      ])

      if (userError) throw userError

      // Clear session storage
      sessionStorage.clear()

      // Redirect to success page
      router.push("/register/success")
    } catch (err: any) {
      console.error("Error completing registration:", err)
      setError(err.message || "Failed to complete registration. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-[#f8f5f2] rounded-lg p-8">
        <h1 className="text-2xl font-bold text-[#0f2d3c] mb-6 text-center">Set Your Password</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-[#0f2d3c] mb-2 block">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-gray-300 pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-[#0f2d3c] mb-2 block">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-gray-300 pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-md">
            <h3 className="font-medium text-[#0f2d3c] mb-2">Password Requirements:</h3>
            <ul className="space-y-1">
              <li className="flex items-center text-sm">
                {hasMinLength ? (
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <X className="h-4 w-4 text-red-500 mr-2" />
                )}
                At least 8 characters
              </li>
              <li className="flex items-center text-sm">
                {hasUppercase ? (
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <X className="h-4 w-4 text-red-500 mr-2" />
                )}
                At least one uppercase letter
              </li>
              <li className="flex items-center text-sm">
                {hasLowercase ? (
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <X className="h-4 w-4 text-red-500 mr-2" />
                )}
                At least one lowercase letter
              </li>
              <li className="flex items-center text-sm">
                {hasNumber ? (
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <X className="h-4 w-4 text-red-500 mr-2" />
                )}
                At least one number
              </li>
              <li className="flex items-center text-sm">
                {hasSpecialChar ? (
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <X className="h-4 w-4 text-red-500 mr-2" />
                )}
                At least one special character
              </li>
              <li className="flex items-center text-sm">
                {passwordsMatch ? (
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <X className="h-4 w-4 text-red-500 mr-2" />
                )}
                Passwords match
              </li>
            </ul>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !isPasswordValid()}
            className="w-full bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </div>
      </div>
    </div>
  )
}
