import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsResolver } from './posts.resolver';

@Module({
  controllers: [PostsController],
  providers: [PostsResolver]
})
export class PostsModule {}
