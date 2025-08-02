
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  display_name: z.string(),
  bio: z.string().nullable(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email(),
  display_name: z.string().min(1).max(100),
  bio: z.string().max(160).nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Post schema
export const postSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  content: z.string(),
  likes_count: z.number().int(),
  created_at: z.coerce.date()
});

export type Post = z.infer<typeof postSchema>;

// Input schema for creating posts
export const createPostInputSchema = z.object({
  user_id: z.number(),
  content: z.string().min(1).max(280) // Twitter-like character limit
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

// Like schema
export const likeSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  post_id: z.number(),
  created_at: z.coerce.date()
});

export type Like = z.infer<typeof likeSchema>;

// Input schema for creating likes
export const createLikeInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number()
});

export type CreateLikeInput = z.infer<typeof createLikeInputSchema>;

// Input schema for removing likes
export const removeLikeInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number()
});

export type RemoveLikeInput = z.infer<typeof removeLikeInputSchema>;

// Post with user details for display
export const postWithUserSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  content: z.string(),
  likes_count: z.number().int(),
  created_at: z.coerce.date(),
  user: z.object({
    username: z.string(),
    display_name: z.string()
  }),
  is_liked: z.boolean()
});

export type PostWithUser = z.infer<typeof postWithUserSchema>;

// Input schema for getting posts with user context
export const getPostsInputSchema = z.object({
  user_id: z.number().optional() // Optional user context for checking likes
});

export type GetPostsInput = z.infer<typeof getPostsInputSchema>;
