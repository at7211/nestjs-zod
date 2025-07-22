import { z } from 'zod';
import { AutoZod, ZodObjectType, ZodInputType, createZodDto } from '@at7211/nestjs-zod';

// Single source of truth - one Zod schema for everything
export const PostSchema = z.object({
  id: z.number().describe('The unique identifier of the post'),
  title: z.string().describe('The title of the post'),
  content: z.string().describe('The main content of the post'),
  authorId: z.number().describe('The identifier of the post author'),
});

export const CreatePostSchema = z
  .object({
    title: z.string().describe('The title of the post'),
    content: z.string().describe('The main content of the post'),
    authorId: z.number().describe('The identifier of the post author'),
  })
  .describe('Create post input');

export const UpdatePostSchema = z
  .object({
    title: z.string().optional().describe('The title of the post'),
    content: z.string().optional().describe('The main content of the post'),
  })
  .describe('Update post input');

@AutoZod(CreatePostSchema)
export class CreatePostMinimalDto {}

@ZodObjectType()
export class PostDto extends createZodDto(PostSchema) {}

@ZodInputType()
export class CreatePostInputDto extends createZodDto(CreatePostSchema) {}

@ZodInputType()
export class UpdatePostInputDto extends createZodDto(UpdatePostSchema) {}

// Type exports for TypeScript
export type Post = z.infer<typeof PostSchema>;
export type CreatePost = z.infer<typeof CreatePostSchema>;
export type UpdatePost = z.infer<typeof UpdatePostSchema>;

// Mock data for testing
export const mockPosts: Post[] = [
  {
    id: 1,
    title: 'First Post with ZodGraphQL',
    content: 'This post was created using the new ZodGraphQL decorator!',
    authorId: 1,
  },
  {
    id: 2,
    title: 'Second Post',
    content: 'Another post to test our unified DTO system',
    authorId: 2,
  },
];
