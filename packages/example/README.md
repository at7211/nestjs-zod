# NestJS Zod Example

This example demonstrates the complete usage of `nestjs-zod` with both REST and GraphQL APIs, showcasing the minimal decorator approach for unified schema validation.

## Features Demonstrated

- ✨ **Minimal GraphQL Decorators**: `@ZodObjectType` and `@ZodInputType`
- 🔄 **Unified DTOs**: Single schema for both REST and GraphQL
- 🎯 **Automatic Field Generation**: Auto-generated GraphQL fields from Zod schemas
- 📝 **Automatic Descriptions**: Field descriptions from Zod `.describe()`
- 🛡️ **Validation**: Request validation using Zod schemas
- 📚 **Swagger Integration**: OpenAPI documentation generation
- 🎨 **Enhanced GraphQL Enum Support**: Automatic enum type generation from Zod schemas

## Quick Start

```bash
# Install dependencies
$ pnpm install

# Start the development server
$ pnpm run start:dev
```

The application will be available at:
- **REST API**: http://localhost:3001
- **GraphQL Playground**: http://localhost:3001/graphql  
- **Swagger Docs**: http://localhost:3001/api

## 🎨 Enhanced GraphQL Enum Examples

Check out the enhanced enum support in the [`src/enums/`](src/enums/) directory:

- **Simple Enum Examples**: [`src/enums/simple-enum.dto.ts`](src/enums/simple-enum.dto.ts)
- **GraphQL Resolvers**: [`src/enums/simple-enum.resolver.ts`](src/enums/simple-enum.resolver.ts)
- **Usage Guide**: [`src/enums/README.md`](src/enums/README.md)

**Try these enhanced enum queries:**
```graphql
# See the demo and available features
query { simpleEnumDemo }

# Query users with enum fields
query {
  simpleUsers {
    role        # ADMIN | USER | GUEST
    priority    # HIGH | MEDIUM | LOW
  }
}

# Create user with enum validation
mutation {
  createSimpleUser(input: {
    name: "Test User"
    role: ADMIN
    priority: HIGH
  }) { id name role priority }
}
```

## Example Code

### Zod Schema (Single Source of Truth)

```ts
import { z } from 'zod'

export const PostSchema = z.object({
  id: z.number().describe('The unique identifier of the post'),
  title: z.string().describe('The title of the post'),
  content: z.string().describe('The main content of the post'),
  authorId: z.number().describe('The identifier of the post author'),
})

export const CreatePostSchema = z.object({
  title: z.string().describe('The title of the post'),
  content: z.string().describe('The main content of the post'),
  authorId: z.number().describe('The identifier of the post author'),
})
```

### Minimal GraphQL DTOs

Choose your preferred approach:

#### Option 1: Minimal with schema parameter

```ts
import { ZodObjectType, ZodInputType } from '@at7211/nestjs-zod'

// Just 2 lines per DTO! 🎉
@ZodObjectType(PostSchema)
export class PostDto {}

@ZodInputType(CreatePostSchema)
export class CreatePostInputDto {}
```

#### Option 2: No parameters with inheritance (maximum type safety)

```ts
import { ZodObjectType, ZodInputType, createZodDto } from '@at7211/nestjs-zod'

// Full TypeScript support with intellisense! 🎯
@ZodObjectType()
export class PostDto extends createZodDto(PostSchema) {}

@ZodInputType()
export class CreatePostInputDto extends createZodDto(CreatePostSchema) {}

// Now you get complete TypeScript support:
const post = new PostDto()
post.id    // ✅ TypeScript autocomplete
post.title // ✅ Full intellisense
```

### GraphQL Resolver

```ts
@Resolver(() => PostDto)
export class PostsResolver {
  @Query(() => [PostDto])
  async getPosts(): Promise<Post[]> {
    return this.postsService.findAll()
  }

  @Mutation(() => PostDto)
  async createPost(
    @Args('input', { type: () => CreatePostInputDto }) input: CreatePostInputDto
  ): Promise<Post> {
    return this.postsService.create(input)
  }
}
```

### REST Controller

```ts
@Controller('posts')
export class PostsController {
  @Post()
  createPost(@Body() body: CreatePost) {
    return this.postsService.create(body)
  }

  @Get()
  @ApiOkResponse({ type: [PostDto], description: 'Get all posts' })
  getAll(): Post[] {
    return this.postsService.findAll()
  }
}
```

## Available Scripts

```bash
# Development
$ pnpm run start:dev

# Production build
$ pnpm run build
$ pnpm run start:prod

# Testing
$ pnpm run test
```

## Key Benefits

- **75% less code** compared to traditional NestJS GraphQL
- **Single source of truth** - define schema once, use everywhere
- **Automatic field generation** from Zod schema with descriptions
- **Perfect TypeScript integration** with IntelliSense
- **Drop-in replacement** for `@ObjectType`/`@InputType`
- **Built-in validation** using the same Zod schema
- **Two flexible approaches**: minimal decorators or maximum type safety with inheritance
- **No schema duplication** when using inheritance approach

## Testing GraphQL Queries

Try these sample queries in GraphQL Playground at http://localhost:3001/graphql:

```graphql
# Get all posts
query {
  posts {
    id
    title
    content
    authorId
  }
}

# Create a new post
mutation {
  createPost(input: {
    title: "My New Post"
    content: "This is the content of my post"
    authorId: 1
  }) {
    id
    title
    content
    authorId
  }
}
```

## Resources

- [nestjs-zod Main Repository](../../../README.md)
- [NestJS Documentation](https://docs.nestjs.com)
- [Zod Documentation](https://zod.dev)
- [GraphQL Documentation](https://graphql.org)
