
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, likesTable } from '../db/schema';
import { type CreateLikeInput } from '../schema';
import { createLike } from '../handlers/create_like';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: null
};

const testPost = {
  content: 'Test post content',
  likes_count: 0
};

describe('createLike', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a like', async () => {
    // Create user and post first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: user.id
      })
      .returning()
      .execute();
    const post = postResult[0];

    const input: CreateLikeInput = {
      user_id: user.id,
      post_id: post.id
    };

    const result = await createLike(input);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.post_id).toEqual(post.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save like to database', async () => {
    // Create user and post first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: user.id
      })
      .returning()
      .execute();
    const post = postResult[0];

    const input: CreateLikeInput = {
      user_id: user.id,
      post_id: post.id
    };

    const result = await createLike(input);

    // Query using proper drizzle syntax
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.id, result.id))
      .execute();

    expect(likes).toHaveLength(1);
    expect(likes[0].user_id).toEqual(user.id);
    expect(likes[0].post_id).toEqual(post.id);
    expect(likes[0].created_at).toBeInstanceOf(Date);
  });

  it('should increment post likes_count', async () => {
    // Create user and post first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: user.id,
        likes_count: 5 // Start with 5 likes
      })
      .returning()
      .execute();
    const post = postResult[0];

    const input: CreateLikeInput = {
      user_id: user.id,
      post_id: post.id
    };

    await createLike(input);

    // Check that likes_count was incremented
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(updatedPost[0].likes_count).toEqual(6);
  });

  it('should throw error if user does not exist', async () => {
    // Create only a post, no user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: user.id
      })
      .returning()
      .execute();
    const post = postResult[0];

    const input: CreateLikeInput = {
      user_id: 99999, // Non-existent user
      post_id: post.id
    };

    expect(createLike(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error if post does not exist', async () => {
    // Create only a user, no post
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const input: CreateLikeInput = {
      user_id: user.id,
      post_id: 99999 // Non-existent post
    };

    expect(createLike(input)).rejects.toThrow(/post not found/i);
  });

  it('should throw error if like already exists', async () => {
    // Create user and post first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: user.id
      })
      .returning()
      .execute();
    const post = postResult[0];

    // Create an existing like
    await db.insert(likesTable)
      .values({
        user_id: user.id,
        post_id: post.id
      })
      .execute();

    const input: CreateLikeInput = {
      user_id: user.id,
      post_id: post.id
    };

    expect(createLike(input)).rejects.toThrow(/like already exists/i);
  });

  it('should allow different users to like the same post', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1 = user1Result[0];

    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'testuser2',
        email: 'test2@example.com'
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // Create one post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: user1.id
      })
      .returning()
      .execute();
    const post = postResult[0];

    // Both users like the same post
    const input1: CreateLikeInput = {
      user_id: user1.id,
      post_id: post.id
    };

    const input2: CreateLikeInput = {
      user_id: user2.id,
      post_id: post.id
    };

    const result1 = await createLike(input1);
    const result2 = await createLike(input2);

    expect(result1.user_id).toEqual(user1.id);
    expect(result2.user_id).toEqual(user2.id);
    expect(result1.post_id).toEqual(post.id);
    expect(result2.post_id).toEqual(post.id);

    // Check that both likes exist in database
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, post.id))
      .execute();

    expect(likes).toHaveLength(2);

    // Check that likes_count was incremented twice
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(updatedPost[0].likes_count).toEqual(2);
  });
});
