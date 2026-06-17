import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { userProgress } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");

    if (!moduleId) {
      return NextResponse.json({ error: "moduleId required" }, { status: 400 });
    }

    const progress = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.user_id, session.user.id),
          eq(userProgress.module_id, moduleId)
        )
      )
      .limit(1);

    if (progress.length === 0) {
      return NextResponse.json({
        moduleId,
        lessonCompleted: false,
        quizPassed: false,
        score: 0,
        points: 0,
      });
    }

    // Convert snake_case to camelCase for the frontend
    return NextResponse.json({
      id: progress[0].id,
      userId: progress[0].user_id,
      moduleId: progress[0].module_id,
      lessonCompleted: progress[0].lesson_completed,
      quizPassed: progress[0].quiz_passed,
      score: progress[0].score,
      points: progress[0].points,
      completedAt: progress[0].completed_at,
      createdAt: progress[0].created_at,
      updatedAt: progress[0].updated_at,
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { moduleId, lessonCompleted, quizPassed, score, points } = body;

    if (!moduleId) {
      return NextResponse.json({ error: "moduleId required" }, { status: 400 });
    }

    // Check if progress record exists
    const existing = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.user_id, session.user.id),
          eq(userProgress.module_id, moduleId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create new record with snake_case column names
      await db.insert(userProgress).values({
        user_id: session.user.id,
        module_id: moduleId,
        lesson_completed: lessonCompleted || false,
        quiz_passed: quizPassed || false,
        score: score || 0,
        points: points || 0,
        completed_at: quizPassed ? new Date() : null,
      });
    } else {
      // Update existing record with snake_case column names
      await db
        .update(userProgress)
        .set({
          lesson_completed: lessonCompleted !== undefined ? lessonCompleted : existing[0].lesson_completed,
          quiz_passed: quizPassed !== undefined ? quizPassed : existing[0].quiz_passed,
          score: score !== undefined ? score : existing[0].score,
          points: points !== undefined ? points : existing[0].points,
          completed_at: quizPassed ? new Date() : existing[0].completed_at,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(userProgress.user_id, session.user.id),
            eq(userProgress.module_id, moduleId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving progress:", error);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}
