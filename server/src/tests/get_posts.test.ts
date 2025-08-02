
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, likesTable } from '../db/schema';
import { type GetPostsInput } from '../schema';
import { getPosts } from '../handlers/get_posts';
import { eq } from 'drizzle-orm';

describe('getPosts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no posts exist', async () => {
    const result = await getPosts();

    expect(result).toEqual([]);
  });

  it('should return posts with user information', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: 'Test bio'
      })
      .returning()
      .execute();

    // Create test post
    const [post] = await db.insert(postsTable)
      .values({
        user_id: user.id,
        content: 'This is a test post',
        likes_count: 5
      })
      .returning()
      .execute();

    const result = await getPosts();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(post.id);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].content).toEqual('This is a test post');
    expect(result[0].likes_count).toEqual(5);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].user.username).toEqual('testuser');
    expect(result[0].user.display_name).toEqual('Test User');
    expect(result[0].is_liked).toBe(false);
  });

  it('should return posts ordered by created_at DESC', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: null
      })
      .returning()
      .execute();

    // Create multiple posts with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

    const [oldPost] = await db.insert(postsTable)
      .values({
        user_id: user.id,
        content: 'Old post',
        likes_count: 1
      })
      .returning()
      .execute();

    // Update the old post's timestamp to be earlier
    await db.update(postsTable)
      .set({ created_at: earlier })
      .where(eq(postsTable.id, oldPost.id))
      .execute();

    const [newPost] = await db.insert(postsTable)
      .values({
        user_id: user.id,
        content: 'New post',
        likes_count: 2
      })
      .returning()
      .execute();

    const result = await getPosts();

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('New post'); // Newest first
    expect(result[1].content).toEqual('Old post'); // Oldest last
    expect(result[0].created_at > result[1].created_at).toBe(true);
  });

  it('should mark posts as liked when user_id is provided', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        display_name: 'User One',
        bio: null
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        display_name: 'User Two',
        bio: null
      })
      .returning()
      .execute();

    // Create test posts
    const [post1] = await db.insert(postsTable)
      .values({
        user_id: user1.id,
        content: 'Post 1',
        likes_count: 1
      })
      .returning()
      .execute();

    const [post2] = await db.insert(postsTable)
      .values({
        user_id: user2.id,
        content: 'Post 2',
        likes_count: 0
      })
      .returning()
      .execute();

    // User1 likes post1
    await db.insert(likesTable)
      .values({
        user_id: user1.id,
        post_id: post1.id
      })
      .execute();

    const input: GetPostsInput = { user_id: user1.id };
    const result = await getPosts(input);

    expect(result).toHaveLength(2);
    
    // Find the posts in the result
    const resultPost1 = result.find(p => p.id === post1.id);
    const resultPost2 = result.find(p => p.id === post2.id);

    expect(resultPost1?.is_liked).toBe(true); // User1 liked this post
    expect(resultPost2?.is_liked).toBe(false); // User1 did not like this post
  });

  it('should handle posts from multiple users', async () => {
    // Create multiple users
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'alice',
        email: 'alice@example.com',
        display_name: 'Alice Smith',
        bio: 'Alice bio'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'bob',
        email: 'bob@example.com',
        display_name: 'Bob Jones',
        bio: null
      })
      .returning()
      .execute();

    // Create posts from different users
    await db.insert(postsTable)
      .values({
        user_id: user1.id,
        content: 'Alice post',
        likes_count: 3
      })
      .execute();

    await db.insert(postsTable)
      .values({
        user_id: user2.id,
        content: 'Bob post',
        likes_count: 7
      })
      .execute();

    const result = await getPosts();

    expect(result).toHaveLength(2);
    
    const alicePost = result.find(p => p.user.username === 'alice');
    const bobPost = result.find(p => p.user.username === 'bob');

    expect(alicePost?.content).toEqual('Alice post');
    expect(alicePost?.user.display_name).toEqual('Alice Smith');
    expect(alicePost?.likes_count).toEqual(3);

    expect(bobPost?.content).toEqual('Bob post');
    expect(bobPost?.user.display_name).toEqual('Bob Jones');
    expect(bobPost?.likes_count).toEqual(7);
  });
});
