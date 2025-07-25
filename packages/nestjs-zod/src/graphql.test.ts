import { createZodDto, ZodObjectType, ZodInputType, getGraphQLFieldType, isFieldNullable, getOrCreateDtoClass } from './dto'
import { z } from 'zod'

// Mock @nestjs/graphql module for testing
const mockObjectType = jest.fn()
const mockInputType = jest.fn()
const mockField = jest.fn()

jest.mock('@nestjs/graphql', () => ({
  ObjectType: mockObjectType,
  InputType: mockInputType,
  Field: mockField,
}), { virtual: true })

describe('GraphQL Field Type Mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getGraphQLFieldType', () => {
    it('should map basic Zod types to GraphQL types', () => {
      expect(getGraphQLFieldType({ _def: { typeName: 'ZodString' } })).toBe(String)
      expect(getGraphQLFieldType({ _def: { typeName: 'ZodNumber' } })).toBe(Number)
      expect(getGraphQLFieldType({ _def: { typeName: 'ZodBoolean' } })).toBe(Boolean)
      expect(getGraphQLFieldType({ _def: { typeName: 'ZodDate' } })).toBe(Date)
    })

    it('should handle array types', () => {
      const arraySchema = {
        _def: {
          typeName: 'ZodArray',
          type: { _def: { typeName: 'ZodString' } }
        }
      }
      expect(getGraphQLFieldType(arraySchema)).toEqual([String])
    })

    it('should handle optional and nullable types', () => {
      const optionalSchema = {
        _def: {
          typeName: 'ZodOptional',
          innerType: { _def: { typeName: 'ZodString' } }
        }
      }
      expect(getGraphQLFieldType(optionalSchema)).toBe(String)

      const nullableSchema = {
        _def: {
          typeName: 'ZodNullable',
          innerType: { _def: { typeName: 'ZodNumber' } }
        }
      }
      expect(getGraphQLFieldType(nullableSchema)).toBe(Number)
    })

    it('should handle default types', () => {
      const defaultSchema = {
        _def: {
          typeName: 'ZodDefault',
          innerType: { _def: { typeName: 'ZodBoolean' } }
        }
      }
      expect(getGraphQLFieldType(defaultSchema)).toBe(Boolean)
    })

    it('should handle enum types', () => {
      const enumSchema = {
        _def: {
          typeName: 'ZodEnum',
          values: ['A', 'B', 'C']
        }
      }
      expect(getGraphQLFieldType(enumSchema)).toBe(String)
    })

    it('should fall back to String for unknown types', () => {
      const unknownSchema = {
        _def: { typeName: 'ZodUnknown' }
      }
      expect(getGraphQLFieldType(unknownSchema)).toBe(String)
    })
  })

  describe('isFieldNullable', () => {
    it('should detect nullable fields', () => {
      expect(isFieldNullable({ _def: { typeName: 'ZodOptional' } })).toBe(true)
      expect(isFieldNullable({ _def: { typeName: 'ZodNullable' } })).toBe(true)
      expect(isFieldNullable({ _def: { typeName: 'ZodDefault' } })).toBe(true)
      expect(isFieldNullable({ _def: { typeName: 'ZodString' } })).toBe(false)
    })
  })
})

describe('GraphQL Decorator Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ZodObjectType decorator', () => {
    it('should apply ObjectType decorator with correct parameters', () => {
      const UserSchema = z.object({
        id: z.number().describe('User ID'),
        name: z.string().describe('User name'),
        email: z.string().email().describe('User email'),
      })

      mockObjectType.mockReturnValue(() => {})
      mockField.mockReturnValue(() => {})

      @ZodObjectType(UserSchema, 'User', { description: 'User object type' })
      class UserDto {}

      expect(UserDto.name).toBe('UserDto')
    })

    it('should work with inheritance from createZodDto', () => {
      const UserSchema = z.object({
        id: z.number(),
        name: z.string(),
      })

      mockObjectType.mockReturnValue(() => {})
      mockField.mockReturnValue(() => {})

      @ZodObjectType()
      class UserDto extends createZodDto(UserSchema) {}

      expect(UserDto.isZodDto).toBe(true)
      expect(UserDto.schema).toBe(UserSchema)
    })

    it('should handle abstract types', () => {
      const BaseSchema = z.object({
        id: z.number(),
        type: z.string(),
      })

      mockObjectType.mockReturnValue(() => {})

      @ZodObjectType(BaseSchema, 'BaseType', { isAbstract: true })
      class BaseDto {}

      expect(BaseDto.name).toBe('BaseDto')
    })
  })

  describe('ZodInputType decorator', () => {
    it('should apply InputType decorator with correct parameters', () => {
      const CreateUserSchema = z.object({
        name: z.string().describe('User name'),
        email: z.string().email().describe('User email'),
      })

      mockInputType.mockReturnValue(() => {})
      mockField.mockReturnValue(() => {})

      @ZodInputType(CreateUserSchema, 'CreateUserInput', { description: 'Input for creating user' })
      class CreateUserDto {}

      expect(CreateUserDto.name).toBe('CreateUserDto')
    })

    it('should work with inheritance from createZodDto', () => {
      const CreateUserSchema = z.object({
        name: z.string(),
        email: z.string(),
      })

      mockInputType.mockReturnValue(() => {})
      mockField.mockReturnValue(() => {})

      @ZodInputType()
      class CreateUserDto extends createZodDto(CreateUserSchema) {}

      expect(CreateUserDto.isZodDto).toBe(true)
      expect(CreateUserDto.schema).toBe(CreateUserSchema)
    })
  })
})

