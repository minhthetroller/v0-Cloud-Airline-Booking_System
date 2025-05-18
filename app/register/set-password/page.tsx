"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  // Extract user ID from URL or session
  useEffect(() => {
    const fetchUserId = async () => {
      // First try to get userId from URL
      const urlUserId = searchParams.get("userId")

      if (urlUserId) {
        setUserId(urlUserId)
        return
      }

      // If not in URL, try to get from session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user?.id) {
        setUserId(session.user.id)
        return
      }

      // If still no userId, check if there's a token in the URL
      const token = searchParams.get("token")

      if (token) {
        try {
          // Try to exchange the token for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(token)

          if (error) throw error

          if (data?.user?.id) {
            setUserId(data.user.id)
            return
          }
        } catch (error) {
          console.error("Error exchanging token:", error)
        }
      }

      // If we still don't have a userId, show an error
      if (!userId) {
        setError("User ID not found. Please try the password reset link again or contact support.")
      }
    }

    fetchUserId()
  }, [searchParams, supabase])

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset states
    setError(null)
    setSuccess(false)

    // Check if userId exists
    if (!userId) {
      setError("User ID not found. Please try the password reset link again or contact support.")
      return
    }

    // Validate passwords
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      // Update password
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error

      setSuccess(true)

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/profile")
      }, 2000)
    } catch (error: any) {
      console.error("Error setting password:", error)
      setError(error.message || "Failed to set password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>Create a secure password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>Password set successfully! Redirecting...</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your new password"
                />
                <p className="text-xs text-gray-500">Password must be at least 8 characters long</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your new password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-6" disabled={loading || success}>
              {loading ? "Setting Password..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
