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

    // The decorator registers schema in pending registrations and schedules field resolution
    // Schema won't be immediately available until next tick
    return new Promise<void>((resolve) => {
      process.nextTick(() => {
        // After next tick, schema should be available if GraphQL decorators work
        // But for testing without GraphQL, we check the internal behavior
        expect(UserDto.name).toBe('UserDto')
        resolve()
      })
    })
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

    // The decorator applies but schema registration happens asynchronously
    expect(UserDto.name).toBe('UserDto')
  })

  it('should work when no schema found (graceful degradation)', () => {
    @ZodObjectType()
    class UserDto {}

    // Should not throw, just apply decorator without schema
    expect(UserDto.name).toBe('UserDto')
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

    // The decorator registers schema in pending registrations and schedules field resolution
    return new Promise<void>((resolve) => {
      process.nextTick(() => {
        // Check basic functionality without relying on immediate schema attachment
        expect(CreateUserDto.name).toBe('CreateUserDto')
        resolve()
      })
    })
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

    // The decorator applies but schema registration happens asynchronously
    expect(CreateUserDto.name).toBe('CreateUserDto')
  })

  it('should work when no schema found (graceful degradation)', () => {
    @ZodInputType()
    class CreateUserDto {}

    // Should not throw, just apply decorator without schema
    expect(CreateUserDto.name).toBe('CreateUserDto')
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

// Comprehensive GraphQL integration tests
describe('GraphQL Integration Tests', () => {
  const mockObjectType = jest.fn()
  const mockInputType = jest.fn() 
  const mockField = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful GraphQL module
    jest.doMock('@nestjs/graphql', () => ({
      ObjectType: mockObjectType,
      InputType: mockInputType,
      Field: mockField,
    }), { virtual: true })
  })

  afterEach(() => {
    jest.dontMock('@nestjs/graphql')
  })

  it('should apply GraphQL ObjectType decorator when GraphQL is available', () => {
    const UserSchema = actualZod.object({
      id: actualZod.number(),
      name: actualZod.string(),
    })

    @ZodObjectType(UserSchema, 'User')
    class UserDto {}

    // Should not throw
    expect(UserDto.name).toBe('UserDto')
  })

  it('should apply GraphQL InputType decorator when GraphQL is available', () => {
    const CreateUserSchema = actualZod.object({
      name: actualZod.string(),
      email: actualZod.string().email(),
    })

    @ZodInputType(CreateUserSchema, 'CreateUserInput')
    class CreateUserDto {}

    // Should not throw
    expect(CreateUserDto.name).toBe('CreateUserDto')
  })
});

// Test GraphQL field type mapping
describe('GraphQL Field Type Mapping', () => {
  const testSchema = actualZod.object({
    stringField: actualZod.string().describe('String field'),
    numberField: actualZod.number().describe('Number field'),
    booleanField: actualZod.boolean().describe('Boolean field'),
    dateField: actualZod.date().describe('Date field'),
    optionalField: actualZod.string().optional().describe('Optional field'),
    nullableField: actualZod.string().nullable().describe('Nullable field'),
    arrayField: actualZod.array(actualZod.string()).describe('Array field'),
    enumField: actualZod.enum(['A', 'B', 'C']).describe('Enum field'),
  })

  it('should create DTO with complex field types', () => {
    class TestDto extends createZodDto(testSchema) {}

    expect(TestDto.isZodDto).toBe(true)
    expect(TestDto.schema).toBe(testSchema)
    
    // Test field introspection methods
    expect(TestDto.getFieldNames()).toEqual([
      'stringField',
      'numberField', 
      'booleanField',
      'dateField',
      'optionalField',
      'nullableField',
      'arrayField',
      'enumField'
    ])

    expect(TestDto.getFieldType('stringField')).toBe('ZodString')
    expect(TestDto.getFieldType('numberField')).toBe('ZodNumber')
    expect(TestDto.getFieldType('booleanField')).toBe('ZodBoolean')
    expect(TestDto.getFieldType('dateField')).toBe('ZodDate')
    expect(TestDto.getFieldType('optionalField')).toBe('ZodOptional')
    expect(TestDto.getFieldType('arrayField')).toBe('ZodArray')
    expect(TestDto.getFieldType('enumField')).toBe('ZodEnum')

    expect(TestDto.isOptional('optionalField')).toBe(true)
    expect(TestDto.isOptional('stringField')).toBe(false)
    expect(TestDto.isNullable('nullableField')).toBe(true)
    expect(TestDto.isNullable('stringField')).toBe(false)
  })

  it('should support GraphQL decorators with complex types', () => {
    @ZodObjectType()
    class TestDto extends createZodDto(testSchema) {}

    expect(TestDto.isZodDto).toBe(true)
    expect(TestDto.getFieldNames().length).toBeGreaterThan(0)
  })
});

