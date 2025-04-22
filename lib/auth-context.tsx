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
      setUser(session?.user || null)
      setLoading(false)

      const {
        data: { subscription },
      } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null)
      })

      return () => {
        subscription.unsubscribe()
      }
    }

    checkUser()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    router.push("/profile")
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
