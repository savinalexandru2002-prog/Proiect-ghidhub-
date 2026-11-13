import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { aiRuns, projects, users } from './schema.ts';

export async function getUserProjectsByUid(uid: string) {
  try {
    return await db
      .select({
        id: projects.id,
        userId: projects.userId,
        repoFullName: projects.repoFullName,
        aiProvider: projects.aiProvider,
        status: projects.status,
        notes: projects.notes,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(projects.updatedAt));
  } catch (error) {
    console.error('Database getUserProjectsByUid failed:', error);
    throw new Error('Failed to fetch synced projects.', { cause: error });
  }
}

export async function upsertUserProject(
  userId: number,
  repoFullName: string,
  aiProvider: string,
  status: string,
  notes: string
) {
  try {
    const existing = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.repoFullName, repoFullName)))
      .limit(1);

    if (existing[0]) {
      const updated = await db
        .update(projects)
        .set({
          aiProvider,
          status,
          notes,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await db
      .insert(projects)
      .values({
        userId,
        repoFullName,
        aiProvider,
        status,
        notes,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database upsertUserProject failed:', error);
    throw new Error('Failed to save synced project.', { cause: error });
  }
}

export async function recordAiRun(
  userId: number,
  repoFullName: string,
  provider: string,
  summary: string,
  success: boolean,
  projectId?: number | null
) {
  try {
    const inserted = await db
      .insert(aiRuns)
      .values({
        userId,
        projectId: projectId ?? null,
        repoFullName,
        provider,
        summary,
        success,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database recordAiRun failed:', error);
    throw new Error('Failed to log AI execution history.', { cause: error });
  }
}

export async function getUserAiRunsByUid(uid: string) {
  try {
    return await db
      .select({
        id: aiRuns.id,
        repoFullName: aiRuns.repoFullName,
        provider: aiRuns.provider,
        summary: aiRuns.summary,
        success: aiRuns.success,
        createdAt: aiRuns.createdAt,
      })
      .from(aiRuns)
      .innerJoin(users, eq(aiRuns.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(aiRuns.createdAt))
      .limit(20);
  } catch (error) {
    console.error('Database getUserAiRunsByUid failed:', error);
    throw new Error('Failed to fetch AI history.', { cause: error });
  }
}
