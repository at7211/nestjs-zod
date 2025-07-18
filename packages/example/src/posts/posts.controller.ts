import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiOkResponse } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { 
  PostDto,           // ✨ UNIFIED: Using enhanced createZodDto!
  Post as PostType,
  CreatePost,
  mockPosts
} from './posts.dto'

@Controller('posts')
export class PostsController {
  @Post()
  createPost(@Body() body: CreatePost) {
    // Create new post with generated ID
    const newPost: PostType = {
      id: Date.now(),
      ...body
    }
    
    return newPost
  }

  @Get()
  @ApiOkResponse({ type: [PostDto], description: 'Get all posts' })
  getAll(): PostType[] {
    return mockPosts
  }

  @Get(':id')
  @ApiOkResponse({ type: PostDto, description: 'Get a post by ID' })
  getById(@Param('id') id: string): PostType {
    const postId = parseInt(id)
    const post = mockPosts.find(p => p.id === postId)
    
    if (!post) {
      // Return a default post for demo
      const defaultPost: PostType = {
        id: postId,
        title: 'Default Post',
        content: 'This post was created with ZodGraphQL decorator!',
        authorId: 1,
      }
      return defaultPost
    }
    
    return post
  }
}
