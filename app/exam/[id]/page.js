"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"

// Minimal exam data for CCNA only
const examData = [
  {
    id: "ccna",
    title: "CCNA (Cisco Certified Network Associate)",
    category: "Networking",
    totalQuestions: 120,
  },
]

export default function ExamPage({ params }) {
  const { id } = params
  const exam = examData.find((e) => e.id === id)

  if (!exam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Exam not found</h1>
        <Link href="/" className="text-blue-600 underline">Back to home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="max-w-xl w-full bg-blue-50 rounded-xl shadow-md p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">{exam.title}</h1>
        <p className="text-lg mb-6">Category: <span className="font-semibold">{exam.category}</span></p>
        <p className="text-lg mb-8">Total Questions: <span className="font-semibold">{exam.totalQuestions}</span></p>
        <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition">Back to Home</Link>
      </div>
    </div>
  )
} 