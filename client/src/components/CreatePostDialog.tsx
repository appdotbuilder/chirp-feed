
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import type { CreatePostInput } from '../../../server/src/schema';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePostInput) => Promise<void>;
  isLoading?: boolean;
}

export function CreatePostDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading = false 
}: CreatePostDialogProps) {
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    try {
      await onSubmit({
        user_id: 0, // This will be set by the parent component
        content: content.trim()
      });
      // Reset form after successful submission
      setContent('');
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > 280;
  const isEmpty = content.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a Post</DialogTitle>
          <DialogDescription>
            Share your thoughts with the community!
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">What's on your mind?</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setContent(e.target.value)
              }
              placeholder="Share something interesting..."
              rows={4}
              className={`resize-none ${isOverLimit ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            <div className="flex justify-between items-center">
              <p className={`text-xs ${
                isOverLimit ? 'text-red-500' : characterCount > 250 ? 'text-yellow-600' : 'text-gray-500'
              }`}>
                {characterCount}/280 characters
              </p>
              {isOverLimit && (
                <p className="text-xs text-red-500">
                  {characterCount - 280} characters over limit
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setContent('');
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isEmpty || isOverLimit}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? 'Posting...' : 'Post'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
