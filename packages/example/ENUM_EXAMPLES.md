# Enhanced GraphQL Enum Support Examples

This document demonstrates the new enhanced GraphQL enum support in `@at7211/nestjs-zod`.

## 🎯 Key Features

- ✅ **Automatic GraphQL Enum Generation** from Zod schemas
- ✅ **Native TypeScript Enum Support** 
- ✅ **Union of Literals** converted to enums automatically
- ✅ **Full Type Safety** with IntelliSense
- ✅ **Runtime Validation** of enum values
- ✅ **Single Source of Truth** - Zod drives both validation and GraphQL

## 📋 Supported Enum Types

### 1. Zod Enum (`z.enum`)
```typescript
const UserRoleSchema = z.enum(['ADMIN', 'USER', 'GUEST']);
```

**Generated GraphQL:**
```graphql
enum UserRole {
  ADMIN
  USER
  GUEST
}
```

### 2. Native TypeScript Enum
```typescript
enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

const schema = z.object({
  priority: z.nativeEnum(Priority)
});
```

**Generated GraphQL:**
```graphql
enum Priority {
  HIGH
  MEDIUM
  LOW
}
```

### 3. Union of Literals
```typescript
const SizeSchema = z.union([
  z.literal('small'),
  z.literal('medium'),
  z.literal('large'),
  z.literal('extra-large'),
]);
```

**Generated GraphQL:**
```graphql
enum Size {
  small
  medium
  large
  extra_large
}
```

## 🏗️ Complete Example

### Schema Definition
```typescript
import { z } from 'zod';
import { ZodObjectType, ZodInputType, createZodDto } from '@at7211/nestjs-zod';

// Define enums
export const UserRoleSchema = z.enum(['ADMIN', 'USER', 'GUEST']);
export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// Create schema with enums
export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  role: UserRoleSchema,
  priority: z.nativeEnum(Priority),
  preferredSize: z.union([
    z.literal('small'),
    z.literal('large')
  ]),
});

// Generate DTOs
@ZodObjectType()
export class UserDto extends createZodDto(UserSchema) {}

@ZodInputType()
export class CreateUserInput extends createZodDto(UserSchema.omit({ id: true })) {}
```

### Resolver Implementation
```typescript
@Resolver(() => UserDto)
export class UsersResolver {
  @Query(() => [UserDto])
  async getUsers(): Promise<UserDto[]> {
    const users = await this.usersService.findAll();
    // Automatic enum validation on parse
    return users.map(user => UserDto.parse(user));
  }

  @Mutation(() => UserDto)
  async createUser(
    @Args('input') input: CreateUserInput
  ): Promise<UserDto> {
    // Input automatically validated with enum constraints
    const validated = CreateUserInput.parse(input);
    const user = await this.usersService.create(validated);
    return UserDto.parse(user);
  }
}
```

### Generated GraphQL Schema
```graphql
enum UserRole {
  ADMIN
  USER
  GUEST
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum Size {
  small
  large
}

type User {
  id: Int!
  name: String!
  role: UserRole!
  priority: Priority!
  preferredSize: Size!
}

input CreateUserInput {
  name: String!
  role: UserRole!
  priority: Priority!
  preferredSize: Size!
}
```

## 🧪 Testing the Examples

### Start the Example Application
```bash
cd packages/example
npm run start:dev
```

### Open GraphQL Playground
Navigate to `http://localhost:3000/graphql`

### Try These Queries

#### 1. Query Users with Enums
```graphql
query {
  enumUsers {
    id
    name
    role        # Returns: ADMIN | USER | GUEST
    priority    # Returns: HIGH | MEDIUM | LOW  
    preferredSize # Returns: small | medium | large | extra_large
  }
}
```

#### 2. Filter by Enum Value
```graphql
query {
  usersByRole(role: "ADMIN") {
    id
    name
    role
  }
}
```

#### 3. Create User with Enum Validation
```graphql
mutation {
  createUserWithEnums(input: {
    name: "John Doe"
    email: "john@example.com"
    role: ADMIN           # Enum value with validation
    priority: HIGH        # Enum value with validation
    preferredSize: large  # Enum value with validation
  }) {
    id
    name
    role
    priority
  }
}
```

#### 4. Complex Product with Multiple Enums
```graphql
mutation {
  createProductWithEnums(input: {
    name: "Premium T-Shirt"
    status: PUBLISHED
    priority: HIGH
    availableSizes: [small, medium, large]  # Array of enum values
    primaryColor: BLUE
    tags: [USER, GUEST]
  }) {
    id
    name
    status
    availableSizes
    primaryColor
  }
}
```

