import { FaRegListAlt } from 'react-icons/fa';
import { PiSquaresFourLight } from 'react-icons/pi';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/libs/supabase/client';

// Spotify-like color palette
const cardColors = [
  'bg-gradient-to-br from-green-400 to-blue-500',
  'bg-gradient-to-br from-pink-500 to-yellow-500',
  'bg-gradient-to-br from-purple-500 to-indigo-500',
  'bg-gradient-to-br from-yellow-400 to-red-500',
  'bg-gradient-to-br from-blue-400 to-cyan-500',
  'bg-gradient-to-br from-emerald-400 to-lime-500',
  'bg-gradient-to-br from-fuchsia-500 to-pink-400',
  'bg-gradient-to-br from-orange-400 to-rose-500',
  'bg-gradient-to-br from-sky-400 to-blue-600',
  'bg-gradient-to-br from-violet-500 to-purple-400',
];

function getRandomColor(idx) {
  // Deterministic color by index for stable color per exam
  return cardColors[idx % cardColors.length];
}

export default function ExamLister() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('exam_list_view')
          .select('*');
        if (error) throw error;
        setExams(data || []);
      } catch (e) {
        setError('Failed to load exams.');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  if (loading) {
    return <div className="w-full max-w-5xl mx-auto py-8 text-center text-lg">Loading exams...</div>;
  }
  if (error) {
    return <div className="w-full max-w-5xl mx-auto py-8 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <h2 className="text-3xl font-extrabold mb-8 text-gray-900">Exams</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {exams.map((exam, idx) => (
          <Link key={exam.exam_name} href={`/exams/${encodeURIComponent(exam.exam_name)}`} className="block group">
            <div className={`relative rounded-2xl shadow-lg p-6 h-48 flex flex-col justify-end overflow-hidden transition-transform transform hover:scale-105 ${getRandomColor(idx)}`} style={{ minHeight: '12rem' }}>
              <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity bg-black" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full">
                <h3 className="text-2xl font-bold text-white mb-4 truncate drop-shadow-lg text-center w-full">{exam.exam_name}</h3>
                <div className="flex items-center justify-center gap-4 bg-black/30 rounded-full px-4 py-2 mt-auto mb-2">
                  <span className="flex items-center gap-1 text-white/90 font-semibold text-base drop-shadow">
                    <FaRegListAlt className="inline-block w-5 h-5 text-amber-200" />
                    {exam.question_count}
                  </span>
                  <span className="flex items-center gap-1 text-white/90 font-semibold text-base drop-shadow">
                    <PiSquaresFourLight className="inline-block w-5 h-5 text-emerald-200" />
                    {exam.category_count}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 