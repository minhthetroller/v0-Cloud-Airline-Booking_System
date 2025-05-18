"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import SeatMap from "@/components/seat-map"
import DefaultSeatMap from "@/components/default-seat-map"
import { Button } from "@/components/ui/button"
import type { SelectedFlightDetails } from "@/types/flight"
import type { Seat } from "@/types/seat"
import type { PassengerSeat } from "@/types/passenger-seat"

export default function SeatSelectionPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [selectedSeats, setSelectedSeats] = useState<PassengerSeat[]>([])
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<SelectedFlightDetails | null>(null)
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<SelectedFlightDetails | null>(null)
  const [departureFlightId, setDepartureFlightId] = useState<string | null>(null)
  const [returnFlightId, setReturnFlightId] = useState<string | null>(null)
  const [departureSeats, setDepartureSeats] = useState<Seat[]>([])
  const [returnSeats, setReturnSeats] = useState<Seat[]>([])
  const [passengerCount, setPassengerCount] = useState<number>(0)
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [airplaneType, setAirplaneType] = useState<any | null>(null)
  const [occupiedSeats, setOccupiedSeats] = useState<Set<string>>(new Set())
  const [activeFlightType, setActiveFlightType] = useState<"departure" | "return">("departure")
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
  const [userClassId, setUserClassId] = useState<number>(1) // Default to Economy Saver
  const [loginOrGuestDialogOpen, setLoginOrGuestDialogOpen] = useState(false)
  const [fareType, setFareType] = useState<string>("Economy Saver")

  useEffect(() => {
    const fetchFlightDetails = async () => {
      try {
        const storedDepartureFlightId = sessionStorage.getItem("selectedDepartureFlight")
        const storedReturnFlightId = sessionStorage.getItem("selectedReturnFlight")
        const storedPassengerCount = sessionStorage.getItem("passengerCount")

        if (storedDepartureFlightId) {
          setDepartureFlightId(storedDepartureFlightId)
          const parsedDepartureFlight = JSON.parse(storedDepartureFlightId)
          setSelectedDepartureFlight(parsedDepartureFlight)
          setFareType(parsedDepartureFlight.fareType)

          // Fetch departure flight seats
          const { data: departureSeatsData, error: departureSeatsError } = await supabase
            .from("seats")
            .select("*")
            .eq("flight_id", storedDepartureFlightId)

          if (departureSeatsError) throw departureSeatsError
          setDepartureSeats(departureSeatsData || [])
        }

        if (storedReturnFlightId) {
          setReturnFlightId(storedReturnFlightId)
          setIsRoundTrip(true)
          const parsedReturnFlight = JSON.parse(storedReturnFlightId)
          setSelectedReturnFlight(parsedReturnFlight)

          // Fetch return flight seats
          const { data: returnSeatsData, error: returnSeatsError } = await supabase
            .from("seats")
            .select("*")
            .eq("flight_id", storedReturnFlightId)

          if (returnSeatsError) throw returnSeatsError
          setReturnSeats(returnSeatsData || [])
        }

        if (storedPassengerCount) {
          setPassengerCount(Number.parseInt(storedPassengerCount))
        }
      } catch (error: any) {
        console.error("Error fetching flight details:", error.message)
        setError("Failed to load seat information. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchFlightDetails()
  }, [supabase])

  const handleSeatSelect = (seat: Seat, isReturn = false) => {
    const currentSeats = [...selectedSeats]
    const seatIndex = currentSeats.findIndex((s) => s.seatid === seat.seatid && s.isReturn === isReturn)

    if (seatIndex >= 0) {
      // Remove seat if already selected
      currentSeats.splice(seatIndex, 1)
    } else {
      // Check if we've reached the passenger limit
      if (currentSeats.filter((s) => s.isReturn === isReturn).length >= passengerCount) {
        alert(`You can only select ${passengerCount} seats for ${isReturn ? "return" : "departure"} flight.`)
        return
      }

      // Add seat
      currentSeats.push({
        seatid: seat.seatid,
        seatnumber: seat.seatnumber,
        classid: seat.classid,
        seattype: seat.seattype,
        airplanetypeid: seat.airplanetypeid,
        isReturn,
      })
    }

    setSelectedSeats(currentSeats)
  }

  const handleContinue = async () => {
    try {
      // Validate seat selection
      const departureSeatsSelected = selectedSeats.filter((seat) => !seat.isReturn).length
      const returnSeatsSelected = selectedSeats.filter((seat) => seat.isReturn).length

      if (departureSeatsSelected !== passengerCount) {
        alert(`Please select exactly ${passengerCount} seats for departure flight.`)
        return
      }

      if (isRoundTrip && returnSeatsSelected !== passengerCount) {
        alert(`Please select exactly ${passengerCount} seats for return flight.`)
        return
      }

      // Store selected seats in session storage
      sessionStorage.setItem("selectedSeats", JSON.stringify(selectedSeats))

      // Update seats as occupied in the database
      const updatePromises = selectedSeats.map(async (seat) => {
        const { error } = await supabase.from("seats").update({ isoccupied: true }).eq("id", seat.seatid)

        if (error) throw error
      })

      await Promise.all(updatePromises)

      // Navigate to next page
      const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true"
      if (isLoggedIn) {
        router.push("/passenger-information")
      } else {
        router.push("/guest-information")
      }
    } catch (error: any) {
      console.error("Error updating seats:", error.message)
      setError("Failed to save your seat selection. Please try again.")
    }
  }

  const handleSwitchFlight = () => {
    setActiveFlightType(activeFlightType === "departure" ? "return" : "departure")
  }

  const handleUpgradeClass = (newClassId: number) => {
    // Update the user's class ID
    setUserClassId(newClassId)

    // Update the fare type based on the new class ID
    let newFareType = "Economy Saver"
    if (newClassId === 1) newFareType = "Economy Saver"
    else if (newClassId === 2) newFareType = "Economy Flex"
    else if (newClassId === 3) newFareType = "Premium Economy"
    else if (newClassId === 4) newFareType = "Business"
    else if (newClassId === 5) newFareType = "First Class"

    setFareType(newFareType)

    // Update the flight details with the new fare type
    if (activeFlightType === "departure" && selectedDepartureFlight) {
      const updatedFlight = { ...selectedDepartureFlight, fareType: newFareType }
      setSelectedDepartureFlight(updatedFlight)
      sessionStorage.setItem("selectedDepartureFlight", JSON.stringify(updatedFlight))
    } else if (activeFlightType === "return" && selectedReturnFlight) {
      const updatedFlight = { ...selectedReturnFlight, fareType: newFareType }
      setSelectedReturnFlight(updatedFlight)
      sessionStorage.setItem("selectedReturnFlight", JSON.stringify(updatedFlight))
    }
  }

  const handleDowngradeClass = (newClassId: number) => {
    // Update the user's class ID
    setUserClassId(newClassId)

    // Update the fare type based on the new class ID
    let newFareType = "Economy Saver"
    if (newClassId === 1) newFareType = "Economy Saver"
    else if (newClassId === 2) newFareType = "Economy Flex"
    else if (newClassId === 3) newFareType = "Premium Economy"
    else if (newClassId === 4) newFareType = "Business"
    else if (newClassId === 5) newFareType = "First Class"

    setFareType(newFareType)

    // Update the flight details with the new fare type
    if (activeFlightType === "departure" && selectedDepartureFlight) {
      const updatedFlight = { ...selectedDepartureFlight, fareType: newFareType }
      setSelectedDepartureFlight(updatedFlight)
      sessionStorage.setItem("selectedDepartureFlight", JSON.stringify(updatedFlight))
    } else if (activeFlightType === "return" && selectedReturnFlight) {
      const updatedFlight = { ...selectedReturnFlight, fareType: newFareType }
      setSelectedReturnFlight(updatedFlight)
      sessionStorage.setItem("selectedReturnFlight", JSON.stringify(updatedFlight))
    }
  }

  const handleCancelBooking = async () => {
    // Release all seat reservations
    try {
      // Release departure seats
      for (const seat of selectedSeats.filter((s) => !s.isReturn)) {
        if (selectedDepartureFlight) {
          await supabase.from("seats").update({ isoccupied: false }).eq("id", seat.seatid)
        }
      }

      // Release return seats
      for (const seat of selectedSeats.filter((s) => s.isReturn)) {
        if (selectedReturnFlight) {
          await supabase.from("seats").update({ isoccupied: false }).eq("id", seat.seatid)
        }
      }

      // Clear session storage and redirect to home
      sessionStorage.removeItem("selectedDepartureFlight")
      sessionStorage.removeItem("selectedReturnFlight")
      sessionStorage.removeItem("selectedSeats")
      router.push("/")
    } catch (err) {
      console.error("Error releasing seat reservations:", err)
    }
  }

  // Clean up reservations when component unmounts
  useEffect(() => {
    return () => {
      // Release seat reservations if navigating away without completing booking
      const cleanup = async () => {
        try {
          // Release departure seats
          for (const seat of selectedSeats.filter((s) => !s.isReturn)) {
            if (selectedDepartureFlight) {
              await supabase.from("seats").update({ isoccupied: false }).eq("id", seat.seatid)
            }
          }

          // Release return seats
          for (const seat of selectedSeats.filter((s) => s.isReturn)) {
            if (selectedReturnFlight) {
              await supabase.from("seats").update({ isoccupied: false }).eq("id", seat.seatid)
            }
          }
        } catch (err) {
          console.error("Error releasing seat reservations during cleanup:", err)
        }
      }

      cleanup()
    }
  }, [selectedSeats, selectedDepartureFlight, selectedReturnFlight])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading seat information...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Select Your Seats</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Departure Flight</h2>
        {departureSeats.length > 0 ? (
          <SeatMap
            seats={departureSeats}
            selectedSeats={selectedSeats.filter((s) => !s.isReturn).map((s) => s.seatid)}
            onSeatSelect={(seat) => handleSeatSelect(seat)}
            userClassId={userClassId}
            onUpgradeClass={handleUpgradeClass}
            onDowngradeClass={handleDowngradeClass}
          />
        ) : (
          <DefaultSeatMap
            onSeatSelect={(seat) => handleSeatSelect(seat)}
            selectedSeats={selectedSeats.filter((s) => !s.isReturn).map((s) => s.seatid)}
          />
        )}
        <div className="mt-2">
          Selected departure seats:{" "}
          {selectedSeats
            .filter((s) => !s.isReturn)
            .map((s) => s.seatnumber)
            .join(", ")}
        </div>
      </div>

      {isRoundTrip && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Return Flight</h2>
          {returnSeats.length > 0 ? (
            <SeatMap
              seats={returnSeats}
              selectedSeats={selectedSeats.filter((s) => s.isReturn).map((s) => s.seatid)}
              onSeatSelect={(seat) => handleSeatSelect(seat, true)}
              userClassId={userClassId}
              onUpgradeClass={handleUpgradeClass}
              onDowngradeClass={handleDowngradeClass}
            />
          ) : (
            <DefaultSeatMap
              onSeatSelect={(seat) => handleSeatSelect(seat, true)}
              selectedSeats={selectedSeats.filter((s) => s.isReturn).map((s) => s.seatid)}
            />
          )}
          <div className="mt-2">
            Selected return seats:{" "}
            {selectedSeats
              .filter((s) => s.isReturn)
              .map((s) => s.seatnumber)
              .join(", ")}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  )
}
