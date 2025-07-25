# Enhanced GraphQL Enum Examples

This directory contains simple examples demonstrating the enhanced GraphQL enum support in `@at7211/nestjs-zod`.

## 🚀 Quick Start

1. **Start the application:**
   ```bash
   cd packages/example
   npm run start:dev
   ```

2. **Open GraphQL Playground:**
   Navigate to `http://localhost:3000/graphql`

3. **Try the demo query:**
   ```graphql
   query {
     simpleEnumDemo
   }
   ```

## 📋 Available Examples

### 1. Simple Users with Enums
- **File**: `simple-enum.dto.ts`
- **Resolver**: `SimpleEnumUsersResolver`
- **Features**: 
  - `z.enum(['ADMIN', 'USER', 'GUEST'])` → GraphQL Enum
  - `z.nativeEnum(Priority)` → GraphQL Enum

### 2. Simple Tasks with Multiple Enums
- **Features**:
  - Task status enum (`TODO`, `IN_PROGRESS`, `DONE`)
  - Priority enum (`HIGH`, `MEDIUM`, `LOW`)
  - Size union converted to enum (`small`, `medium`, `large`)

## 🧪 Test Queries

### Basic Queries
```graphql
# Get all users with enum fields
query {
  simpleUsers {
    id
    name
    role        # ADMIN | USER | GUEST
    priority    # HIGH | MEDIUM | LOW
  }
}

# Get all tasks with multiple enum types
query {
  simpleTasks {
    id
    title
    status      # TODO | IN_PROGRESS | DONE
    priority    # HIGH | MEDIUM | LOW
    size        # small | medium | large
  }
}
```

### Filtering by Enums
```graphql
# Filter users by role
query {
  usersByRole(role: "ADMIN") {
    id
    name
    role
  }
}

# Filter tasks by status
query {
  tasksByStatus(status: "TODO") {
    id
    title
    status
  }
}

# Filter tasks by priority
query {
  tasksByPriority(priority: "HIGH") {
    id
    title
    priority
  }
}
```

### Mutations with Enum Validation
```graphql
# Create user with enum validation
mutation {
  createSimpleUser(input: {
    name: "New Admin"
    role: ADMIN     # GraphQL enum value
    priority: HIGH  # GraphQL enum value
  }) {
    id
    name
    role
    priority
  }
}

# Create task with multiple enum validations
mutation {
  createSimpleTask(input: {
    title: "New Feature"
    status: TODO      # GraphQL enum value
    priority: HIGH    # GraphQL enum value
    size: large       # GraphQL enum value
  }) {
    id
    title
    status
    priority
    size
  }
}

# Update task status with enum validation
mutation {
  updateTaskStatus(id: "task-1", status: "DONE") {
    id
    title
    status
  }
}
```

## 🎯 Key Benefits Demonstrated

1. **Automatic GraphQL Schema Generation:**
   ```graphql
   enum UserRole { ADMIN, USER, GUEST }
   enum Priority { HIGH, MEDIUM, LOW }
   enum TaskStatus { TODO, IN_PROGRESS, DONE }
   enum Size { small, medium, large }
   ```

2. **Runtime Validation:**
   - Invalid enum values are rejected automatically
   - Type-safe input validation
   - Clear error messages

3. **TypeScript Integration:**
   - Full type safety in resolvers
   - IntelliSense support for enum values
   - Compile-time enum validation

4. **Multiple Enum Types Support:**
   - `z.enum()` - Zod native enums
   - `z.nativeEnum()` - TypeScript enums
   - `z.union([z.literal(), ...])` - Union of literals

## 🔍 Behind the Scenes

### What happens when you use `@ZodObjectType()`:

1. **Schema Analysis**: The decorator inspects your Zod schema
2. **Enum Detection**: Finds `ZodEnum`, `ZodNativeEnum`, and `ZodUnion` types
3. **GraphQL Registration**: Automatically registers GraphQL enum types
4. **Field Mapping**: Maps schema fields to proper GraphQL types
5. **Caching**: Reuses enum types to prevent duplicates

### Generated GraphQL Schema:
```graphql
enum UserRole {
  ADMIN
  USER
  GUEST
}

type SimpleUser {
  id: Int!
  name: String!
  role: UserRole!      # Real enum, not String!
  priority: Priority!  # Real enum, not String!
}

input CreateUserInput {
  name: String!
  role: UserRole!      # Validated enum input!
  priority: Priority!  # Validated enum input!
}
```

## 💡 Tips

1. **Use descriptive enum values** for better GraphQL documentation
2. **Leverage TypeScript enums** for shared constants across frontend/backend
3. **Test enum validation** with invalid values to see error handling
4. **Check the browser console** for validation logs during development

Enjoy the enhanced type safety and developer experience! 🎉