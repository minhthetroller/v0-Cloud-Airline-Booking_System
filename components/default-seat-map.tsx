"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DefaultSeatMapProps {
  onSelectSeat: (seat: any) => void
  selectedSeat: any | null
  userClassId?: number
}

export default function DefaultSeatMap({ onSelectSeat, selectedSeat, userClassId = 1 }: DefaultSeatMapProps) {
  const [occupiedSeats] = useState<Set<string>>(
    new Set([
      "3A",
      "3B",
      "3C",
      "4D",
      "4E",
      "4F",
      "5B",
      "5E",
      "6C",
      "6D",
      "7A",
      "7F",
      "8B",
      "8E",
      "9C",
      "9D",
      "10A",
      "10F",
    ]),
  )
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [seatToUpgrade, setSeatToUpgrade] = useState<any | null>(null)

  // Define seat classes
  const seatClasses: Record<number, { name: string; color: string }> = {
    1: { name: "Economy Saver", color: "bg-red-100 hover:bg-red-200" },
    2: { name: "Economy Flex", color: "bg-orange-100 hover:bg-orange-200" },
    3: { name: "Premium Economy", color: "bg-yellow-100 hover:bg-yellow-200" },
    4: { name: "Business", color: "bg-blue-100 hover:bg-blue-200" },
    5: { name: "First Class", color: "bg-purple-100 hover:bg-purple-200" },
  }

  // Define rows and columns
  const allRows = Array.from({ length: 30 }, (_, i) => i + 1) // Rows 1-30
  const columns = ["A", "B", "C", "D", "E", "F"] // Columns A-F

  // Divide rows into three columns
  const divideRowsIntoColumns = () => {
    const rowsPerColumn = Math.ceil(allRows.length / 3)

    return [
      allRows.slice(0, rowsPerColumn),
      allRows.slice(rowsPerColumn, rowsPerColumn * 2),
      allRows.slice(rowsPerColumn * 2),
    ]
  }

  const columnGroups = divideRowsIntoColumns()

  // Determine seat class based on row number
  const getSeatClass = (row: number) => {
    if (row <= 2) return 5 // First Class
    if (row <= 5) return 4 // Business
    if (row <= 10) return 3 // Premium Economy
    if (row <= 20) return 2 // Economy Flex
    return 1 // Economy Saver
  }

  const getSeatColor = (seatNumber: string) => {
    const row = Number.parseInt(seatNumber)

    // If seat is selected
    if (selectedSeat && selectedSeat.seatnumber === seatNumber) {
      return "bg-blue-500 text-white"
    }

    // If seat is occupied
    if (occupiedSeats.has(seatNumber)) {
      return "bg-red-500 text-white cursor-not-allowed"
    }

    // If seat is blocked (special seats like emergency exits)
    if (seatNumber.startsWith("3") || seatNumber.startsWith("13")) {
      return "bg-yellow-300 text-black"
    }

    // Available seats - color by class
    const classId = getSeatClass(row)
    return seatClasses[classId]?.color || "bg-green-500 text-black hover:bg-green-600 cursor-pointer"
  }

  const handleSeatClick = (row: number, col: string) => {
    const seatNumber = `${row}${col}`
    if (occupiedSeats.has(seatNumber)) return

    const classId = getSeatClass(row)

    // Check if user is trying to select a seat with a higher class than their ticket
    // Higher classId means higher class (e.g., First Class is 5, Economy Saver is 1)
    if (classId > (userClassId || 1)) {
      const seat = {
        seatid: Math.floor(Math.random() * 1000), // Generate a random ID
        seatnumber: seatNumber,
        classid: classId,
        seattype: "standard",
        airplanetypeid: 1,
      }

      setSeatToUpgrade(seat)
      setUpgradeDialogOpen(true)
      return
    }

    const seat = {
      seatid: Math.floor(Math.random() * 1000), // Generate a random ID
      seatnumber: seatNumber,
      classid: classId,
      seattype: "standard",
      airplanetypeid: 1,
    }

    onSelectSeat(seat)
  }

  const handleUpgradeConfirm = () => {
    if (seatToUpgrade) {
      onSelectSeat(seatToUpgrade)
    }
    setUpgradeDialogOpen(false)
    setSeatToUpgrade(null)
  }

  const handleUpgradeCancel = () => {
    setUpgradeDialogOpen(false)
    setSeatToUpgrade(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {columnGroups.map((columnRows, columnIndex) => (
          <div key={`column-${columnIndex}`} className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-center font-bold mb-4">
              Rows {columnRows[0]} - {columnRows[columnRows.length - 1]}
            </h3>

            {/* Column headers */}
            <div className="flex justify-center mb-2">
              <div className="w-8"></div> {/* Empty space for row numbers */}
              {columns.map((col) => (
                <div key={col} className="w-8 text-center font-bold">
                  {col}
                </div>
              ))}
            </div>

            {/* Seat rows for this column */}
            {columnRows.map((row) => (
              <div key={row} className="flex items-center mb-2">
                <div className="w-8 text-center font-bold">{row}</div>
                {columns.map((col, colIndex) => {
                  const seatNumber = `${row}${col}`
                  const classId = getSeatClass(row)

                  // Add an aisle between columns C and D
                  if (colIndex === 3) {
                    return (
                      <>
                        <div key={`aisle-${row}-${col}`} className="w-4"></div>
                        <div
                          key={`${row}-${col}`}
                          className={`w-8 h-8 mx-1 flex items-center justify-center rounded ${getSeatColor(seatNumber)}`}
                          onClick={() => !occupiedSeats.has(seatNumber) && handleSeatClick(row, col)}
                          title={`${seatNumber} - ${seatClasses[classId]?.name || "Unknown Class"}`}
                        >
                          {col}
                        </div>
                      </>
                    )
                  }

                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`w-8 h-8 mx-1 flex items-center justify-center rounded ${getSeatColor(seatNumber)}`}
                      onClick={() => !occupiedSeats.has(seatNumber) && handleSeatClick(row, col)}
                      title={`${seatNumber} - ${seatClasses[classId]?.name || "Unknown Class"}`}
                    >
                      {col}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Class color legend */}
      <div className="mt-8 border-t pt-4">
        <h3 className="font-bold mb-2">Seat Classes</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 rounded"></div>
            <span>Economy Saver</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-100 rounded"></div>
            <span>Economy Flex</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-100 rounded"></div>
            <span>Premium Economy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded"></div>
            <span>Business</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-100 rounded"></div>
            <span>First Class</span>
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              The seat you selected ({seatToUpgrade?.seatnumber}) is in a higher class (
              {seatClasses[seatToUpgrade?.classid || 0]?.name}) than your current ticket (
              {seatClasses[userClassId || 1]?.name}). Would you like to upgrade your ticket?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleUpgradeCancel}>
              Cancel
            </Button>
            <Button onClick={handleUpgradeConfirm}>Upgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
