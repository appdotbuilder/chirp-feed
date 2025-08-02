
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { type CreatePostInput } from '../schema';
import { createPost } from '../handlers/create_post';
import { eq } from 'drizzle-orm';

describe('createPost', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first (prerequisite data)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: 'Test bio'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a post', async () => {
    const testInput: CreatePostInput = {
      user_id: testUserId,
      content: 'This is a test post content!'
    };

    const result = await createPost(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.content).toEqual('This is a test post content!');
    expect(result.likes_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save post to database', async () => {
    const testInput: CreatePostInput = {
      user_id: testUserId,
      content: 'Another test post for database verification'
    };

    const result = await createPost(testInput);

    // Query using proper drizzle syntax
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, result.id))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].user_id).toEqual(testUserId);
    expect(posts[0].content).toEqual('Another test post for database verification');
    expect(posts[0].likes_count).toEqual(0);
    expect(posts[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreatePostInput = {
      user_id: 99999, // Non-existent user ID
      content: 'This post should not be created'
    };

    await expect(createPost(testInput)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should handle long content within limit', async () => {
    const longContent = 'A'.repeat(280); // Maximum allowed length
    const testInput: CreatePostInput = {
      user_id: testUserId,
      content: longContent
    };

    const result = await createPost(testInput);

    expect(result.content).toEqual(longContent);
    expect(result.content.length).toEqual(280);
  });
});
