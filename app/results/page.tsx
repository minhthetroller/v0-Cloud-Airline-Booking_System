"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Info, Plane, Calendar, ChevronDown, ArrowRight, AlertCircle, X } from "lucide-react"
import Link from "next/link"
import { format, addDays, subDays, parseISO } from "date-fns"
import FlightResultsSkeleton from "@/components/flight-results-skeleton"
import PriceDetails from "@/components/price-details"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import supabaseClient from "@/lib/supabase"

interface Airport {
  airportcode: string
  airportname: string
  city: string
  country: string
}

interface FlightResult {
  flightid: number
  flightnumber: string
  departureairportcode: string
  arrivalairportcode: string
  departuredatetime: string
  arrivaldatetime: string
  status: string
  travelmiles: number
  departureAirport?: Airport
  arrivalAirport?: Airport
  economyPrice?: number | null
  firstClassPrice?: number | null
  duration?: string
  economyAvailability?: number
  firstClassAvailability?: number
  airplanetypeid?: number
}

interface SelectedFlightDetails {
  flightId: number
  class: string
  fareType: string
  price: number
  flightNumber?: string
  departureTime?: string
  arrivalTime?: string
  departureAirport?: string
  arrivalAirport?: string
  duration?: string
  airplanetypeid?: number
}

interface FlightPrice {
  flightid: number
  classid: number
  price: number
  availabilitycount: number
  currencycode: string
}

interface TicketClass {
  classid: number
  classname: string
}

