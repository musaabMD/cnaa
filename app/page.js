"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ExamLister from "@/components/ExamLister"
import { createClient } from "@/libs/supabase/client"

// Minimal exam data for CCNA only
const examData = [
  {
    id: "ccna",
    title: "CCNA (Cisco Certified Network Associate)",
    category: "Networking",
    totalQuestions: 120,
  },
]

// Group exams by category
const examsByCategory = examData.reduce((acc, exam) => {
  if (!acc[exam.category]) {
    acc[exam.category] = []
  }
  acc[exam.category].push(exam)
  return acc
}, {})

// Define category colors and icons
const categoryStyles = {
  Networking: { color: "bg-blue-500", emoji: "🌐" },
}

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showPreOrderForm, setShowPreOrderForm] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = "/signin"
      }
    }
    checkAuth()
  }, [])

  // Check for hash in URL on initial load
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "")
      if (hash && Object.keys(examsByCategory).includes(hash)) {
        setSelectedCategory(hash)
      }
    }
    handleHashChange()
    window.addEventListener("hashchange", handleHashChange)
    return () => {
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [])

  const handleBackToCategories = () => {
    setSelectedCategory(null)
    window.history.pushState("", document.title, window.location.pathname + window.location.search)
  }

  const handleCategorySelect = (category) => {
    setSelectedCategory(category)
    window.location.hash = category
  }

  // Filter exams based on search query
  const filteredExams = examData.filter((exam) => exam.title.toLowerCase().includes(searchQuery.toLowerCase()))

  // Group exams by category for the grid view
  const groupedExams = Object.entries(examsByCategory).map(([category, exams]) => ({
    category,
    count: exams.length,
    color: categoryStyles[category]?.color || "bg-gray-500",
    emoji: categoryStyles[category]?.emoji || "📚",
    exams,
  }))

  // Filter grouped exams if there's a search query
  const displayedGroups = searchQuery
    ? groupedExams
        .map((group) => ({
          ...group,
          exams: group.exams.filter((exam) => exam.title.toLowerCase().includes(searchQuery.toLowerCase())),
        }))
        .filter((group) => group.exams.length > 0)
    : groupedExams

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
                S
              </div>
              <span className="ml-2 text-xl font-bold">Scoorly</span>
            </div>
            <div className="flex items-center">
              <Button
                className="ml-4 bg-blue-600 hover:bg-blue-700 rounded-full"
                onClick={() => window.location.href = "/signin"}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Pre-order form placeholder */}
      {showPreOrderForm ? (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Button variant="outline" className="mb-6" onClick={() => setShowPreOrderForm(false)}>
            Back to exams
          </Button>
          <div className="bg-gray-100 p-8 rounded-xl text-center">Pre-order form coming soon!</div>
        </div>
      ) : (
        <>
          {/* Hero Section - Only show if no category is selected */}
          {!selectedCategory && (
            <div className="bg-gradient-to-b from-blue-600 to-blue-800 text-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <div className="text-center max-w-3xl mx-auto">
                  <h1 className="text-4xl md:text-5xl font-bold mb-6">
                    Prepare for Your Certification Exam with Scoorly
                  </h1>
                  <p className="text-xl mb-8 text-blue-100">
                    Comprehensive test prep for networking certifications
                  </p>
                  <div className="relative max-w-lg mx-auto">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search for an exam..."
                      className="pl-10 h-12 bg-white text-gray-900 rounded-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {selectedCategory ? (
              <div>
                <Button variant="outline" className="mb-6" onClick={handleBackToCategories}>
                  Back to categories
                </Button>
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <span className="mr-2 text-xl">{categoryStyles[selectedCategory]?.emoji || "📚"}</span>
                  {selectedCategory} Exams
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {examsByCategory[selectedCategory].map((exam) => (
                    <Link key={exam.id} href={`/exams/${exam.id}`} className="block">
                      <div
                        className={`${categoryStyles[selectedCategory]?.color || "bg-gray-500"} rounded-xl p-6 h-40 relative overflow-hidden transition-transform hover:scale-[1.02] shadow-md`}
                      >
                        <div className="absolute bottom-6 left-6 right-6">
                          <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                          <p className="text-white/90 text-sm truncate">{exam.totalQuestions} questions</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <ExamLister />
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
                S
              </div>
              <span className="ml-2 text-xl font-bold">Scoorly</span>
            </div>
            <div className="text-sm text-gray-500">© {new Date().getFullYear()} Scoorly. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
