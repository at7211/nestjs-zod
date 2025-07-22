import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import {
  PostDto, // 🎯 NEW: NestJS-style @ZodObjectType
  UpdatePostInputDto, // 🎯 NEW: NestJS-style @ZodInputType
  CreatePostSchema,
  Post,
  mockPosts,
  CreatePostInputDto,
} from './posts.dto';

// Shared data store - now using the shared mock data as starting point
const posts: Post[] = [...mockPosts];

@Resolver(() => PostDto)
export class PostsResolver {
  // 🎯 NEW: Using @ZodObjectType decorated class
  @Query(() => [PostDto], {
    name: 'posts',
    description: 'Get all posts using @ZodObjectType',
  })
  async getPosts(): Promise<Post[]> {
    console.log('🎯 GraphQL Query: Getting all posts with @ZodObjectType');
    return posts;
  }

  @Query(() => PostDto, {
    name: 'post',
    description: 'Get a post by ID using @ZodObjectType',
    nullable: true,
  })
  async getPost(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<Post | null> {
    console.log(`🎯 GraphQL Query: Getting post ${id} with @ZodObjectType`);
    return posts.find((post) => post.id === id) || null;
  }

  // 🎯 NEW: Using @ZodInputType decorated class
  @Mutation(() => PostDto, {
    name: 'createPost',
    description: 'Create a new post using @ZodInputType',
  })
  async createPost(
    @Args('input', { type: () => CreatePostInputDto })
    input: CreatePostInputDto,
  ): Promise<PostDto> {
    console.log('🎯 GraphQL Mutation: Creating post with @ZodInputType');

    // Validate input using the shared Zod schema
    const validated = CreatePostSchema.parse(input);

    const newPost: Post = {
      id: Math.max(...posts.map((p) => p.id), 0) + 1,
      title: validated.title,
      content: validated.content,
      author: undefined,
    };

    posts.push(newPost);
    console.log('✅ Created post:', newPost);
    return newPost;
  }

  // 🎯 NEW: Using @ZodInputType decorated class
  @Mutation(() => PostDto, {
    name: 'updatePost',
    description: 'Update a post using @ZodInputType',
    nullable: true,
  })
  async updatePost(
    @Args('id', { type: () => Int }) id: number,
    @Args('input', { type: () => UpdatePostInputDto })
    input: UpdatePostInputDto,
  ): Promise<Post | null> {
    console.log(`🎯 GraphQL Mutation: Updating post ${id} with @ZodInputType`);

    const postIndex = posts.findIndex((post) => post.id === id);
    if (postIndex === -1) {
      return null;
    }

    // Merge the updates
    posts[postIndex] = {
      ...posts[postIndex],
      ...input,
    };

    console.log('✅ Updated post:', posts[postIndex]);
    return posts[postIndex];
  }

  @Mutation(() => Boolean, {
    name: 'deletePost',
    description: 'Delete a post by ID',
  })
  async deletePost(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    console.log(`🎯 GraphQL Mutation: Deleting post ${id}`);

    const index = posts.findIndex((post) => post.id === id);
    if (index > -1) {
      posts.splice(index, 1);
      console.log('✅ Deleted post');
      return true;
    }
    console.log('❌ Post not found');
    return false;
  }
}
