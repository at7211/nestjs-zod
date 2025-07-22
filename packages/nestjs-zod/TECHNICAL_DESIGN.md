# Parameter-less NestJS Zod Decorators: Technical Design & Implementation

## Overview

This document explains the technical details of implementing parameter-less `@ZodObjectType()` and `@ZodInputType()` decorators that automatically work with `createZodDto` inheritance and support nested schemas without manual registration.

## Problem Statement

### Original Challenge

The goal was to enable this usage pattern:

```typescript
// Define schemas once
export const AuthorSchema = z.object({
  id: z.number().describe('Author ID'),
  name: z.string().describe('Author name'),
  email: z.string().email().describe('Author email'),
});

export const PostSchema = z.object({
  id: z.number().describe('Post ID'),
  title: z.string().describe('Post title'),
  author: AuthorSchema, // Nested schema
});

// Use parameter-less decorators
@ZodObjectType()
export class AuthorDto extends createZodDto(AuthorSchema) {}

@ZodObjectType() 
export class PostDto extends createZodDto(PostSchema) {}
```

### Core Challenges

1. **Schema Extraction**: Decorators needed to extract schemas from `createZodDto` inheritance
2. **TypeScript Support**: Maintain full type safety and property access (e.g., `PostDto.title`)
3. **Nested Schema Resolution**: Automatically resolve nested object types for GraphQL
4. **Timing Issues**: Decorator execution timing vs GraphQL schema building order

## Technical Architecture

### 1. Decorator Overloads

We implemented multiple overloads to support different usage patterns:

```typescript
// With schema parameter (backward compatibility)
export function ZodObjectType<T>(
  schema: ZodSchema<T>, 
  name?: string, 
  options?: ZodObjectTypeOptions
): <T extends new (...args: any[]) => any>(constructor: T) => T

// With name only
export function ZodObjectType(
  name?: string,
  options?: ZodObjectTypeOptions
): <T extends new (...args: any[]) => any>(constructor: T) => T

// Parameter-less (new functionality)
export function ZodObjectType(): <T extends new (...args: any[]) => any>(constructor: T) => T
```

### 2. Schema Extraction Logic

The decorator implementation extracts schemas from `createZodDto` inheritance:

```typescript
export function ZodObjectType(/* overload parameters */) {
  return function<T extends new (...args: any[]) => any>(constructor: T): T {
    let schema: ZodSchema | undefined
    
    if (schemaProvided) {
      schema = providedSchema
    } else {
      // Extract from createZodDto inheritance
      schema = (constructor as any).schema || 
               (constructor as any).__zodSchema ||
               (constructor.prototype?.constructor?.schema) ||
               (Object.getPrototypeOf(constructor) as any)?.schema
    }
    
    // Apply GraphQL decorators and register mappings
    // ...
  }
}
```

### 3. Schema-to-Class Mapping System

We use WeakMaps for efficient bidirectional schema-class mapping:

```typescript
// Global mappings for GraphQL field resolution
const schemaToClassMap = new WeakMap<ZodSchema<any>, any>()
const classToSchemaMap = new WeakMap<any, ZodSchema<any>>()

// Register mappings during decorator execution
schemaToClassMap.set(schema, constructor)
classToSchemaMap.set(constructor, schema)
```

## The Core Bottleneck: Timing Issues

### Problem Identification

The main challenge was **decorator execution timing**:

```typescript
@ZodObjectType()
export class AuthorDto extends createZodDto(AuthorSchema) {}

@ZodObjectType() 
export class PostDto extends createZodDto(PostSchema) {} // PostSchema contains AuthorSchema
```

When `PostDto`'s decorator executes:
1. It processes the `author` field (type: `ZodObject`)
2. Tries to resolve the nested schema to a DTO class
3. **Fails** because `AuthorDto`'s schema mapping isn't established yet

### Solution: Pre-Registration Mechanism

We implemented a two-phase approach:

#### Phase 1: Collection During Decorator Execution

```typescript
// Global registry for pre-registration
const dtoClassRegistry = new Set<any>()
const pendingDtoRegistrations = new Map<any, ZodSchema<any>>()

// During decorator execution
dtoClassRegistry.add(constructor)
pendingDtoRegistrations.set(constructor, schema)
```

#### Phase 2: Bulk Processing Before GraphQL Schema Building

```typescript
export function preRegisterAllDtos() {
  for (const [dtoClass, schema] of pendingDtoRegistrations.entries()) {
    // Establish primary mappings
    schemaToClassMap.set(schema, dtoClass)
    classToSchemaMap.set(dtoClass, schema)
    
    // Process nested schemas
    if (schema._def.typeName === 'ZodObject') {
      const shape = schema._def.shape()
      
      for (const [fieldName, fieldSchema] of Object.entries(shape)) {
        if (fieldSchema._def.typeName === 'ZodObject') {
          // Find matching DTO for nested schema
          for (const [otherDtoClass, otherSchema] of pendingDtoRegistrations.entries()) {
            if (otherSchema === fieldSchema) {
              schemaToClassMap.set(fieldSchema, otherDtoClass)
              break
            }
          }
        }
      }
    }
  }
}
```

