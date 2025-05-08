// app/api/responses/route.js
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper function to create Supabase client
function createClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// GET - Fetch user responses (with optional filters)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const is_bookmarked = searchParams.get('bookmarked') === 'true' ? true : undefined;
    const is_correct = searchParams.get('correct') === 'true' ? true : 
                       searchParams.get('correct') === 'false' ? false : undefined;
    const exam = searchParams.get('exam');
    const category = searchParams.get('category');
    
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Start building the query
    let query = supabase
      .from('responses')
      .select(`
        *,
        qs:question_id (
          id,
          question_text,
          examname,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_choice,
          rationale,
          category,
          question_image_url,
          subject
        )
      `)
      .eq('user_id', session.user.id);
    
    // Apply filters if provided
    if (is_bookmarked !== undefined) {
      query = query.eq('is_bookmarked', is_bookmarked);
    }
    
    if (is_correct !== undefined) {
      query = query.eq('is_correct', is_correct);
    }
    
    // Apply exam and category filters (these filter on the joined qs table)
    if (exam) {
      query = query.eq('qs.examname', exam);
    }
    
    if (category) {
      query = query.eq('qs.category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ responses: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create or update a user response (handles answer submission OR bookmark toggle)
export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { question_id, user_answer, is_bookmarked } = body;
    
    if (!question_id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }
    
    // Get the question data (we'll need the examname at minimum)
    const { data: question, error: questionError } = await supabase
      .from('qs')
      .select('correct_choice, examname')
      .eq('id', question_id)
      .single();
    
    if (questionError) {
      console.error('Question fetch error:', questionError);
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    
    // First check if a response record exists to preserve existing values
    const { data: existingResponse } = await supabase
      .from('responses')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('question_id', question_id)
      .maybeSingle();
    
    // Prepare the data to upsert
    let dataToUpsert = {
      user_id: session.user.id,
      question_id,
      examname: question.examname,
      updated_at: new Date().toISOString()
    };
    
    // Handle bookmark toggle (if is_bookmarked is provided)
    if (is_bookmarked !== undefined) {
      dataToUpsert.is_bookmarked = is_bookmarked;
    } else if (existingResponse) {
      // Preserve the existing bookmark status if not being updated
      dataToUpsert.is_bookmarked = existingResponse.is_bookmarked;
    } else {
      // Default to false for new entries
      dataToUpsert.is_bookmarked = false;
    }
    
    // Handle answer submission (if user_answer is provided)
    if (user_answer !== undefined) {
      dataToUpsert.user_answer = user_answer;
      dataToUpsert.is_correct = user_answer ? 
        user_answer.toLowerCase() === question.correct_choice.toLowerCase() : 
        null;
    } else if (existingResponse) {
      // Preserve existing answer data if not being updated
      dataToUpsert.user_answer = existingResponse.user_answer;
      dataToUpsert.is_correct = existingResponse.is_correct;
    }
    
    // Upsert the response (update if exists, insert if doesn't)
    const { data, error } = await supabase
      .from('responses')
      .upsert(dataToUpsert, {
        onConflict: 'user_id,question_id',  // Use the unique constraint
        returning: 'representation'
      });
    
    if (error) {
      console.error('Upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ response: data[0] });
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update bookmark status (kept for backward compatibility)
export async function PATCH(request) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { question_id, is_bookmarked } = await request.json();
    
    if (!question_id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }
    
    if (typeof is_bookmarked !== 'boolean') {
      return NextResponse.json({ error: 'is_bookmarked must be a boolean' }, { status: 400 });
    }
    
    // First check if a response record exists for this user and question
    const { data: existingResponse, error: checkError } = await supabase
      .from('responses')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('question_id', question_id)
      .maybeSingle();
    
    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }
    
    let result;
    
    if (existingResponse) {
      // Update existing response
      const { data, error } = await supabase
        .from('responses')
        .update({ is_bookmarked, updated_at: new Date().toISOString() })
        .eq('id', existingResponse.id)
        .select();
      
      result = { data, error };
    } else {
      // Get examname for this question
      const { data: examData, error: examError } = await supabase
        .from('qs')
        .select('examname')
        .eq('id', question_id)
        .single();
        
      if (examError) {
        return NextResponse.json({ error: 'Failed to get exam data' }, { status: 500 });
      }
      
      // Create new response with just the bookmark status
      const { data, error } = await supabase
        .from('responses')
        .insert({
          user_id: session.user.id,
          question_id,
          examname: examData.examname,
          is_bookmarked,
        })
        .select();
      
      result = { data, error };
    }
    
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    
    return NextResponse.json({ response: result.data[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a response or reset user progress
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const question_id = searchParams.get('questionId');
    const reset_all = searchParams.get('resetAll') === 'true';
    
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let query = supabase
      .from('responses')
      .delete()
      .eq('user_id', session.user.id);
    
    if (reset_all) {
      // Delete all user responses
      const { error } = await query;
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ message: 'All responses deleted successfully' });
    } else if (question_id) {
      // Delete specific response
      const { error } = await query.eq('question_id', question_id);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ message: 'Response deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Either questionId or resetAll parameter is required' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 