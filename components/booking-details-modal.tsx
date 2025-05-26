"use client"

import type React from "react"
import { useState } from "react"
import { Modal, Button, Typography, Box, Divider } from "@mui/material"
import { styled } from "@mui/system"

const StyledModal = styled(Modal)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
})

const StyledModalContent = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: "2px solid #000",
  boxShadow: theme.shadows[5],
  padding: theme.spacing(2, 4, 3),
  width: "80%",
  maxWidth: "600px",
  borderRadius: "8px",
}))

interface BookingDetails {
  bookingId: string
  flightNumber: string
  departure: string
  arrival: string
  departureTime: string
  arrivalTime: string
  passengers: { name: string; age: number }[]
  totalPrice: number
  paymentMethod: string
  bookingDate: string
}

interface BookingDetailsModalProps {
  open: boolean
  onClose: () => void
  bookingDetails: BookingDetails | null
  onCancelBooking: (bookingId: string) => void
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  open,
  onClose,
  bookingDetails,
  onCancelBooking,
}) => {
  const [isCanceling, setIsCanceling] = useState(false)

  const handleCancel = () => {
    if (bookingDetails) {
      setIsCanceling(true)
      onCancelBooking(bookingDetails.bookingId)
      setIsCanceling(false)
      onClose()
    }
  }

  if (!bookingDetails) {
    return null // Or display a loading state or error message
  }

  return (
    <StyledModal
      open={open}
      onClose={onClose}
      aria-labelledby="booking-details-modal"
      aria-describedby="details-of-the-booking"
    >
      <StyledModalContent>
        <Typography id="booking-details-modal" variant="h6" component="h2">
          Booking Details
        </Typography>
        <Divider style={{ margin: "10px 0" }} />

        <Typography variant="subtitle1">
          <b>Booking ID:</b> {bookingDetails.bookingId}
        </Typography>
        <Typography variant="subtitle1">
          <b>Booking Date:</b> {bookingDetails.bookingDate}
        </Typography>

        <Typography variant="h6" style={{ marginTop: "16px" }}>
          Flight Details
        </Typography>
        <Divider style={{ margin: "10px 0" }} />
        <Typography variant="subtitle1">
          <b>Flight Number:</b> {bookingDetails.flightNumber}
        </Typography>
        <Typography variant="subtitle1">
          <b>Departure:</b> {bookingDetails.departure} ({bookingDetails.departureTime})
        </Typography>
        <Typography variant="subtitle1">
          <b>Arrival:</b> {bookingDetails.arrival} ({bookingDetails.arrivalTime})
        </Typography>

        <Typography variant="h6" style={{ marginTop: "16px" }}>
          Passenger Information
        </Typography>
        <Divider style={{ margin: "10px 0" }} />
        {bookingDetails.passengers.map((passenger, index) => (
          <Box key={index} style={{ marginBottom: "8px" }}>
            <Typography variant="subtitle1">
              <b>Passenger {index + 1}:</b>
            </Typography>
            <Typography variant="body2">
              <b>Name:</b> {passenger.name}
            </Typography>
            <Typography variant="body2">
              <b>Age:</b> {passenger.age}
            </Typography>
          </Box>
        ))}

        <Typography variant="h6" style={{ marginTop: "16px" }}>
          Payment Information
        </Typography>
        <Divider style={{ margin: "10px 0" }} />
        <Typography variant="subtitle1">
          <b>Total Price:</b> ${bookingDetails.totalPrice}
        </Typography>
        <Typography variant="subtitle1">
          <b>Payment Method:</b> {bookingDetails.paymentMethod}
        </Typography>

        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button onClick={onClose} color="primary">
            Close
          </Button>
          <Button onClick={handleCancel} color="secondary" disabled={isCanceling} style={{ marginLeft: "8px" }}>
            {isCanceling ? "Canceling..." : "Cancel Booking"}
          </Button>
        </Box>
      </StyledModalContent>
    </StyledModal>
  )
}

export default BookingDetailsModal
