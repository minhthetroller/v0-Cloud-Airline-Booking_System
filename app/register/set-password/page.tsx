"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import supabaseClient from "@/lib/supabase"
import { sha256 } from "js-sha256"

export default function SetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Password validation states
  const [validations, setValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false,
  })

  useEffect(() => {
    // Get token and email from URL query parameters
    const urlToken = searchParams.get("token")
    const urlEmail = searchParams.get("email")

    if (urlToken) {
      setToken(urlToken)

      // If email is in URL, use it
      if (urlEmail) {
        setEmail(urlEmail)
      } else {
        // Try to get email from session storage
        const storedEmail = sessionStorage.getItem("registrationEmail")
        if (storedEmail) {
          setEmail(storedEmail)
        }
      }
    } else {
      // No token provided, redirect to manual verification
      router.push("/register/manual-verification")
    }
  }, [searchParams, router])

  // Validate password as user types
  useEffect(() => {
    setValidations({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      match: password === confirmPassword && password !== "",
    })
  }, [password, confirmPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      // Validate password meets requirements
      if (!Object.values(validations).every((valid) => valid)) {
        throw new Error("Password does not meet all requirements")
      }

      // If we don't have an email, prompt the user to enter it
      if (!email) {
        const emailInput = prompt("Please enter your email address to complete registration:")
        if (!emailInput) {
          throw new Error("Email is required to complete registration")
        }
        setEmail(emailInput)
      }

      // Find the user record by email
      const { data: userData, error: userQueryError } = await supabaseClient
        .from("users")
        .select("*")
        .eq("username", email)
        .single()

      if (userQueryError) {
        throw new Error(`Error finding user account: ${userQueryError.message}`)
      }

      if (!userData) {
        throw new Error("User account not found. Please complete registration first.")
      }

      // Update the user's password and set account status to verified
      const hashedPassword = sha256(password)
      const { error: updateError } = await supabaseClient
        .from("users")
        .update({
          passwordhash: hashedPassword, // Store hashed password
          accountstatus: "verified",
        })
        .eq("username", email)

      if (updateError) {
        throw new Error(`Error updating user account: ${updateError.message}`)
      }

      // Success! Show success message and redirect after a delay
      setSuccess(true)
      setTimeout(() => {
        // Clear session storage
        sessionStorage.removeItem("registrationEmail")
        sessionStorage.removeItem("registrationToken")
        sessionStorage.removeItem("customerData")

        // Redirect to success page
        router.push("/register/success")
      }, 2000)
    } catch (err: any) {
      console.error("Error setting password:", err)
      setError(err.message || "Failed to set password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-[#0f2d3c] rounded-lg p-8 text-center">
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="Cloud Airline Logo" width={180} height={60} />
        </div>

        <h1 className="text-3xl font-bold text-[#f8f5f2] mb-6">Set Your Password</h1>

        <div className="bg-[#1a3a4a] rounded-lg p-8 mb-8">
          {success ? (
            <div className="bg-green-500/10 text-green-500 border border-green-500 rounded-md p-4 mb-4">
              <p className="flex items-center">
                <Check className="h-5 w-5 mr-2" />
                Password set successfully! Redirecting...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 text-left">
                  <Label htmlFor="password" className="text-[#f8f5f2] text-left">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <Label htmlFor="confirmPassword" className="text-[#f8f5f2] text-left">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-sm text-[#f8f5f2] text-left">
                  <p className="mb-2 text-left">Password must:</p>
                  <ul className="space-y-1">
                    <li className={`flex items-center ${validations.length ? "text-green-500" : "text-gray-400"}`}>
                      <span className="mr-2">{validations.length ? "✓" : "○"}</span>
                      Be at least 8 characters long
                    </li>
                    <li className={`flex items-center ${validations.uppercase ? "text-green-500" : "text-gray-400"}`}>
                      <span className="mr-2">{validations.uppercase ? "✓" : "○"}</span>
                      Include at least one uppercase letter
                    </li>
                    <li className={`flex items-center ${validations.lowercase ? "text-green-500" : "text-gray-400"}`}>
                      <span className="mr-2">{validations.lowercase ? "✓" : "○"}</span>
                      Include at least one lowercase letter
                    </li>
                    <li className={`flex items-center ${validations.number ? "text-green-500" : "text-gray-400"}`}>
                      <span className="mr-2">{validations.number ? "✓" : "○"}</span>
                      Include at least one number
                    </li>
                    <li className={`flex items-center ${validations.special ? "text-green-500" : "text-gray-400"}`}>
                      <span className="mr-2">{validations.special ? "✓" : "○"}</span>
                      Include at least one special character
                    </li>
                    <li className={`flex items-center ${validations.match ? "text-green-500" : "text-gray-400"}`}>
                      <span className="mr-2">{validations.match ? "✓" : "○"}</span>
                      Passwords match
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white"
                  disabled={loading || !Object.values(validations).every((valid) => valid)}
                >
                  {loading ? "Setting Password..." : "Set Password"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
