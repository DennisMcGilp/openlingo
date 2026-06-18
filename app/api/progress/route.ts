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
          eq(userProgress.userId, session.user.id),
          eq(userProgress.moduleId, moduleId)
        )
      )
      .limit(1);

    if (progress.length === 0) {
      return NextResponse.json({
        moduleId,
        completedLessons: [],
        quizPassed: false,
        score: 0,
        points: 0,
      });
    }

    return NextResponse.json({
      id: progress[0].id,
      userId: progress[0].userId,
      moduleId: progress[0].moduleId,
      completedLessons: progress[0].completedLessons || [],
      quizPassed: progress[0].quizPassed || false,
      score: progress[0].score || 0,
      points: progress[0].points || 0,
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
    const { moduleId, completedLessons, quizPassed, score, points } = body;

    if (!moduleId) {
      return NextResponse.json({ error: "moduleId required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, session.user.id),
          eq(userProgress.moduleId, moduleId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(userProgress).values({
        userId: session.user.id,
        moduleId: moduleId,
        completedLessons: completedLessons || [],
        quizPassed: quizPassed || false,
        score: score || 0,
        points: points || 0,
        completedAt: quizPassed ? new Date() : null,
      });
    } else {
      await db
        .update(userProgress)
        .set({
          completedLessons: completedLessons !== undefined ? completedLessons : existing[0].completedLessons,
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
