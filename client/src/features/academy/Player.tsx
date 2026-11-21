import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '../../components/ui/Button';

export function Player() {
  const { courseId, lessonId } = useParams();
  const queryClient = useQueryClient();
  const [marking, setMarking] = useState(false);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson', courseId, lessonId],
    queryFn: async () => {
      const response = await api.get(`/academy/courses/${courseId}/lessons/${lessonId}`);
      return response.data.data;
    }
  });

  const { data: enrollments } = useQuery({
    queryKey: ['student-enrollments'],
    queryFn: async () => {
      const response = await api.get('/me/enrollments');
      return response.data.data;
    }
  });

  // Find active enrollment for this course
  const currentEnrollment = (enrollments || []).find((e: any) =>
    e.courseId?._id === courseId || e.courseId?.slug === courseId || e.courseId === courseId
  );
  const completedLessonIds: string[] = currentEnrollment?.completedLessonIds?.map(String) || [];
  const isCompleted = Boolean(lessonId && completedLessonIds.includes(String(lessonId)));

  const toggleComplete = async () => {
    if (!courseId || !lessonId) return;
    setMarking(true);
    try {
      await api.post('/me/progress', {
        courseId,
        lessonId,
        completed: !isCompleted
      });
      await queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
      await queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      toast.success(isCompleted ? 'Marked as uncompleted' : 'Lesson completed! 🎉');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not update lesson progress');
    } finally {
      setMarking(false);
    }
  };

  if (isLoading) {
    return <main className="container section"><p className="muted">Loading protected lesson…</p></main>;
  }

  return (
    <main className="container section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <Link to={`/academy/courses/${courseId}`} className="button button-secondary" style={{ textDecoration: 'none' }}>
          ← Back to Course Outline
        </Link>
        <Button
          type="button"
          variant={isCompleted ? 'secondary' : 'primary'}
          disabled={marking}
          onClick={toggleComplete}
        >
          {marking ? 'Saving…' : isCompleted ? 'Completed ✓ (Click to Undo)' : 'Mark as Completed'}
        </Button>
      </div>

      <h1 style={{ marginBottom: 18 }}>{lesson?.title || 'Protected Lesson'}</h1>

      {lesson?.youtubeVideoId ? (
        <VideoPlayer videoId={lesson.youtubeVideoId} watermark={lesson.watermark} />
      ) : (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p className="muted">Video recording or live stream is currently not available for this lesson.</p>
        </div>
      )}
    </main>
  );
}