#### 5. Nested Objects with Enums
```graphql
query {
  enumOrders {
    id
    status                    # Order status enum
    priority                  # Priority enum
    shippingAddress {
      addressType            # Address type enum
    }
    items {
      size                   # Size enum
      color                  # Optional color enum
    }
    notifications            # Array of notification type enums
  }
}
```

## 🎨 Advanced Features

### Optional and Nullable Enums
```typescript
const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.enum(['en', 'es', 'fr']).nullable(),
  notifications: z.array(z.enum(['email', 'sms', 'push'])).default([]),
});
```

### Nested Objects with Enums
```typescript
const OrderSchema = z.object({
  status: z.enum(['PENDING', 'SHIPPED', 'DELIVERED']),
  shippingAddress: z.object({
    addressType: z.enum(['HOME', 'WORK', 'OTHER']),
  }),
  items: z.array(z.object({
    size: z.union([z.literal('S'), z.literal('M'), z.literal('L')]),
    color: z.nativeEnum(Color).optional(),
  })),
});
```

### Custom Methods on DTO Classes
```typescript
@ZodObjectType()
export class UserDto extends createZodDto(UserSchema) {
  // Add custom methods
  isAdmin(): boolean {
    return this.role === 'ADMIN';
  }
  
  getDisplayRole(): string {
    return this.role.toLowerCase().replace('_', ' ');
  }
}
```

## 🔍 Validation Benefits

### Runtime Validation
```typescript
// This will throw a ZodError if role is invalid
const user = UserDto.parse({
  id: 1,
  name: "Test",
  role: "INVALID_ROLE", // ❌ Error: Invalid enum value
  priority: Priority.HIGH,
  preferredSize: "medium"
});
```

### Type Safety
```typescript
// Full TypeScript IntelliSense
const user: UserDto = {
  id: 1,
  name: "Test",
  role: "ADMIN",        // ✅ IDE suggests: ADMIN | USER | GUEST
  priority: Priority.HIGH, // ✅ IDE suggests: Priority.HIGH | Priority.MEDIUM | Priority.LOW
  preferredSize: "large"   // ✅ IDE suggests: small | medium | large | extra-large
};
```

## 🚀 Migration from Basic Implementation

### Before (Basic String Enum)
```typescript
// Old way - enums treated as strings
const UserSchema = z.object({
  role: z.enum(['ADMIN', 'USER']),  // Becomes String in GraphQL
});
```

### After (Enhanced Enum Support)
```typescript
// New way - automatic GraphQL enum generation
const UserSchema = z.object({
  role: z.enum(['ADMIN', 'USER']),  // Becomes proper GraphQL enum
});

@ZodObjectType()
export class UserDto extends createZodDto(UserSchema) {}
```

**GraphQL Result:**
```graphql
# Automatically generated!
enum Role {
  ADMIN
  USER
}

type User {
  role: Role!  # Proper enum type instead of String
}
```

## 📊 Performance Notes

- **Caching**: Enum types are cached to avoid duplicates
- **Memory Efficient**: Uses WeakMaps for schema-class mappings
- **Lazy Loading**: GraphQL enums are only created when needed
- **Error Handling**: Graceful fallback to String if GraphQL is unavailable

## 🛠️ Troubleshooting

### Common Issues

1. **Enum not showing in GraphQL Schema**
   - Ensure `@nestjs/graphql` is properly installed
   - Check that the enum is actually used in a resolver

2. **Validation Errors**
   - Verify enum values match exactly (case-sensitive)
   - Check for typos in enum definitions

3. **TypeScript Errors**
   - Ensure proper imports from `@at7211/nestjs-zod`
   - Update TypeScript to latest version for better enum support

### Debug Mode
```typescript
// Enable debug logging
console.log(UserDto.getFieldType('role')); // Should show 'ZodEnum'
console.log(UserDto.getFieldNames());      // Shows all field names
```

## 🎉 Benefits Summary

1. **🎯 Type Safety**: Full compile-time and runtime type safety
2. **🚀 Auto-Generation**: No manual GraphQL enum definitions needed  
3. **🔍 Validation**: Automatic enum value validation
4. **💡 IntelliSense**: Full IDE support with auto-completion
5. **🧹 DRY**: Single source of truth for enums
6. **🔄 Flexible**: Works with all Zod enum patterns
7. **⚡ Performance**: Efficient caching and lazy loading
8. **🛡️ Robust**: Graceful error handling and fallbacks

Start using enhanced enum support today for better GraphQL APIs! 🚀