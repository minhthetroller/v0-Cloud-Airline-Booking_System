"use client"

import React from "react"

interface PasswordStrengthMeterProps {
  password: string
  onStrengthChange: (isValid: boolean) => void
}

export default function PasswordStrengthMeter({ password, onStrengthChange }: PasswordStrengthMeterProps) {
  const [score, setScore] = React.useState(0)
  const [feedback, setFeedback] = React.useState<string[]>([])
  const [isValid, setIsValid] = React.useState(false)

  React.useEffect(() => {
    const feedback = []
    let score = 0

    if (password.length >= 8) {
      score += 1
    } else if (password.length > 0) {
      feedback.push("Password must be at least 8 characters long")
    }

    if (/[A-Z]/.test(password)) {
      score += 1
    } else if (password.length > 0) {
      feedback.push("Add at least one uppercase letter")
    }

    if (/[a-z]/.test(password)) {
      score += 1
    } else if (password.length > 0) {
      feedback.push("Add at least one lowercase letter")
    }

    if (/\d/.test(password)) {
      score += 1
    } else if (password.length > 0) {
      feedback.push("Add at least one number")
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else if (password.length > 0) {
      feedback.push("Add at least one special character")
    }

    const isValid = score >= 3 && password.length >= 8

    setScore(score)
    setFeedback(feedback)
    setIsValid(isValid)
  }, [password])

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex space-x-1 mb-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded transition-colors ${
              score >= level
                ? score <= 2
                  ? "bg-red-500"
                  : score <= 3
                    ? "bg-yellow-500"
                    : "bg-green-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs font-medium ${
          score <= 2 ? "text-red-600" : score <= 3 ? "text-yellow-600" : "text-green-600"
        }`}
      >
        {score <= 2 ? "Weak" : score <= 3 ? "Medium" : "Strong"} password
      </p>
      {feedback.length > 0 && (
        <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-center">
              <span className="text-red-400 mr-1">•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
