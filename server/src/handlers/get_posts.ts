
import { db } from '../db';
import { postsTable, usersTable, likesTable } from '../db/schema';
import { type GetPostsInput, type PostWithUser } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export const getPosts = async (input?: GetPostsInput): Promise<PostWithUser[]> => {
  try {
    // Base query with join to get user information
    let query = db.select({
      id: postsTable.id,
      user_id: postsTable.user_id,
      content: postsTable.content,
      likes_count: postsTable.likes_count,
      created_at: postsTable.created_at,
      username: usersTable.username,
      display_name: usersTable.display_name
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.user_id, usersTable.id))
    .orderBy(desc(postsTable.created_at));

    const results = await query.execute();

    // If user_id is provided, check which posts are liked by that user
    let likedPostIds: Set<number> = new Set();
    if (input?.user_id) {
      const likedPosts = await db.select({ post_id: likesTable.post_id })
        .from(likesTable)
        .where(eq(likesTable.user_id, input.user_id))
        .execute();
      
      likedPostIds = new Set(likedPosts.map(like => like.post_id));
    }

    // Transform results to match PostWithUser schema
    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      content: result.content,
      likes_count: result.likes_count,
      created_at: result.created_at,
      user: {
        username: result.username,
        display_name: result.display_name
      },
      is_liked: input?.user_id ? likedPostIds.has(result.id) : false
    }));
  } catch (error) {
    console.error('Failed to get posts:', error);
    throw error;
  }
};
