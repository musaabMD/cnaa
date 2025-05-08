import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";

// GET /api/exams/[id] - Returns all questions for a specific exam
export async function GET(req, { params }) {
  const { id } = params;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qs")
    .select("*")
    .ilike("examname", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: data });
} 