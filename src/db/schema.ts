import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  repoFullName: text('repo_full_name').notNull(),
  aiProvider: text('ai_provider').notNull().default('claude'),
  status: text('status').notNull().default('active'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const aiRuns = pgTable('ai_runs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  repoFullName: text('repo_full_name').notNull(),
  provider: text('provider').notNull(),
  summary: text('summary').notNull(),
  success: boolean('success').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  aiRuns: many(aiRuns),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  aiRuns: many(aiRuns),
}));

export const aiRunsRelations = relations(aiRuns, ({ one }) => ({
  user: one(users, {
    fields: [aiRuns.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [aiRuns.projectId],
    references: [projects.id],
  }),
}));
