
import { serial, text, pgTable, timestamp, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  display_name: text('display_name').notNull(),
  bio: text('bio'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const postsTable = pgTable('posts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  likes_count: integer('likes_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const likesTable = pgTable('likes', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  post_id: integer('post_id').notNull().references(() => postsTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate likes
  uniqueUserPost: unique().on(table.user_id, table.post_id),
}));

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable),
  likes: many(likesTable),
}));

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [postsTable.user_id],
    references: [usersTable.id],
  }),
  likes: many(likesTable),
}));

export const likesRelations = relations(likesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [likesTable.user_id],
    references: [usersTable.id],
  }),
  post: one(postsTable, {
    fields: [likesTable.post_id],
    references: [postsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;
export type Like = typeof likesTable.$inferSelect;
export type NewLike = typeof likesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  posts: postsTable, 
  likes: likesTable 
};
