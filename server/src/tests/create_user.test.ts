
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: 'A user for testing'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.display_name).toEqual('Test User');
    expect(result.bio).toEqual('A user for testing');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].display_name).toEqual('Test User');
    expect(users[0].bio).toEqual('A user for testing');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should create user with null bio', async () => {
    const inputWithNullBio: CreateUserInput = {
      username: 'testnullbio',
      email: 'testnull@example.com',
      display_name: 'Test Null Bio',
      bio: null
    };

    const result = await createUser(inputWithNullBio);

    expect(result.username).toEqual('testnullbio');
    expect(result.email).toEqual('testnull@example.com');
    expect(result.display_name).toEqual('Test Null Bio');
    expect(result.bio).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].bio).toBeNull();
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same username
    const duplicateUsernameInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      display_name: 'Different User',
      bio: 'Different bio'
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/unique/i);
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same email
    const duplicateEmailInput: CreateUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      display_name: 'Different User',
      bio: 'Different bio'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });
});
