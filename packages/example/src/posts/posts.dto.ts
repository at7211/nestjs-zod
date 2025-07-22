import { z } from 'zod';
import { ZodObjectType, ZodInputType, createZodDto } from '@at7211/nestjs-zod';

export const AuthorSchema = z.object({
  id: z.number().describe('Author ID'),
  name: z.string().describe('Author name'),
  email: z.string().email().describe('Author email'),
  bio: z.string().optional().describe('Author biography'),
});

// 🎯 NEW: Create derived schemas for inputs
export const CreateAuthorSchema = AuthorSchema.omit({ id: true });
export const UpdateAuthorSchema = AuthorSchema.partial();

@ZodObjectType()
export class AuthorDto extends createZodDto(AuthorSchema) {}

// 🎯 NEW: Input DTOs for derived schemas
@ZodInputType()
export class CreateAuthorInputDto extends createZodDto(CreateAuthorSchema) {}

@ZodInputType()
export class UpdateAuthorInputDto extends createZodDto(UpdateAuthorSchema) {}

// Single source of truth - one Zod schema for everything
export const PostSchema = z.object({
  id: z.number().describe('The unique identifier of the post'),
  title: z.string().describe('The title of the post'),
  content: z.string().describe('The main content of the post'),
  author: AuthorSchema, //
});

export const CreatePostSchema = z
  .object({
    title: z.string().describe('The title of the post'),
    content: z.string().describe('The main content of the post'),
    author: CreateAuthorSchema.describe('Post author information'), // 🎯 Use the schema with DTO
  })
  .describe('Create post input');

export const UpdatePostSchema = z
  .object({
    title: z.string().optional().describe('The title of the post'),
    content: z.string().optional().describe('The main content of the post'),
    author: UpdateAuthorSchema.optional().describe(
      'Updated author information',
    ), // 🎯 Use the schema with DTO
  })
  .describe('Update post input');

// 在定義 AuthorDto 之後定義 PostDto，測試巢狀 schema 解析
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
    author: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      bio: 'Senior developer with expertise in TypeScript and GraphQL',
    },
  },
  {
    id: 2,
    title: 'Second Post',
    content: 'Another post to test our unified DTO system',
    author: {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      bio: 'Full-stack developer passionate about NestJS',
    },
  },
];
