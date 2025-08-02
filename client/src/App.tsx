
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, UserPlus, Plus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { User, PostWithUser, CreateUserInput, CreatePostInput } from '../../server/src/schema';
import { CreateUserDialog } from '@/components/CreateUserDialog';
import { CreatePostDialog } from '@/components/CreatePostDialog';

function App() {
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [postsResult, usersResult] = await Promise.all([
        trpc.getPosts.query({ user_id: currentUser?.id }),
        trpc.getUsers.query()
      ]);
      setPosts(postsResult);
      
      // Set first user as current user if none selected and users exist
      if (!currentUser && usersResult.length > 0) {
        setCurrentUser(usersResult[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = async (userData: CreateUserInput) => {
    try {
      const newUser = await trpc.createUser.mutate(userData);
      setCurrentUser(newUser);
      setShowCreateUser(false);
      // Reload data to refresh posts with new user context
      await loadData();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleCreatePost = async (postData: CreatePostInput) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const newPost = await trpc.createPost.mutate({
        user_id: currentUser.id,
        content: postData.content
      });
      
      // Create a PostWithUser object for display
      const postWithUser: PostWithUser = {
        ...newPost,
        user: {
          username: currentUser.username,
          display_name: currentUser.display_name
        },
        is_liked: false
      };
      
      setPosts((prev: PostWithUser[]) => [postWithUser, ...prev]);
      setShowCreatePost(false);
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId: number, isLiked: boolean) => {
    if (!currentUser) return;

    try {
      if (isLiked) {
        await trpc.removeLike.mutate({
          user_id: currentUser.id,
          post_id: postId
        });
        // Update local state - decrease likes count and mark as not liked
        setPosts((prev: PostWithUser[]) =>
          prev.map((post: PostWithUser) =>
            post.id === postId
              ? { ...post, likes_count: post.likes_count - 1, is_liked: false }
              : post
          )
        );
      } else {
        await trpc.createLike.mutate({
          user_id: currentUser.id,
          post_id: postId
        });
        // Update local state - increase likes count and mark as liked
        setPosts((prev: PostWithUser[]) =>
          prev.map((post: PostWithUser) =>
            post.id === postId
              ? { ...post, likes_count: post.likes_count + 1, is_liked: true }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const getInitials = (displayName: string) => {
    return displayName
      .split(' ')
      .map((name: string) => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">Social Feed</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {currentUser ? (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(currentUser.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">@{currentUser.username}</span>
              </div>
            ) : (
              <Button
                onClick={() => setShowCreateUser(true)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign Up</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome Message */}
        {!currentUser && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Welcome to Social Feed! 🚀
                </h2>
                <p className="text-gray-600 mb-4">
                  Create an account to start sharing your thoughts and connecting with others.
                </p>
                <Button onClick={() => setShowCreateUser(true)} className="bg-blue-500 hover:bg-blue-600">
                  Get Started
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Post Button */}
        {currentUser && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Button
                onClick={() => setShowCreatePost(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center space-x-2"
                size="lg"
              >
                <Plus className="w-5 h-5" />
                <span>Share what's on your mind</span>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Posts Feed */}
        {posts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">No posts yet</h3>
                <p className="text-gray-400">
                  {currentUser
                    ? "Be the first to share something!"
                    : "Create an account to see and share posts."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post: PostWithUser) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-100 text-gray-700">
                        {getInitials(post.user.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {post.user.display_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          @{post.user.username}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {post.created_at.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-gray-900 whitespace-pre-wrap break-words">
                    {post.content}
                  </p>
                </CardContent>
                
                <CardFooter className="pt-0">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id, post.is_liked)}
                      disabled={!currentUser}
                      className={`flex items-center space-x-1 ${
                        post.is_liked
                          ? 'text-red-500 hover:text-red-600'
                          : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${post.is_liked ? 'fill-current' : ''}`}
                      />
                      <span className="text-sm">{post.likes_count}</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <CreateUserDialog
        open={showCreateUser}
        onOpenChange={setShowCreateUser}
        onSubmit={handleCreateUser}
      />
      
      <CreatePostDialog
        open={showCreatePost}
        onOpenChange={setShowCreatePost}
        onSubmit={handleCreatePost}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
