"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import supabaseClient from "@/lib/supabase"

interface User {
  email: string
  customerId: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in from session storage
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true"
    const userEmail = sessionStorage.getItem("userEmail")
    const customerId = sessionStorage.getItem("customerId")

    if (isLoggedIn && userEmail && customerId) {
      setUser({
        email: userEmail,
        customerId: customerId,
      })
    } else {
      setUser(null)
    }

    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      // Check if the user exists and is verified in our database
      const { data: userCheck, error: userCheckError } = await supabaseClient
        .from("users")
        .select("accountstatus, passwordhash, customerid")
        .eq("username", email)
        .single()

      if (userCheckError) {
        throw new Error("Invalid email or password")
      }

      // Check if the account is verified
      if (userCheck.accountstatus !== "verified") {
        throw new Error("Please verify your account before logging in")
      }

      // Check if the password matches
      if (userCheck.passwordhash !== password) {
        throw new Error("Invalid email or password")
      }

      // Store user info in session storage
      sessionStorage.setItem("isLoggedIn", "true")
      sessionStorage.setItem("userEmail", email)
      sessionStorage.setItem("customerId", userCheck.customerid)

      // Update user state
      setUser({
        email: email,
        customerId: userCheck.customerid,
      })

      router.push("/profile")
    } catch (error: any) {
      throw error
    }
  }

  const signOut = async () => {
    // Clear session storage
    sessionStorage.removeItem("isLoggedIn")
    sessionStorage.removeItem("userEmail")
    sessionStorage.removeItem("customerId")

    setUser(null)
    router.push("/")
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