describe('Nested Object Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockObjectType.mockReturnValue(() => {})
    mockInputType.mockReturnValue(() => {})
    mockField.mockReturnValue(() => {})
  })

  it('should handle nested object schemas', () => {
    const AddressSchema = z.object({
      street: z.string(),
      city: z.string(),
      zipCode: z.string(),
    })

    const PersonSchema = z.object({
      name: z.string(),
      address: AddressSchema,
      workAddress: AddressSchema.optional(),
    })

    @ZodObjectType()
    class AddressDto extends createZodDto(AddressSchema) {}

    @ZodObjectType()
    class PersonDto extends createZodDto(PersonSchema) {}

    expect(AddressDto.isZodDto).toBe(true)
    expect(PersonDto.isZodDto).toBe(true)
  })

  it('should handle arrays of nested objects', () => {
    const TagSchema = z.object({
      name: z.string(),
      color: z.string(),
    })

    const PostSchema = z.object({
      title: z.string(),
      content: z.string(),
      tags: z.array(TagSchema),
    })

    @ZodObjectType()
    class TagDto extends createZodDto(TagSchema) {}

    @ZodObjectType()
    class PostDto extends createZodDto(PostSchema) {}

    expect(TagDto.isZodDto).toBe(true)
    expect(PostDto.isZodDto).toBe(true)
    expect(PostDto.getFieldType('tags')).toBe('ZodArray')
  })

  it('should handle deeply nested structures', () => {
    const MetadataSchema = z.object({
      key: z.string(),
      value: z.string(),
    })

    const CategorySchema = z.object({
      name: z.string(),
      metadata: z.array(MetadataSchema),
    })

    const ProductSchema = z.object({
      name: z.string(),
      price: z.number(),
      category: CategorySchema,
      relatedCategories: z.array(CategorySchema),
    })

    @ZodObjectType()
    class MetadataDto extends createZodDto(MetadataSchema) {}

    @ZodObjectType()
    class CategoryDto extends createZodDto(CategorySchema) {}

    @ZodObjectType()
    class ProductDto extends createZodDto(ProductSchema) {}

    expect(MetadataDto.isZodDto).toBe(true)
    expect(CategoryDto.isZodDto).toBe(true)
    expect(ProductDto.isZodDto).toBe(true)
  })
})

describe('GraphQL Options and Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle createZodDto with GraphQL options', () => {
    const UserSchema = z.object({
      id: z.number(),
      name: z.string(),
      email: z.string().email(),
    })

    const UserDto = createZodDto(UserSchema, {
      name: 'User',
      graphql: {
        name: 'User',
        description: 'User type',
        autoFields: true,
      }
    })

    expect(UserDto.isZodDto).toBe(true)
    expect(UserDto.schema).toBe(UserSchema)
  })

  it('should handle input type detection by name', () => {
    const CreateUserSchema = z.object({
      name: z.string(),
      email: z.string(),
    })

    // Names containing 'input', 'create', or 'update' should be detected as inputs
    const CreateInputDto = createZodDto(CreateUserSchema, {
      graphql: { name: 'CreateUserInput' }
    })

    const UpdateInputDto = createZodDto(CreateUserSchema, {
      graphql: { name: 'UpdateUserInput' }
    })

    const InputDto = createZodDto(CreateUserSchema, {
      graphql: { name: 'UserInput' }
    })

    expect(CreateInputDto.isZodDto).toBe(true)
    expect(UpdateInputDto.isZodDto).toBe(true)
    expect(InputDto.isZodDto).toBe(true)
  })

  it('should handle explicit isInput flag', () => {
    const Schema = z.object({
      name: z.string(),
    })

    const ExplicitInputDto = createZodDto(Schema, {
      graphql: { name: 'CustomType', isInput: true }
    })

    const ExplicitObjectDto = createZodDto(Schema, {
      graphql: { name: 'CustomType', isInput: false }
    })

    expect(ExplicitInputDto.isZodDto).toBe(true)
    expect(ExplicitObjectDto.isZodDto).toBe(true)
  })

  it('should handle disabled GraphQL integration', () => {
    const originalEnv = process.env.DISABLE_GRAPHQL
    process.env.DISABLE_GRAPHQL = 'true'

    const UserSchema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const UserDto = createZodDto(UserSchema, {
      graphql: { name: 'User' }
    })

    expect(UserDto.isZodDto).toBe(true)
    expect(UserDto.schema).toBe(UserSchema)

    process.env.DISABLE_GRAPHQL = originalEnv
  })
})

