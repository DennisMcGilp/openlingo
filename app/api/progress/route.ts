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
          eq(userProgress.userId, session.user.id),  // Use camelCase property name
          eq(userProgress.moduleId, moduleId)        // Use camelCase property name
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

    // Drizzle automatically maps camelCase to snake_case in the database
    // So we can return the object directly
    return NextResponse.json({
      id: progress[0].id,
      userId: progress[0].userId,
      moduleId: progress[0].moduleId,
      lessonCompleted: progress[0].lessonCompleted,
      quizPassed: progress[0].quizPassed,
      score: progress[0].score,
      points: progress[0].points,
      completedAt: progress[0].completedAt,
      createdAt: progress[0].createdAt,
      updatedAt: progress[0].updatedAt,
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
          eq(userProgress.userId, session.user.id),  // Use camelCase property name
          eq(userProgress.moduleId, moduleId)        // Use camelCase property name
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create new record using camelCase property names
      await db.insert(userProgress).values({
        userId: session.user.id,
        moduleId: moduleId,
        lessonCompleted: lessonCompleted || false,
        quizPassed: quizPassed || false,
        score: score || 0,
        points: points || 0,
        completedAt: quizPassed ? new Date() : null,
      });
    } else {
      // Update existing record using camelCase property names
      await db
        .update(userProgress)
        .set({
          lessonCompleted: lessonCompleted !== undefined ? lessonCompleted : existing[0].lessonCompleted,
          quizPassed: quizPassed !== undefined ? quizPassed : existing[0].quizPassed,
          score: score !== undefined ? score : existing[0].score,
          points: points !== undefined ? points : existing[0].points,
          completedAt: quizPassed ? new Date() : existing[0].completedAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userProgress.userId, session.user.id),
            eq(userProgress.moduleId, moduleId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving progress:", error);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}