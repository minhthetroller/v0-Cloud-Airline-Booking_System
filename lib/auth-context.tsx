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
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  // Check authentication status on initial load and when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      // Check if user is logged in from localStorage (more persistent than sessionStorage)
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
      const userEmail = localStorage.getItem("userEmail")
      const customerId = localStorage.getItem("customerId")

      if (isLoggedIn && userEmail && customerId) {
        setUser({
          email: userEmail,
          customerId: customerId,
        })
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }

      setLoading(false)
    }

    // Check auth on initial load
    checkAuth()

    // Set up event listener for storage changes (for multi-tab support)
    window.addEventListener("storage", checkAuth)

    // Clean up event listener
    return () => {
      window.removeEventListener("storage", checkAuth)
    }
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

      // Store user info in localStorage for persistence across tabs and page refreshes
      localStorage.setItem("isLoggedIn", "true")
      localStorage.setItem("userEmail", email)
      localStorage.setItem("customerId", userCheck.customerid)

      // Update user state
      setUser({
        email: email,
        customerId: userCheck.customerid,
      })
      setIsAuthenticated(true)

      router.push("/profile")
    } catch (error: any) {
      throw error
    }
  }

  const signOut = async () => {
    // Clear localStorage
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("customerId")

    setUser(null)
    setIsAuthenticated(false)
    router.push("/")
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAuthenticated }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
