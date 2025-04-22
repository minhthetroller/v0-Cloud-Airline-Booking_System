import { NextResponse } from "next/server"
import supabaseClient from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get user record from users table
    const { data: userRecord, error: userRecordError } = await supabaseClient
      .from("users")
      .select("*")
      .eq("userid", userId)
      .single()

    if (userRecordError) {
      return NextResponse.json({ error: userRecordError.message }, { status: 500 })
    }

    // Get customer details
    const { data: customerData, error: customerError } = await supabaseClient
      .from("customers")
      .select("*")
      .eq("customerid", userRecord.customerid)
      .single()

    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 })
    }

    // Get booking history
    const { data: bookingData, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("customerid", userRecord.customerid)
      .order("bookingdate", { ascending: false })

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 })
    }

    // Determine tier based on points
    let tier = "Stratus"
    if (userRecord.pointsavailable > 10000) {
      tier = "Cirrus"
    } else if (userRecord.pointsavailable > 5000) {
      tier = "Altostratus"
    }

    return NextResponse.json({
      user: {
        id: userId,
        points: userRecord.pointsavailable,
        tier,
        accountStatus: userRecord.accountstatus,
      },
      customerDetails: customerData,
      bookings: bookingData || [],
    })
  } catch (error: any) {
    console.error("Error fetching profile data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, customerDetails } = body

    if (!userId || !customerDetails) {
      return NextResponse.json({ error: "User ID and customer details are required" }, { status: 400 })
    }

    // Get user record to find customer ID
    const { data: userRecord, error: userRecordError } = await supabaseClient
      .from("users")
      .select("customerid")
      .eq("userid", userId)
      .single()

    if (userRecordError) {
      return NextResponse.json({ error: userRecordError.message }, { status: 500 })
    }

    // Update customer details
    const { data, error } = await supabaseClient
      .from("customers")
      .update(customerDetails)
      .eq("customerid", userRecord.customerid)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error updating profile data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
