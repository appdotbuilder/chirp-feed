
import { db } from '../db';
import { likesTable, postsTable } from '../db/schema';
import { type RemoveLikeInput } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const removeLike = async (input: RemoveLikeInput): Promise<boolean> => {
  try {
    // First, check if the like exists
    const existingLike = await db.select()
      .from(likesTable)
      .where(
        and(
          eq(likesTable.user_id, input.user_id),
          eq(likesTable.post_id, input.post_id)
        )
      )
      .execute();

    // If like doesn't exist, return false
    if (existingLike.length === 0) {
      return false;
    }

    // Delete the like record
    await db.delete(likesTable)
      .where(
        and(
          eq(likesTable.user_id, input.user_id),
          eq(likesTable.post_id, input.post_id)
        )
      )
      .execute();

    // Decrement the likes_count on the post using SQL
    await db.execute(sql`
      UPDATE posts 
      SET likes_count = likes_count - 1 
      WHERE id = ${input.post_id}
    `);

    return true;
  } catch (error) {
    console.error('Like removal failed:', error);
    throw error;
  }
};
