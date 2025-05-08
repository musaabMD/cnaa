"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import QuestionList from "@/components/Questionlist";
import { createClient } from "@/libs/supabase/client";

export default function ExamPage() {
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [userResponses, setUserResponses] = useState([]);
  const [userPlan, setUserPlan] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [examName, setExamName] = useState("");

  useEffect(() => {
    // Fetch user email and user id from Supabase
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || "");
      setUserId(user?.id || null);
      // Fetch user plan/profile
      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (!profileError && profile) {
          setUserPlan(profile);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Fetch questions for this exam
    const fetchQuestions = async () => {
      let url = "/api/exams/" + window.location.pathname.split("/").pop();
      const res = await fetch(url);
      const data = await res.json();
      setQuestions(data.questions || []);
      // Set exam name from first question or fallback to URL param
      if (data.questions && data.questions.length > 0) {
        setExamName(data.questions[0].examname || data.questions[0].exam_name || window.location.pathname.split("/").pop());
      } else {
        setExamName(window.location.pathname.split("/").pop());
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchResponses = async () => {
      const res = await fetch(`/api/responses?user_id=${userId}&limit=1000`);
      const data = await res.json();
      setUserResponses(data.responses || []);
    };
    fetchResponses();
  }, [userId]);

  // Merge responses into questions before rendering
  const mergedQuestions = questions.map(q => {
    const response = userResponses.find(r => String(r.question_id) === String(q.id));
    return {
      ...q,
      answered: response?.user_answer || null,
      flagged: response?.is_bookmarked || false,
    };
  });

  // Determine if user is on free demo
  const isDemo = !userPlan || !['1','2','12'].includes(String(userPlan?.plan_type));

  // Map answers to options for QuestionList
  const mappedQuestions = mergedQuestions.map(q => ({
    ...q,
    option_a: q.option_a || q.answer_1 || "",
    option_b: q.option_b || q.answer_2 || "",
    option_c: q.option_c || q.answer_3 || "",
    option_d: q.option_d || q.answer_4 || "",
    correct_choice: (q.correct_choice || q.correct_answer || '').toString().toUpperCase(),
    explanation: q.rationale || q.explanation || "",
  }));

  return (
    <main className=" bg-[#FCFCFA] min-h-screen">
      <QuestionList 
        questions={mappedQuestions}
        questionsPerPage={10}
        userEmail={userEmail}
        user_id={userId}
        isDemo={isDemo}
        onUpgradeClick={() => {}}
        examName={examName}
      />
    </main>
  );
} 