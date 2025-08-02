
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

import { 
  createUserInputSchema, 
  createPostInputSchema, 
  createLikeInputSchema, 
  removeLikeInputSchema,
  getPostsInputSchema 
} from './schema';

import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createPost } from './handlers/create_post';
import { getPosts } from './handlers/get_posts';
import { createLike } from './handlers/create_like';
import { removeLike } from './handlers/remove_like';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // User routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  // Post routes
  createPost: publicProcedure
    .input(createPostInputSchema)
    .mutation(({ input }) => createPost(input)),
  
  getPosts: publicProcedure
    .input(getPostsInputSchema.optional())
    .query(({ input }) => getPosts(input)),
  
  // Like routes
  createLike: publicProcedure
    .input(createLikeInputSchema)
    .mutation(({ input }) => createLike(input)),
  
  removeLike: publicProcedure
    .input(removeLikeInputSchema)
    .mutation(({ input }) => removeLike(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
