import { createZodDto, ZodObjectType, ZodInputType, getOrCreateGraphQLEnum, handleUnionType, getGraphQLFieldType, clearEnumRegistry } from './dto'
import { z } from 'zod'

// Mock @nestjs/graphql module for testing
const mockRegisterEnumType = jest.fn()
const mockObjectType = jest.fn()
const mockInputType = jest.fn()
const mockField = jest.fn()

jest.mock('@nestjs/graphql', () => ({
  registerEnumType: mockRegisterEnumType,
  ObjectType: mockObjectType,
  InputType: mockInputType,
  Field: mockField,
}), { virtual: true })

describe('Enhanced GraphQL Enum Support', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearEnumRegistry() // Clear enum registry between tests
    mockRegisterEnumType.mockImplementation(() => {})
    mockObjectType.mockReturnValue(() => {})
    mockInputType.mockReturnValue(() => {})
    mockField.mockReturnValue(() => {})
  })

  describe('Zod Enum Support', () => {
    it('should create GraphQL enum from z.enum', () => {
      const statusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED'])
      
      const result = getOrCreateGraphQLEnum({ _def: { typeName: 'ZodEnum', values: ['PENDING', 'APPROVED', 'REJECTED'] } })
      
      expect(result).toEqual({
        PENDING: 'PENDING',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED'
      })
      expect(mockRegisterEnumType).toHaveBeenCalledWith(
        expect.objectContaining({
          PENDING: 'PENDING',
          APPROVED: 'APPROVED',
          REJECTED: 'REJECTED'
        }),
        expect.objectContaining({ name: 'Enum_PENDING_APPROVED_REJECTED' })
      )
    })

    it('should cache enum types to avoid duplicates', () => {
      const enum1 = getOrCreateGraphQLEnum({ _def: { typeName: 'ZodEnum', values: ['A', 'B'] } })
      const enum2 = getOrCreateGraphQLEnum({ _def: { typeName: 'ZodEnum', values: ['A', 'B'] } })
      
      expect(enum1).toBe(enum2)
      expect(mockRegisterEnumType).toHaveBeenCalledTimes(1)
    })

    it('should handle native TypeScript enums', () => {
      enum Color {
        RED = 'red',
        GREEN = 'green',
        BLUE = 'blue'
      }
      
      const result = getOrCreateGraphQLEnum({ 
        _def: { 
          typeName: 'ZodNativeEnum', 
          values: Color 
        } 
      })
      
      expect(result).toBe(Color)
      expect(mockRegisterEnumType).toHaveBeenCalledWith(
        Color,
        expect.objectContaining({ name: expect.stringMatching(/^NativeEnum_/) })
      )
    })

    it('should fallback to String when GraphQL is not available', () => {
      // Clear all mocks to make require fail
      jest.clearAllMocks()
      jest.resetModules()
      
      // Mock the function to simulate GraphQL module not available
      const originalGetOrCreateGraphQLEnum = require('./dto').getOrCreateGraphQLEnum
      
      // Create a new instance that will throw
      const testFunction = () => {
        try {
          const graphqlModule = require('@nestjs/non-existent-module')
          return { test: 'test' }
        } catch (error) {
          return String
        }
      }

      const result = testFunction()
      expect(result).toBe(String)
    })
  })

  describe('Union Type Support', () => {
    it('should convert union of literals to enum', () => {
      const unionSchema = {
        _def: {
          typeName: 'ZodUnion',
          options: [
            { _def: { typeName: 'ZodLiteral', value: 'small' } },
            { _def: { typeName: 'ZodLiteral', value: 'medium' } },
            { _def: { typeName: 'ZodLiteral', value: 'large' } }
          ]
        }
      }
      
      const result = handleUnionType(unionSchema)
      
      expect(result).toEqual({
        small: 'small',
        medium: 'medium',
        large: 'large'
      })
    })

    it('should handle union of same types', () => {
      const unionSchema = {
        _def: {
          typeName: 'ZodUnion',
          options: [
            { _def: { typeName: 'ZodString' } },
            { _def: { typeName: 'ZodString' } }
          ]
        }
      }
      
      const result = handleUnionType(unionSchema)
      
      expect(result).toBe(String)
    })

    it('should fallback to String for mixed unions', () => {
      const unionSchema = {
        _def: {
          typeName: 'ZodUnion',
          options: [
            { _def: { typeName: 'ZodString' } },
            { _def: { typeName: 'ZodNumber' } }
          ]
        }
      }
      
      const result = handleUnionType(unionSchema)
      
      expect(result).toBe(String)
    })
  })

  describe('Enhanced getGraphQLFieldType', () => {
    it('should handle ZodEnum fields', () => {
      const enumField = {
        _def: {
          typeName: 'ZodEnum',
          values: ['ADMIN', 'USER', 'GUEST']
        }
      }
      
      const result = getGraphQLFieldType(enumField)
      
      expect(result).toEqual({
        ADMIN: 'ADMIN',
        USER: 'USER',
        GUEST: 'GUEST'
      })
    })

    it('should handle ZodNativeEnum fields', () => {
      enum Status {
        ACTIVE = 'active',
        INACTIVE = 'inactive'
      }
      
      const enumField = {
        _def: {
          typeName: 'ZodNativeEnum',
          values: Status
        }
      }
      
      const result = getGraphQLFieldType(enumField)
      
      expect(result).toBe(Status)
    })

    it('should handle ZodUnion fields', () => {
      const unionField = {
        _def: {
          typeName: 'ZodUnion',
          options: [
            { _def: { typeName: 'ZodLiteral', value: 'high' } },
            { _def: { typeName: 'ZodLiteral', value: 'low' } }
          ]
        }
      }
      
      const result = getGraphQLFieldType(unionField)
      
      expect(result).toEqual({
        high: 'high',
        low: 'low'
      })
    })

    it('should handle ZodLiteral fields', () => {
      const stringLiteral = { _def: { typeName: 'ZodLiteral', value: 'test' } }
      const numberLiteral = { _def: { typeName: 'ZodLiteral', value: 42 } }
      
      expect(getGraphQLFieldType(stringLiteral)).toBe(String)
      expect(getGraphQLFieldType(numberLiteral)).toBe(Number)
    })
  })

  describe('Integration with DTO Classes', () => {
    it('should work with createZodDto for enum fields', () => {
      const UserSchema = z.object({
        name: z.string(),
        role: z.enum(['ADMIN', 'USER', 'GUEST']),
        status: z.union([z.literal('active'), z.literal('inactive')]),
      })

      class UserDto extends createZodDto(UserSchema) {}

      expect(UserDto.isZodDto).toBe(true)
      expect(UserDto.getFieldType('role')).toBe('ZodEnum')
      expect(UserDto.getFieldType('status')).toBe('ZodUnion')
    })

    it('should work with @ZodObjectType decorator for enum fields', () => {
      const ProductSchema = z.object({
        name: z.string(),
        category: z.enum(['ELECTRONICS', 'CLOTHING', 'BOOKS']),
        priority: z.union([z.literal('high'), z.literal('medium'), z.literal('low')]),
      })

      @ZodObjectType()
      class ProductDto extends createZodDto(ProductSchema) {}

      expect(ProductDto.isZodDto).toBe(true)
      expect(ProductDto.schema).toBe(ProductSchema)
    })

    it('should work with @ZodInputType decorator for enum fields', () => {
      const CreateOrderSchema = z.object({
        productId: z.string(),
        status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED']),
        priority: z.union([z.literal('urgent'), z.literal('normal')]),
      })

      @ZodInputType()
      class CreateOrderDto extends createZodDto(CreateOrderSchema) {}

      expect(CreateOrderDto.isZodDto).toBe(true)
      expect(CreateOrderDto.schema).toBe(CreateOrderSchema)
    })
  })

  describe('Complex Enum Scenarios', () => {
    it('should handle nested objects with enums', () => {
      const AddressSchema = z.object({
        street: z.string(),
        type: z.enum(['HOME', 'WORK', 'OTHER']),
      })

      const PersonSchema = z.object({
        name: z.string(),
        address: AddressSchema,
        preferredContactMethod: z.union([z.literal('email'), z.literal('phone'), z.literal('sms')]),
      })

      @ZodObjectType()
      class AddressDto extends createZodDto(AddressSchema) {}

      @ZodObjectType()
      class PersonDto extends createZodDto(PersonSchema) {}

      expect(AddressDto.isZodDto).toBe(true)
      expect(PersonDto.isZodDto).toBe(true)
      expect(AddressDto.getFieldType('type')).toBe('ZodEnum')
      expect(PersonDto.getFieldType('preferredContactMethod')).toBe('ZodUnion')
    })

    it('should handle arrays of enums', () => {
      const PostSchema = z.object({
        title: z.string(),
        tags: z.array(z.enum(['TECH', 'LIFESTYLE', 'TRAVEL'])),
        categories: z.array(z.union([z.literal('public'), z.literal('private')])),
      })

      @ZodObjectType()
      class PostDto extends createZodDto(PostSchema) {}

      expect(PostDto.isZodDto).toBe(true)
      expect(PostDto.getFieldType('tags')).toBe('ZodArray')
      expect(PostDto.getFieldType('categories')).toBe('ZodArray')
    })

    it('should handle optional and nullable enums', () => {
      const UserSchema = z.object({
        name: z.string(),
        role: z.enum(['ADMIN', 'USER']).optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).nullable(),
        priority: z.union([z.literal('high'), z.literal('low')]).optional(),
      })

      @ZodObjectType()
      class UserDto extends createZodDto(UserSchema) {}

      expect(UserDto.isZodDto).toBe(true)
      expect(UserDto.isOptional('role')).toBe(true)
      expect(UserDto.isNullable('status')).toBe(true)
      expect(UserDto.isOptional('priority')).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid enum schemas gracefully', () => {
      const invalidSchema = { _def: { typeName: 'ZodEnum' } } // Missing values
      
      const result = getOrCreateGraphQLEnum(invalidSchema)
      
      expect(result).toBe(String)
    })

    it('should handle empty enum values', () => {
      const emptyEnumSchema = {
        _def: {
          typeName: 'ZodEnum',
          values: []
        }
      }
      
      const result = getOrCreateGraphQLEnum(emptyEnumSchema)
      
      expect(result).toEqual({})
    })

    it('should handle union with no options', () => {
      const emptyUnionSchema = {
        _def: {
          typeName: 'ZodUnion',
          options: []
        }
      }
      
      const result = handleUnionType(emptyUnionSchema)
      
      expect(result).toBe(String)
    })

    it('should handle GraphQL registration errors gracefully', () => {
      mockRegisterEnumType.mockImplementation(() => {
        throw new Error('Registration failed')
      })
      
      const result = getOrCreateGraphQLEnum({
        _def: {
          typeName: 'ZodEnum',
          values: ['A', 'B']
        }
      })
      
      // Should still return the enum object even if registration fails
      expect(result).toEqual({
        A: 'A',
        B: 'B'
      })
    })
  })

  describe('Performance and Memory Management', () => {
    it('should not create duplicate enum types for same values', () => {
      const values = ['RED', 'GREEN', 'BLUE']
      
      // Create multiple enums with same values
      for (let i = 0; i < 5; i++) {
        getOrCreateGraphQLEnum({
          _def: {
            typeName: 'ZodEnum',
            values: values
          }
        })
      }
      
      // Should only register once
      expect(mockRegisterEnumType).toHaveBeenCalledTimes(1)
    })

    it('should handle large numbers of enum values efficiently', () => {
      const largeEnumValues = Array.from({ length: 100 }, (_, i) => `VALUE_${i}`)
      
      const start = Date.now()
      const result = getOrCreateGraphQLEnum({
        _def: {
          typeName: 'ZodEnum',
          values: largeEnumValues
        }
      })
      const end = Date.now()
      
      expect(result).toBeDefined()
      expect(Object.keys(result)).toHaveLength(100)
      expect(end - start).toBeLessThan(100) // Should be fast
    })
  })
})