## GraphQL Field Type Resolution

### Enhanced Field Type Detection

```typescript
function getGraphQLFieldType(fieldSchema: any): any {
  const typeName = fieldSchema._def.typeName
  
  switch (typeName) {
    case 'ZodString': return String
    case 'ZodNumber': return Number
    case 'ZodBoolean': return Boolean
    case 'ZodArray':
      const itemType = getGraphQLFieldType(fieldSchema._def.type)
      return itemType ? [itemType] : [String]
    case 'ZodObject':
      // Direct lookup in schema-to-class mapping
      const dtoClass = schemaToClassMap.get(fieldSchema)
      return dtoClass || Object
    case 'ZodOptional':
    case 'ZodNullable':
      return getGraphQLFieldType(fieldSchema._def.innerType || fieldSchema._def.type)
    default:
      return String
  }
}
```

### Field Decorator Application

```typescript
// Apply GraphQL @Field decorator
const typeResolver = (typeof fieldType === 'function' || fieldType.prototype) ? 
  () => fieldType : 
  () => fieldType
Field(typeResolver, fieldOptions)(constructor.prototype, fieldName)
```

## Application Integration

### Setup Phase

```typescript
// setup.ts
import { preRegisterAllDtos } from '@at7211/nestjs-zod';
import './posts/posts.dto'; // Import all DTO files

export function setupDtoPreRegistration() {
  preRegisterAllDtos(); // Process all collected DTOs
}
```

### Main Application Bootstrap

```typescript
// main.ts
import { setupDtoPreRegistration } from './setup';

// Execute pre-registration before app bootstrap
setupDtoPreRegistration();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ... GraphQL module will now find all schema mappings
}
```

## Implementation Results

### Working Example

```typescript
// Define schemas with nested relationships
export const AuthorSchema = z.object({
  id: z.number().describe('Author ID'),
  name: z.string().describe('Author name'),
  email: z.string().email().describe('Author email'),
});

export const PostSchema = z.object({
  id: z.number().describe('Post ID'),
  title: z.string().describe('Post title'),
  author: AuthorSchema, // Direct nested reference
});

// Parameter-less decorators work automatically
@ZodObjectType()
export class AuthorDto extends createZodDto(AuthorSchema) {}

@ZodObjectType() 
export class PostDto extends createZodDto(PostSchema) {}
```

### Key Benefits Achieved

1. ✅ **Single Source of Truth**: Schema defined once, used everywhere
2. ✅ **Full TypeScript Support**: `PostDto.title`, `AuthorDto.email` etc. work
3. ✅ **Automatic Nested Resolution**: No manual registration needed
4. ✅ **GraphQL Integration**: Seamless `@ObjectType` and `@Field` application
5. ✅ **Backward Compatibility**: Existing schema-parameter usage still works

## Performance Considerations

### Memory Efficiency
- Uses `WeakMap` for automatic garbage collection of unused mappings
- Registry cleanup after pre-registration to avoid memory leaks

### Execution Performance
- O(n²) complexity during pre-registration for nested schema matching
- One-time cost during application startup
- Runtime GraphQL resolution is O(1) lookup

## Debugging & Monitoring

### Built-in Logging
```typescript
console.log(`Pre-registering ${pendingDtoRegistrations.size} DTO classes...`)
console.log(`Found nested ZodObject field: ${fieldName}`)
console.log(`DTO class already registered for nested field: ${fieldName}`)
```

### Error Handling
- Graceful fallback to `Object` type when DTO mapping not found
- Warning messages for unresolved nested schemas
- Comprehensive error context for debugging

## Future Enhancements

### Potential Improvements
1. **Recursive Nested Support**: Handle deeply nested object hierarchies
2. **Union Type Support**: Resolve Zod union types to GraphQL unions
3. **Enum Integration**: Automatic GraphQL enum generation from Zod enums
4. **Validation Integration**: Runtime validation error mapping to GraphQL errors

### API Evolution
```typescript
// Potential future syntax
@ZodObjectType({ 
  autoNested: true,    // Enable automatic nested resolution
  enumAsUnion: true,   // Convert enums to GraphQL unions
  validateRuntime: true // Enable runtime validation
})
export class PostDto extends createZodDto(PostSchema) {}
```

## Conclusion

The implementation successfully achieves the goal of parameter-less NestJS Zod decorators with automatic nested schema support. The key innovation is the pre-registration mechanism that decouples decorator execution timing from schema resolution requirements.

This solution maintains full TypeScript support while providing a clean, intuitive API that eliminates boilerplate code and reduces the potential for configuration errors.