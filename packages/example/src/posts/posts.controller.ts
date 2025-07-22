import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiOkResponse } from '@nestjs/swagger'
import { ZodSerializerDto } from '@at7211/nestjs-zod'
import {
  PostDto,
  Post as PostType,
  mockPosts,
  type CreatePostInputDto
} from './posts.dto'

@Controller('posts')
export class PostsController {
  @Post()
  @ZodSerializerDto(PostDto)
  @ApiOkResponse({ type: PostDto, description: 'Create a new post' })
  createPost(@Body() body: CreatePostInputDto) {
    // Create new post with generated ID
    const newPost = {
      id: 10,
      ...body,
    }

    return newPost
  }

  @Get()
  @ZodSerializerDto(PostDto)
  @ApiOkResponse({ type: [PostDto], description: 'Get all posts' })
  getAll(): PostType[] {
    return mockPosts
  }

  @Get(':id')
  @ZodSerializerDto(PostDto)
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
