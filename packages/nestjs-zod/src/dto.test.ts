import { createZodDto, ZodObjectType, ZodInputType } from './dto'
import { z as actualZod } from 'zod'
import { z as nestjsZod } from '@nest-zod/z'

describe.each([
  ['zod', actualZod],
  ['@nest-zod/z', nestjsZod],
])('createZodDto (using %s)', (description, z) => {
  it('should correctly create DTO', () => {
    const UserSchema = z.object({
      username: z.string(),
      password: z.string(),
    })

    class UserDto extends createZodDto(UserSchema) {}

    expect(UserDto.isZodDto).toBe(true)
    expect(UserDto.schema).toBe(UserSchema)

    const user = UserDto.create({
      username: 'vasya',
      password: 'strong',
    })

    expect(user).toEqual({
      username: 'vasya',
      password: 'strong',
    })
  })
});

describe.each([
  ['zod', actualZod],
  ['@nest-zod/z', nestjsZod],
])('ZodObjectType decorator (using %s)', (description, z) => {
  const UserSchema = z.object({
    username: z.string().describe('User name'),
    password: z.string().describe('User password'),
  })

  it('should work with schema parameter', () => {
    @ZodObjectType(UserSchema)
    class UserDto {}

    // Check that constructor has been enhanced
    expect((UserDto as any).schema).toBe(UserSchema)
    expect((UserDto as any).isZodDto).toBe(true)
  })

  it('should work without parameters when extending createZodDto', () => {
    @ZodObjectType()
    class UserDto extends createZodDto(UserSchema) {}

    // Check that GraphQL metadata would be applied (constructor should be enhanced)
    expect((UserDto as any).schema).toBe(UserSchema)
    expect((UserDto as any).isZodDto).toBe(true)
  })

  it('should work with custom name and options', () => {
    @ZodObjectType(UserSchema, 'CustomUser', { description: 'Custom user type' })
    class UserDto {}

    expect((UserDto as any).schema).toBe(UserSchema)
    expect((UserDto as any).isZodDto).toBe(true)
  })

  it('should warn when no schema found', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

    @ZodObjectType()
    class UserDto {}

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('@ZodObjectType: No schema found for class UserDto')
    )
    
    consoleSpy.mockRestore()
  })
});

describe.each([
  ['zod', actualZod],
  ['@nest-zod/z', nestjsZod],
])('ZodInputType decorator (using %s)', (description, z) => {
  const CreateUserSchema = z.object({
    username: z.string().describe('User name'),
    password: z.string().describe('User password'),
  })

  it('should work with schema parameter', () => {
    @ZodInputType(CreateUserSchema)
    class CreateUserDto {}

    // Check that constructor has been enhanced
    expect((CreateUserDto as any).schema).toBe(CreateUserSchema)
    expect((CreateUserDto as any).isZodDto).toBe(true)
  })

  it('should work without parameters when extending createZodDto', () => {
    @ZodInputType()
    class CreateUserDto extends createZodDto(CreateUserSchema) {}

    // Check that GraphQL metadata would be applied (constructor should be enhanced)
    expect((CreateUserDto as any).schema).toBe(CreateUserSchema)
    expect((CreateUserDto as any).isZodDto).toBe(true)
  })

  it('should work with custom name and options', () => {
    @ZodInputType(CreateUserSchema, 'CreateUserInput', { description: 'Input for creating user' })
    class CreateUserDto {}

    expect((CreateUserDto as any).schema).toBe(CreateUserSchema)
    expect((CreateUserDto as any).isZodDto).toBe(true)
  })

  it('should warn when no schema found', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

    @ZodInputType()
    class CreateUserDto {}

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('@ZodInputType: No schema found for class CreateUserDto')
    )
    
    consoleSpy.mockRestore()
  })
});


describe.each([
  ['zod', actualZod],
  ['@nest-zod/z', nestjsZod],
])('Nested schema support (using %s)', (description, z) => {
  it('should support nested ZodObjectType decorators', () => {
    const AuthorSchema = z.object({
      id: z.number().describe('Author ID'),
      name: z.string().describe('Author name'),
    })

    const PostSchema = z.object({
      id: z.number().describe('Post ID'),
      title: z.string().describe('Post title'),
      author: AuthorSchema.describe('Post author'),
    })

    // 先定義巢狀的 DTO
    @ZodObjectType()
    class AuthorDto extends createZodDto(AuthorSchema) {}

    // 再定義包含巢狀的 DTO
    @ZodObjectType()
    class PostDto extends createZodDto(PostSchema) {}

    // 驗證兩個 DTO 都正確創建
    expect((AuthorDto as any).schema).toBe(AuthorSchema)
    expect((PostDto as any).schema).toBe(PostSchema)
    expect((AuthorDto as any).isZodDto).toBe(true)
    expect((PostDto as any).isZodDto).toBe(true)
  })
});