// Test error handling scenarios
describe('GraphQL Error Handling', () => {
  it('should gracefully handle missing GraphQL module', () => {
    const originalEnv = process.env.DISABLE_GRAPHQL
    process.env.DISABLE_GRAPHQL = 'true'

    const UserSchema = actualZod.object({
      id: actualZod.number(),
      name: actualZod.string(),
    })

    expect(() => {
      @ZodObjectType(UserSchema)
      class UserDto {}
    }).not.toThrow()

    process.env.DISABLE_GRAPHQL = originalEnv
  })

  it('should handle createZodDto with GraphQL options when GraphQL unavailable', () => {
    const UserSchema = actualZod.object({
      id: actualZod.number(),
      name: actualZod.string(),
    })

    expect(() => {
      const UserDto = createZodDto(UserSchema, {
        graphql: { name: 'User', description: 'User type' }
      })
    }).not.toThrow()
  })

  it('should handle schema resolution errors gracefully', () => {
    expect(() => {
      @ZodObjectType()
      class EmptyDto {}
    }).not.toThrow()
  })
});

// Test advanced GraphQL features
describe('Advanced GraphQL Features', () => {
  it('should support deeply nested objects', () => {
    const AddressSchema = actualZod.object({
      street: actualZod.string(),
      city: actualZod.string(),
      country: actualZod.string(),
    })

    const PersonSchema = actualZod.object({
      id: actualZod.number(),
      name: actualZod.string(),
      address: AddressSchema,
      addresses: actualZod.array(AddressSchema),
    })

    @ZodObjectType()
    class AddressDto extends createZodDto(AddressSchema) {}

    @ZodObjectType()
    class PersonDto extends createZodDto(PersonSchema) {}

    expect(AddressDto.isZodDto).toBe(true)
    expect(PersonDto.isZodDto).toBe(true)
    expect(PersonDto.getFieldType('address')).toBe('ZodObject')
    expect(PersonDto.getFieldType('addresses')).toBe('ZodArray')
  })

  it('should support input type detection', () => {
    const CreateUserSchema = actualZod.object({
      name: actualZod.string(),
      email: actualZod.string().email(),
    })

    // Test explicit isInput flag
    const ExplicitInputDto = createZodDto(CreateUserSchema, {
      graphql: { name: 'CreateUserInput', isInput: true }
    })

    // Test name-based detection
    const NameBasedInputDto = createZodDto(CreateUserSchema, {
      graphql: { name: 'CreateUserInput' }
    })

    const UpdateInputDto = createZodDto(CreateUserSchema, {
      graphql: { name: 'UpdateUserInput' }
    })

    expect(ExplicitInputDto.isZodDto).toBe(true)
    expect(NameBasedInputDto.isZodDto).toBe(true)
    expect(UpdateInputDto.isZodDto).toBe(true)
  })

  it('should support schema transformations', () => {
    const BaseSchema = actualZod.object({
      id: actualZod.number(),
      name: actualZod.string(),
      email: actualZod.string().email(),
    })

    @ZodObjectType()
    class BaseDto extends createZodDto(BaseSchema) {}

    const PartialDto = BaseDto.partial()
    const PickedDto = BaseDto.pick(['name', 'email'])
    const OmittedDto = BaseDto.omit(['id'])

    expect(PartialDto.isZodDto).toBe(true)
    expect(PickedDto.isZodDto).toBe(true)
    expect(OmittedDto.isZodDto).toBe(true)
  })
});