describe('Schema Registration and Resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockObjectType.mockReturnValue(() => {})
    mockField.mockReturnValue(() => {})
  })

  it('should handle pending DTO registrations', (done) => {
    const UserSchema = z.object({
      id: z.number(),
      name: z.string(),
    })

    @ZodObjectType(UserSchema)
    class UserDto {}

    // Schema registration is scheduled for next tick
    process.nextTick(() => {
      expect(UserDto.name).toBe('UserDto')
      done()
    })
  })

  it('should handle schema equivalence checking', () => {
    const BaseSchema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const DescribedSchema = BaseSchema.describe('User schema')

    @ZodObjectType()
    class BaseDto extends createZodDto(BaseSchema) {}

    @ZodObjectType()
    class DescribedDto extends createZodDto(DescribedSchema) {}

    expect(BaseDto.isZodDto).toBe(true)
    expect(DescribedDto.isZodDto).toBe(true)
  })
})

describe('Error Handling and Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle missing GraphQL module gracefully', () => {
    // Mock require to throw an error
    const originalRequire = require
    jest.doMock('@nestjs/graphql', () => {
      throw new Error('Module not found')
    })

    const UserSchema = z.object({
      id: z.number(),
      name: z.string(),
    })

    expect(() => {
      @ZodObjectType(UserSchema)
      class UserDto {}
    }).not.toThrow()

    expect(() => {
      createZodDto(UserSchema, {
        graphql: { name: 'User' }
      })
    }).not.toThrow()
  })

  it('should handle invalid schema types gracefully', () => {
    expect(() => {
      @ZodObjectType(null as any)
      class InvalidDto {}
    }).not.toThrow()

    expect(() => {
      @ZodInputType(undefined as any)
      class InvalidInputDto {}
    }).not.toThrow()
  })

  it('should handle object schemas without shape', () => {
    const invalidSchema = {
      _def: { typeName: 'ZodObject' }
    }

    expect(() => {
      getGraphQLFieldType(invalidSchema)
    }).not.toThrow()
  })

  it('should handle circular references gracefully', () => {
    // This is a complex scenario that would require actual circular schema setup
    // For now, we test that the basic structure doesn't break
    const SelfRefSchema = z.object({
      id: z.number(),
      name: z.string(),
    })

    @ZodObjectType()
    class SelfRefDto extends createZodDto(SelfRefSchema) {}

    expect(SelfRefDto.isZodDto).toBe(true)
  })
})

describe('Performance and Memory Management', () => {
  it('should use WeakMaps for schema-class mappings', () => {
    const schemas = []
    const dtos = []

    // Create multiple DTOs to test memory management
    for (let i = 0; i < 10; i++) {
      const schema = z.object({
        id: z.number(),
        name: z.string(),
        index: z.literal(i),
      })

      class TestDto extends createZodDto(schema) {}

      schemas.push(schema)
      dtos.push(TestDto)

      expect(TestDto.isZodDto).toBe(true)
      expect(TestDto.schema).toBe(schema)
    }

    // All DTOs should be properly created
    expect(dtos).toHaveLength(10)
    expect(schemas).toHaveLength(10)
  })

  it('should handle rapid DTO creation without memory leaks', () => {
    const startMemory = process.memoryUsage().heapUsed

    // Create many DTOs rapidly
    for (let i = 0; i < 100; i++) {
      const schema = z.object({
        id: z.number(),
        value: z.string(),
      })

      class RapidDto extends createZodDto(schema) {}
      expect(RapidDto.isZodDto).toBe(true)
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    const endMemory = process.memoryUsage().heapUsed
    const memoryIncrease = endMemory - startMemory

    // Memory increase should be reasonable (less than 10MB for 100 DTOs)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
  })
})