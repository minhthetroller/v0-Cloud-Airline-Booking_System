"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await signIn(email, password)
      onClose()
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Failed to sign in. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left side with logo and text */}
          <div className="bg-[#f8f5f2] p-8 flex flex-col items-center justify-center text-center md:w-2/5">
            <div className="mb-6">
              <Image src="/logo.png" alt="COSMILE Logo" width={180} height={60} className="h-12 w-auto" />
            </div>
            <p className="text-sm text-[#0f2d3c]">We invite you to experience</p>
            <p className="text-sm text-[#0f2d3c]">The premium frequent flyer program of STARLUX Airlines</p>
          </div>

          {/* Right side with login form */}
          <div className="p-6 md:p-8 md:w-3/5">
            <h2 className="text-2xl font-bold text-center mb-6 text-[#0f2d3c]">Login</h2>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="COSMILE ID or e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2 relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-me" className="text-sm text-gray-600">
                    Remember my COSMILE ID or e-mail
                  </Label>
                </div>
              </div>

              <div className="text-right">
                <Link href="/forgot-password" className="text-sm text-[#0f2d3c] hover:underline">
                  Forgot password
                </Link>
              </div>

              <Button type="submit" className="w-full bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Not a COSMILE member yet?{" "}
                  <Link href="/register" className="text-[#0f2d3c] font-medium hover:underline">
                    Join COSMILE
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
