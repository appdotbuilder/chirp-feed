
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, likesTable } from '../db/schema';
import { type RemoveLikeInput } from '../schema';
import { removeLike } from '../handlers/remove_like';
import { eq, and } from 'drizzle-orm';

describe('removeLike', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should remove an existing like and decrement likes_count', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: null
      })
      .returning()
      .execute();

    // Create a post
    const post = await db.insert(postsTable)
      .values({
        user_id: user[0].id,
        content: 'Test post content',
        likes_count: 1 // Start with 1 like
      })
      .returning()
      .execute();

    // Create a like
    await db.insert(likesTable)
      .values({
        user_id: user[0].id,
        post_id: post[0].id
      })
      .execute();

    const input: RemoveLikeInput = {
      user_id: user[0].id,
      post_id: post[0].id
    };

    const result = await removeLike(input);

    expect(result).toBe(true);

    // Verify like was removed from database
    const likes = await db.select()
      .from(likesTable)
      .where(
        and(
          eq(likesTable.user_id, user[0].id),
          eq(likesTable.post_id, post[0].id)
        )
      )
      .execute();

    expect(likes).toHaveLength(0);

    // Verify likes_count was decremented
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post[0].id))
      .execute();

    expect(updatedPost[0].likes_count).toBe(0);
  });

  it('should return false when like does not exist', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: null
      })
      .returning()
      .execute();

    // Create a post
    const post = await db.insert(postsTable)
      .values({
        user_id: user[0].id,
        content: 'Test post content',
        likes_count: 0
      })
      .returning()
      .execute();

    const input: RemoveLikeInput = {
      user_id: user[0].id,
      post_id: post[0].id
    };

    const result = await removeLike(input);

    expect(result).toBe(false);

    // Verify likes_count was not changed
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post[0].id))
      .execute();

    expect(updatedPost[0].likes_count).toBe(0);
  });

  it('should handle multiple likes on same post correctly', async () => {
    // Create two users
    const user1 = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        display_name: 'User One',
        bio: null
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        display_name: 'User Two',
        bio: null
      })
      .returning()
      .execute();

    // Create a post
    const post = await db.insert(postsTable)
      .values({
        user_id: user1[0].id,
        content: 'Test post content',
        likes_count: 2 // Start with 2 likes
      })
      .returning()
      .execute();

    // Create likes from both users
    await db.insert(likesTable)
      .values([
        {
          user_id: user1[0].id,
          post_id: post[0].id
        },
        {
          user_id: user2[0].id,
          post_id: post[0].id
        }
      ])
      .execute();

    // Remove like from user1
    const input: RemoveLikeInput = {
      user_id: user1[0].id,
      post_id: post[0].id
    };

    const result = await removeLike(input);

    expect(result).toBe(true);

    // Verify only user1's like was removed
    const remainingLikes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, post[0].id))
      .execute();

    expect(remainingLikes).toHaveLength(1);
    expect(remainingLikes[0].user_id).toBe(user2[0].id);

    // Verify likes_count was decremented by 1
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post[0].id))
      .execute();

    expect(updatedPost[0].likes_count).toBe(1);
  });
});
