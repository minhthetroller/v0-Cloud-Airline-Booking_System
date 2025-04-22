"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import supabaseClient from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

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
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession()

      if (session?.user) {
        // Check if user exists in our database and is verified
        const { data: userCheck, error: userCheckError } = await supabaseClient
          .from("users")
          .select("accountstatus")
          .eq("username", session.user.email)
          .single()

        if (!userCheckError && userCheck && userCheck.accountstatus === "verified") {
          setUser(session.user)
        } else {
          // If user is not verified or doesn't exist in our database, sign them out
          await supabaseClient.auth.signOut()
          setUser(null)
        }
      } else {
        setUser(null)
      }

      setLoading(false)

      const {
        data: { subscription },
      } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          // Check if user exists in our database and is verified
          const { data: userCheck, error: userCheckError } = await supabaseClient
            .from("users")
            .select("accountstatus")
            .eq("username", session.user.email)
            .single()

          if (!userCheckError && userCheck && userCheck.accountstatus === "verified") {
            setUser(session.user)
          } else {
            // If user is not verified or doesn't exist in our database, sign them out
            await supabaseClient.auth.signOut()
            setUser(null)
          }
        } else {
          setUser(null)
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    }

    checkUser()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      // First check if the user exists and is verified in our database
      const { data: userCheck, error: userCheckError } = await supabaseClient
        .from("users")
        .select("accountstatus")
        .eq("username", email)
        .single()

      if (userCheckError) {
        throw new Error("Invalid email or password")
      }

      // Check if the account is verified
      if (userCheck && userCheck.accountstatus !== "verified") {
        throw new Error("Please verify your account before logging in")
      }

      // Proceed with authentication
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      router.push("/profile")
    } catch (error: any) {
      throw error
    }
  }

  const signOut = async () => {
    await supabaseClient.auth.signOut()
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
