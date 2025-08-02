
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test data
const testUsers: CreateUserInput[] = [
  {
    username: 'alice',
    email: 'alice@example.com',
    display_name: 'Alice Johnson',
    bio: 'Software developer'
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    display_name: 'Bob Smith',
    bio: null
  },
  {
    username: 'charlie',
    email: 'charlie@example.com',
    display_name: 'Charlie Brown',
    bio: 'Designer and artist'
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users', async () => {
    // Create test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Check that all users are returned
    const usernames = result.map(user => user.username).sort();
    expect(usernames).toEqual(['alice', 'bob', 'charlie']);
    
    // Verify user structure
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.display_name).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return users with correct data types and nullable fields', async () => {
    // Create a user with null bio
    const userWithNullBio = testUsers[1]; // Bob has null bio
    await db.insert(usersTable)
      .values([userWithNullBio])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];
    
    expect(typeof user.id).toBe('number');
    expect(typeof user.username).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.display_name).toBe('string');
    expect(user.bio).toBeNull();
    expect(user.created_at).toBeInstanceOf(Date);
  });

  it('should handle large number of users', async () => {
    // Create many users
    const manyUsers: CreateUserInput[] = [];
    for (let i = 0; i < 50; i++) {
      manyUsers.push({
        username: `user${i}`,
        email: `user${i}@example.com`,
        display_name: `User ${i}`,
        bio: i % 2 === 0 ? `Bio for user ${i}` : null
      });
    }

    await db.insert(usersTable)
      .values(manyUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(50);
    
    // Verify data integrity
    result.forEach((user, index) => {
      expect(user.username).toMatch(/^user\d+$/);
      expect(user.email).toMatch(/^user\d+@example\.com$/);
      expect(user.display_name).toMatch(/^User \d+$/);
    });
  });
});