interface DateOption {
  date: Date
  day: string
  dayOfMonth: string
  price: number | null
  formattedDate: string
  flightCount: number
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departureResults, setDepartureResults] = useState<FlightResult[]>([])
  const [returnResults, setReturnResults] = useState<FlightResult[]>([])
  const [airports, setAirports] = useState<Record<string, Airport>>({})
  const [ticketClasses, setTicketClasses] = useState<Record<number, string>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<SelectedFlightDetails | null>(null)
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<SelectedFlightDetails | null>(null)
  const [activeFlightId, setActiveFlightId] = useState<number | null>(null)
  const [activeClass, setActiveClass] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("departure")
  const [dates, setDates] = useState<DateOption[]>([])
  const [dataFetched, setDataFetched] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  // Get search parameters
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const tripType = searchParams.get("tripType") || "one-way"
  const departDate = searchParams.get("departDate") || ""
  const returnDate = searchParams.get("returnDate") || ""
  const isRoundTrip = tripType === "round-trip"
  const selectedClass = searchParams.get("class") || "economy"

  // Fetch airports data
  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const { data, error } = await supabaseClient.from("airports").select("airportcode, airportname, city, country")

        if (error) throw new Error(error.message)

        // Convert to a lookup object for easier access
        const airportsMap: Record<string, Airport> = {}
        data?.forEach((airport) => {
          airportsMap[airport.airportcode] = airport
        })

        setAirports(airportsMap)
      } catch (err) {
        console.error("Error fetching airports:", err)
        setError("Failed to load airport information")
      }
    }

    fetchAirports()
  }, [])

  // Fetch ticket classes
  useEffect(() => {
    const fetchTicketClasses = async () => {
      try {
        const { data, error } = await supabaseClient.from("ticketclasses").select("classid, classname")

        if (error) throw new Error(error.message)

        // Convert to a lookup object for easier access
        const classesMap: Record<number, string> = {}
        data?.forEach((ticketClass) => {
          classesMap[ticketClass.classid] = ticketClass.classname
        })

        setTicketClasses(classesMap)
      } catch (err) {
        console.error("Error fetching ticket classes:", err)
      }
    }

    fetchTicketClasses()
  }, [])

  // Fetch flights data
  const fetchFlights = useCallback(async () => {
    if (!from || !to || !departDate || dataFetched) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Parse the date strings to Date objects
      const departDateObj = departDate ? new Date(departDate) : null
      const returnDateObj = returnDate ? new Date(returnDate) : null

      // Format dates for database query (YYYY-MM-DD)
      const formattedDepartDate = departDateObj
        ? `${departDateObj.getFullYear()}-${String(departDateObj.getMonth() + 1).padStart(2, "0")}-${String(
            departDateObj.getDate(),
          ).padStart(2, "0")}`
        : null

      console.log("Searching for flights:", { from, to, departDate: formattedDepartDate })

      // Step 1: Fetch departure flights with proper date filtering
      let departureQuery = supabaseClient
        .from("flights")
        .select(`
          flightid, 
          flightnumber, 
          departureairportcode, 
          arrivalairportcode, 
          departuredatetime, 
          arrivaldatetime, 
          status,
          travelmiles
        `)
        .eq("departureairportcode", from)
        .eq("arrivalairportcode", to)

      // Add date filtering if a date was provided
      if (formattedDepartDate) {
        departureQuery = departureQuery
          .gte("departuredatetime", `${formattedDepartDate}T00:00:00`)
          .lt("departuredatetime", `${formattedDepartDate}T23:59:59`)
      }

      const { data: departureData, error: departureError } = await departureQuery

      if (departureError) throw new Error(departureError.message)

      // Step 2: Fetch return flights if round trip with similar filtering
      let returnData = null
      if (isRoundTrip && returnDateObj) {
        const formattedReturnDate = `${returnDateObj.getFullYear()}-${String(returnDateObj.getMonth() + 1).padStart(
          2,
          "0",
        )}-${String(returnDateObj.getDate()).padStart(2, "0")}`

        let returnQuery = supabaseClient
          .from("flights")
          .select(`
            flightid, 
            flightnumber, 
            departureairportcode, 
            arrivalairportcode, 
            departuredatetime, 
            arrivaldatetime, 
            status,
            travelmiles
          `)
          .eq("departureairportcode", to)
          .eq("arrivalairportcode", from)

        // Add date filtering for return flight
        if (formattedReturnDate) {
          returnQuery = returnQuery
            .gte("departuredatetime", `${formattedReturnDate}T00:00:00`)
            .lt("departuredatetime", `${formattedReturnDate}T23:59:59`)
        }

        const { data, error: returnError } = await returnQuery

        if (returnError) throw new Error(returnError.message)
        returnData = data
      }

      // Step 3: Get all flight IDs to check availability and prices
      const flightIds = [
        ...(departureData?.map((f) => f.flightid) || []),
        ...(returnData?.map((f) => f.flightid) || []),
      ]

      if (flightIds.length === 0) {
        setError("No flights found for the selected route and date")
        setLoading(false)
        setDataFetched(true)
        return
      }

      // Step 4: Fetch flight prices and availability in one query
      const { data: flightPricesData, error: flightPricesError } = await supabaseClient
        .from("flightprices")
        .select("flightid, classid, price, availabilitycount, currencycode")
        .in("flightid", flightIds)

      if (flightPricesError) throw new Error(flightPricesError.message)

      // Create maps for prices and availability by flight ID and class ID
      const priceMap: Record<number, Record<number, number>> = {}
      const availabilityMap: Record<number, Record<number, number>> = {}

      flightPricesData?.forEach((item) => {
        if (!priceMap[item.flightid]) {
          priceMap[item.flightid] = {}
          availabilityMap[item.flightid] = {}
        }
        priceMap[item.flightid][item.classid] = item.price
        availabilityMap[item.flightid][item.classid] = item.availabilitycount
      })

      // Step 5: Process departure flights with availability and price data
      const processedDepartureFlights =
        departureData?.map((flight) => {
          const departureTime = parseISO(flight.departuredatetime)
          const arrivalTime = parseISO(flight.arrivaldatetime)
          const durationMs = arrivalTime.getTime() - departureTime.getTime()
          const hours = Math.floor(durationMs / (1000 * 60 * 60))
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

          // Calculate total availability for Economy (classes 1, 2, 3)
          const economyAvailability =
            (availabilityMap[flight.flightid]?.[1] || 0) +
            (availabilityMap[flight.flightid]?.[2] || 0) +
            (availabilityMap[flight.flightid]?.[3] || 0)

          // Calculate total availability for First Class (classes 4, 5)
          const firstClassAvailability =
            (availabilityMap[flight.flightid]?.[4] || 0) + (availabilityMap[flight.flightid]?.[5] || 0)

          // Get lowest price for Economy (classes 1, 2, 3)
          const economyPrices = [
            priceMap[flight.flightid]?.[1],
            priceMap[flight.flightid]?.[2],
            priceMap[flight.flightid]?.[3],
          ].filter(Boolean)

          const economyPrice = economyPrices.length > 0 ? Math.min(...economyPrices) : null

          // Get lowest price for First Class (classes 4, 5)
          const firstClassPrices = [priceMap[flight.flightid]?.[4], priceMap[flight.flightid]?.[5]].filter(Boolean)

          const firstClassPrice = firstClassPrices.length > 0 ? Math.min(...firstClassPrices) : null

          return {
            ...flight,
            departureAirport: airports[flight.departureairportcode],
            arrivalAirport: airports[flight.arrivalairportcode],
            economyPrice,
            firstClassPrice,
            duration: `${hours}h ${minutes} mins`,
            economyAvailability,
            firstClassAvailability,
          }
        }) || []

      // Step 6: Process return flights with availability and price data
      const processedReturnFlights =
        returnData?.map((flight) => {
          const departureTime = parseISO(flight.departuredatetime)
          const arrivalTime = parseISO(flight.arrivaldatetime)
          const durationMs = arrivalTime.getTime() - departureTime.getTime()
          const hours = Math.floor(durationMs / (1000 * 60 * 60))
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

          // Calculate total availability for Economy (classes 1, 2, 3)
          const economyAvailability =
            (availabilityMap[flight.flightid]?.[1] || 0) +
            (availabilityMap[flight.flightid]?.[2] || 0) +
            (availabilityMap[flight.flightid]?.[3] || 0)

          // Calculate total availability for First Class (classes 4, 5)
          const firstClassAvailability =
            (availabilityMap[flight.flightid]?.[4] || 0) + (availabilityMap[flight.flightid]?.[5] || 0)

          // Get lowest price for Economy (classes 1, 2, 3)
          const economyPrices = [
            priceMap[flight.flightid]?.[1],
            priceMap[flight.flightid]?.[2],
            priceMap[flight.flightid]?.[3],
          ].filter(Boolean)

          const economyPrice = economyPrices.length > 0 ? Math.min(...economyPrices) : null

          // Get lowest price for First Class (classes 4, 5)
          const firstClassPrices = [priceMap[flight.flightid]?.[4], priceMap[flight.flightid]?.[5]].filter(Boolean)

          const firstClassPrice = firstClassPrices.length > 0 ? Math.min(...firstClassPrices) : null

          return {
            ...flight,
            departureAirport: airports[flight.departureairportcode],
            arrivalAirport: airports[flight.arrivalairportcode],
            economyPrice,
            firstClassPrice,
            duration: `${hours}h ${minutes} mins`,
            economyAvailability,
            firstClassAvailability,
          }
        }) || []

      setDepartureResults(processedDepartureFlights)
      setReturnResults(processedReturnFlights)
      setDataFetched(true)

      if (processedDepartureFlights.length === 0) {
        setError(`No flights found for the selected route and date`)
      }
    } catch (err: any) {
      console.error("Error fetching flights:", err)
      setError("Failed to load flight information")
      setDataFetched(true)
    } finally {
      setLoading(false)
    }
  }, [from, to, isRoundTrip, airports, departDate, returnDate, dataFetched])

  // Fetch flights when airports are loaded
  useEffect(() => {
    if (Object.keys(airports).length > 0 && !dataFetched) {
      fetchFlights()
    }
  }, [airports, fetchFlights, dataFetched])

  // Generate dates for the date selector with actual prices and flight counts
  useEffect(() => {
    const fetchPricesForDates = async () => {
      if (!from || !to || !selectedDate) return

      try {
        // Get selected travel class ID
        const classId = selectedClass === "first-class" ? 4 : 1

        const dates = Array.from({ length: 7 }, (_, i) => {
          return addDays(selectedDate, i - 3)
        })

        const formattedDates = dates.map((date) => {
          return {
            date,
            day: format(date, "EEE"),
            dayOfMonth: format(date, "MMM d"),
            price: null, // Will be populated with actual price
            formattedDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
              date.getDate(),
            ).padStart(2, "0")}`,
            flightCount: 0, // Will be populated with actual flight count
          }
        })

        // Query flights for this date
        const pricesPromises = formattedDates.map(async (dateObj) => {
          const { data: flightsData } = await supabaseClient
            .from("flights")
            .select(`flightid`)
            .eq("departureairportcode", from)
            .eq("arrivalairportcode", to)
            .gte("departuredatetime", `${dateObj.formattedDate}T00:00:00`)
            .lt("departuredatetime", `${dateObj.formattedDate}T23:59:59`)

          if (!flightsData || flightsData.length === 0) {
            return { ...dateObj, price: null, flightCount: 0 }
          }

          // Get flight IDs for this date
          const flightIds = flightsData.map((f) => f.flightid)
          const flightCount = flightIds.length

          // Get prices and availability for these flights
          const { data: priceData } = await supabaseClient
            .from("flightprices")
            .select("price, flightid")
            .in("flightid", flightIds)
            .eq("classid", classId)
            .order("price", { ascending: true })
            .limit(1)

          // Use the lowest price or a fallback
          const lowestPrice = priceData && priceData.length > 0 ? priceData[0].price : null

          return { ...dateObj, price: lowestPrice, flightCount }
        })

        const datesWithPrices = await Promise.all(pricesPromises)
        setDates(datesWithPrices)
      } catch (err) {
        console.error("Error fetching prices for dates:", err)
      }
    }

    fetchPricesForDates()
  }, [from, to, selectedDate, selectedClass])

  // Generate dates for the date selector
  const handlePreviousDays = () => {
    setSelectedDate(subDays(selectedDate, 7))
  }

  const handleNextDays = () => {
    setSelectedDate(addDays(selectedDate, 7))
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "Not Available"
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  const handleSelectClass = (flightId: number, classType: string) => {
    // Always set the active flight and class, never close it
    setActiveFlightId(flightId)
    setActiveClass(classType)
  }

  const handleSelectFare = (fareType: string, price: number) => {
    if (!activeFlightId || !activeClass) return

    // Find the flight details
    const isReturnFlight = activeTab === "return"
    const flight = isReturnFlight
      ? returnResults.find((f) => f.flightid === activeFlightId)
      : departureResults.find((f) => f.flightid === activeFlightId)

    if (!flight) return

    const flightDetails = {
      flightId: activeFlightId,
      class: activeClass,
      fareType,
      price,
      flightNumber: flight.flightnumber,
      departureTime: flight.departuredatetime,
      arrivalTime: flight.arrivaldatetime,
      departureAirport: flight.departureairportcode,
      arrivalAirport: flight.arrivalairportcode,
      duration: flight.duration,
      // Use a default airplanetypeid since it's not in the flights table
      airplanetypeid: 1, // Default to a standard airplane type
    }

    // Determine if this is a departure or return flight selection
    if (activeTab === "departure" || !isRoundTrip) {
      setSelectedDepartureFlight(flightDetails)

      // If round trip, automatically switch to return tab after selecting departure
      if (isRoundTrip && !selectedReturnFlight) {
        setActiveTab("return")
      }
    } else {
      setSelectedReturnFlight(flightDetails)
    }

    // Do NOT reset active selections - keep them open
    // setActiveFlightId(null);
    // setActiveClass(null);
  }

  const getTotalPrice = () => {
    let total = 0
    if (selectedDepartureFlight) {
      total += selectedDepartureFlight.price
    }
    if (selectedReturnFlight) {
      total += selectedReturnFlight.price
    }
    return total
  }

  const handleContinue = () => {
    if (isRoundTrip && (!selectedDepartureFlight || !selectedReturnFlight)) {
      alert("Please select both departure and return flights")
      return
    }

    if (!isRoundTrip && !selectedDepartureFlight) {
      alert("Please select a flight")
      return
    }

    // Store selected flight details in session storage
    sessionStorage.setItem("selectedDepartureFlight", JSON.stringify(selectedDepartureFlight))
    if (isRoundTrip && selectedReturnFlight) {
      sessionStorage.setItem("selectedReturnFlight", JSON.stringify(selectedReturnFlight))
    }

    // Navigate to seat selection page
    router.push("/seat-selection")
  }

  const renderFlightResults = (results: FlightResult[], isReturn = false) => {
    if (results.length === 0 && !loading) {
      return (
        <div className="rounded-lg bg-white p-6 text-center text-[#0f2d3c]">
          <p>No flights found for this route and date. Please try different dates or destinations.</p>
        </div>
      )
    }

    return (
      <section className="space-y-4">
        {results.map((flight) => {
          const isSelected = isReturn
            ? selectedReturnFlight?.flightId === flight.flightid
            : selectedDepartureFlight?.flightId === flight.flightid

          const departureTime = new Date(flight.departuredatetime)
          const arrivalTime = new Date(flight.arrivaldatetime)

          return (
            <div key={flight.flightid} className="overflow-hidden rounded-lg">
              <div className="bg-white p-4 text-[#0f2d3c]">
                <div className="grid grid-cols-12 gap-4">
                  {/* Flight numbers and info */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <span>{flight.flightnumber}</span>
                      <Info size={16} className="cursor-pointer text-blue-600" />
                    </div>
                    <div className="mt-2 text-sm">{format(departureTime, "MMM d, yyyy")}</div>
                    <div className="mt-1 text-xs text-gray-500">{flight.status}</div>
                  </div>

                  {/* Flight times and duration */}
                  <div className="col-span-6">
                    <div className="grid grid-cols-3 items-center">
                      <div className="text-left">
                        <div className="text-2xl font-bold">{format(departureTime, "HH:mm")}</div>
                        <div className="text-lg font-medium">{flight.departureairportcode}</div>
                        <div className="text-xs text-gray-500">
                          {flight.departureAirport?.city || flight.departureairportcode}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="relative">
                          <div className="flex items-center justify-center">
                            <div className="text-sm">{flight.duration}</div>
                          </div>
                          <div className="relative mt-2 flex items-center">
                            <div className="h-[1px] w-full flex-grow bg-gray-300"></div>
                            <Plane size={16} className="mx-2 rotate-90" />
                            <div className="h-[1px] w-full flex-grow bg-gray-300"></div>
                          </div>
                          <div className="mt-2 text-center text-sm">Direct</div>
                        </div>
                      </div>

                      <div className="text-right pr-4">
                        <div className="text-2xl font-bold">{format(arrivalTime, "HH:mm")}</div>
                        <div className="text-lg font-medium">{flight.arrivalairportcode}</div>
                        <div className="text-xs text-gray-500">
                          {flight.arrivalAirport?.city || flight.arrivalairportcode}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="col-span-4 grid grid-cols-2 gap-4">
                    {/* Economy */}
                    <div
                      className={`flex cursor-pointer flex-col items-center justify-center rounded p-2 transition-colors ${
                        activeFlightId === flight.flightid && activeClass === "economy"
                          ? "bg-[#6d7276] text-white"
                          : isSelected && selectedDepartureFlight?.class === "economy"
                            ? "bg-[#6d7276]/20"
                            : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleSelectClass(flight.flightid, "economy")}
                    >
                      <div className="text-center font-medium">Economy</div>
                      <div className="mt-4 text-center">
                        <div className="text-sm text-gray-500">from VND</div>
                        <div className="text-xl font-bold">
                          {flight.economyPrice ? formatCurrency(flight.economyPrice) : "Not Available"}
                        </div>
                      </div>
                      <div className="mt-2 text-xs">
                        {flight.economyAvailability! > 0 ? `${flight.economyAvailability} seats left` : "Sold out"}
                      </div>
                      <div
                        className={`mt-2 h-1 w-full rounded ${
                          activeFlightId === flight.flightid && activeClass === "economy" ? "bg-white" : "bg-[#6d7276]"
                        }`}
                      ></div>
                    </div>

                    {/* First Class */}
                    <div
                      className={`flex cursor-pointer flex-col items-center justify-center rounded p-2 transition-colors ${
                        activeFlightId === flight.flightid && activeClass === "first-class"
                          ? "bg-[#8a7a4e] text-white"
                          : isSelected && selectedDepartureFlight?.class === "first-class"
                            ? "bg-[#8a7a4e]/20"
                            : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleSelectClass(flight.flightid, "first-class")}
                    >
                      <div className="text-center font-medium">First Class</div>
                      <div className="mt-4 text-center">
                        <div className="text-sm text-gray-500">from VND</div>
                        <div className="text-xl font-bold">
                          {flight.firstClassPrice ? formatCurrency(flight.firstClassPrice) : "Not Available"}
                        </div>
                      </div>
                      <div className="mt-2 text-xs">
                        {flight.firstClassAvailability! > 0
                          ? `${flight.firstClassAvailability} seats left`
                          : "Sold out"}
                      </div>
                      <div
                        className={`mt-2 h-1 w-full rounded ${
                          activeFlightId === flight.flightid && activeClass === "first-class"
                            ? "bg-white"
                            : "bg-[#8a7a4e]"
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price details section that slides down */}
              {activeFlightId === flight.flightid && activeClass && (
                <PriceDetails
                  flightId={flight.flightid.toString()}
                  selectedClass={activeClass}
                  onClose={() => {
                    setActiveFlightId(null)
                    setActiveClass(null)
                  }}
                  onSelect={handleSelectFare}
                  availabilityCount={
                    activeClass === "economy" ? flight.economyAvailability : flight.firstClassAvailability
                  }
                />
              )}
            </div>
          )
        })}
      </section>
    )
  }

  // Format for display
  const fromDisplay = airports[from]?.city || from
  const toDisplay = airports[to]?.city || to

  useEffect(() => {
    if (departDate) {
      setSelectedDate(new Date(departDate))
    }
  }, [departDate])

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {isRoundTrip ? "Round trip" : "One way"}: {fromDisplay} - {toDisplay}
            </h1>
            <Link href="#" className="flex items-center gap-1 text-sm">
              <span className="text-yellow-400">
                <Calendar className="h-5 w-5" />
              </span>
              See a month fare
            </Link>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-500/10 text-white border-red-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Date selector */}
        <section className="mb-6 overflow-hidden rounded-lg bg-white">
          <div className="flex items-center justify-between bg-gray-100 px-4 py-3 text-[#0f2d3c]">
            <button onClick={handlePreviousDays} className="flex items-center gap-1 text-sm font-medium">
              <ChevronLeft size={16} />
              Previous 7 days
            </button>
            <button onClick={handleNextDays} className="flex items-center gap-1 text-sm font-medium">
              Next 7 days
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7">
            {dates.map((date) => {
              // Check if this date matches the search date (departDate)
              const searchDateObj = departDate ? new Date(departDate) : new Date()
              const isSelected = date.formattedDate === format(searchDateObj, "yyyy-MM-dd")
              return (
                <div
                  key={date.dayOfMonth}
                  className={`cursor-pointer p-4 text-center ${
                    isSelected ? "bg-[#3a2d4c] text-white" : "bg-[#f8f0ff] text-[#0f2d3c] hover:bg-[#e8e0ef]"
                  }`}
                >
                  <div className="font-medium">
                    {date.day}, {date.dayOfMonth}
                  </div>
                  <div className="mt-1 text-sm">
                    {date.flightCount > 0
                      ? `${date.flightCount} Flight${date.flightCount > 1 ? "s" : ""}`
                      : "No flights"}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {loading ? (
          <FlightResultsSkeleton />
        ) : isRoundTrip ? (
          <Tabs defaultValue="departure" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-[#0f2d3c]/50">
              <TabsTrigger value="departure" className={`${selectedDepartureFlight ? "text-green-400" : ""}`}>
                Departure Flight {selectedDepartureFlight && "✓"}
              </TabsTrigger>
              <TabsTrigger value="return" className={`${selectedReturnFlight ? "text-green-400" : ""}`}>
                Return Flight {selectedReturnFlight && "✓"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="departure">
              <div className="mb-4 flex items-center gap-2 text-lg">
                <span>{fromDisplay}</span>
                <ArrowRight className="h-4 w-4" />
                <span>{toDisplay}</span>
              </div>
              {renderFlightResults(departureResults)}
            </TabsContent>
            <TabsContent value="return">
              <div className="mb-4 flex items-center gap-2 text-lg">
                <span>{toDisplay}</span>
                <ArrowRight className="h-4 w-4" />
                <span>{fromDisplay}</span>
              </div>
              {renderFlightResults(returnResults, true)}
            </TabsContent>
          </Tabs>
        ) : (
          renderFlightResults(departureResults)
        )}
      </div>

      {/* Flight Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Flight Details</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">Departure Flight</h3>
              {selectedDepartureFlight && (
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Flight:</span> {selectedDepartureFlight.flightNumber}
                  </p>
                  <p>
                    <span className="font-medium">From:</span> {selectedDepartureFlight.departureAirport} (
                    {format(new Date(selectedDepartureFlight.departureTime!), "HH:mm, MMM d")})
                  </p>
                  <p>
                    <span className="font-medium">To:</span> {selectedDepartureFlight.arrivalAirport} (
                    {format(new Date(selectedDepartureFlight.arrivalTime!), "HH:mm, MMM d")})
                  </p>
                  <p>
                    <span className="font-medium">Duration:</span> {selectedDepartureFlight.duration}
                  </p>
                  <p>
                    <span className="font-medium">Class:</span> {selectedDepartureFlight.fareType}
                  </p>
                  <p>
                    <span className="font-medium">Price:</span> VND {formatCurrency(selectedDepartureFlight.price)}
                  </p>
                </div>
              )}
            </div>

            {isRoundTrip && selectedReturnFlight && (
              <div className="space-y-2">
                <h3 className="font-medium">Return Flight</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Flight:</span> {selectedReturnFlight.flightNumber}
                  </p>
                  <p>
                    <span className="font-medium">From:</span> {selectedReturnFlight.departureAirport} (
                    {format(new Date(selectedReturnFlight.departureTime!), "HH:mm, MMM d")})
                  </p>
                  <p>
                    <span className="font-medium">To:</span> {selectedReturnFlight.arrivalAirport} (
                    {format(new Date(selectedReturnFlight.arrivalTime!), "HH:mm, MMM d")})
                  </p>
                  <p>
                    <span className="font-medium">Duration:</span> {selectedReturnFlight.duration}
                  </p>
                  <p>
                    <span className="font-medium">Class:</span> {selectedReturnFlight.fareType}
                  </p>
                  <p>
                    <span className="font-medium">Price:</span> VND {formatCurrency(selectedReturnFlight.price)}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="font-medium">Total Price: VND {formatCurrency(getTotalPrice())}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sticky bar at the bottom */}
      {(selectedDepartureFlight || selectedReturnFlight) && (
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDetailsDialogOpen(true)}
                className="flex items-center text-[#0f2d3c] hover:text-[#0f2d3c]/70 transition-colors"
              >
                <span className="font-medium">Details</span>
                <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              <div className="text-xl font-bold text-[#0f2d3c]">
                Total: VND {formatCurrency(getTotalPrice())}
                {isRoundTrip && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({selectedDepartureFlight ? formatCurrency(selectedDepartureFlight.price) : "0"} +{" "}
                    {selectedReturnFlight ? formatCurrency(selectedReturnFlight.price) : "0"})
                  </span>
                )}
              </div>
            </div>
            <Button
              className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90"
              onClick={handleContinue}
              disabled={isRoundTrip && (!selectedDepartureFlight || !selectedReturnFlight)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
