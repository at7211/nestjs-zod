import { z } from 'zod';
import { ZodObjectType, ZodInputType, createZodDto } from '@at7211/nestjs-zod';

// ============================================
// Simple Enhanced GraphQL Enum Examples
// ============================================

// 1. Basic Zod Enum Support
export const UserRoleSchema = z.enum(['ADMIN', 'USER', 'GUEST']);
export const TaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);

// 2. Native TypeScript Enum Support
export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum Color {
  RED = '#ff0000',
  GREEN = '#00ff00',
  BLUE = '#0000ff',
}

// 3. Union of Literals (converted to enum automatically)
export const SizeUnion = z.union([
  z.literal('small'),
  z.literal('medium'),
  z.literal('large'),
]);

// ============================================
// Simple Schema Examples
// ============================================

export const SimpleUserSchema = z.object({
  id: z.number().describe('User ID'),
  name: z.string().describe('User name'),
  role: UserRoleSchema.describe('User role in system'),
  priority: z.nativeEnum(Priority).describe('User priority level'),
});

export const SimpleTaskSchema = z.object({
  id: z.string().describe('Task ID'),
  title: z.string().describe('Task title'),
  status: TaskStatusSchema.describe('Current task status'),
  priority: z.nativeEnum(Priority).describe('Task priority'),
  size: SizeUnion.describe('Task size estimate'),
});

// Input schemas for mutations
export const CreateUserSchema = SimpleUserSchema.omit({ id: true });
export const CreateTaskSchema = SimpleTaskSchema.omit({ id: true });

// ============================================
// GraphQL DTOs with Enhanced Enum Support
// ============================================

@ZodObjectType(SimpleUserSchema)
export class SimpleUserDto extends createZodDto(SimpleUserSchema) {}

@ZodObjectType(SimpleTaskSchema)
export class SimpleTaskDto extends createZodDto(SimpleTaskSchema) {}

@ZodInputType(CreateUserSchema)
export class CreateUserInput extends createZodDto(CreateUserSchema) {}

@ZodInputType(CreateTaskSchema)
export class CreateTaskInput extends createZodDto(CreateTaskSchema) {}

// ============================================
// Type Exports
// ============================================

export type SimpleUser = z.infer<typeof SimpleUserSchema>;
export type SimpleTask = z.infer<typeof SimpleTaskSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;

// ============================================
// Mock Data for Testing
// ============================================

export const mockUsers: SimpleUser[] = [
  {
    id: 1,
    name: 'Admin User',
    role: 'ADMIN',
    priority: Priority.HIGH,
  },
  {
    id: 2,
    name: 'Regular User',
    role: 'USER',
    priority: Priority.MEDIUM,
  },
  {
    id: 3,
    name: 'Guest User',
    role: 'GUEST',
    priority: Priority.LOW,
  },
];

export const mockTasks: SimpleTask[] = [
  {
    id: 'task-1',
    title: 'Implement GraphQL Enums',
    status: 'DONE',
    priority: Priority.HIGH,
    size: 'large',
  },
  {
    id: 'task-2',
    title: 'Write Documentation',
    status: 'IN_PROGRESS',
    priority: Priority.MEDIUM,
    size: 'medium',
  },
  {
    id: 'task-3',
    title: 'Code Review',
    status: 'TODO',
    priority: Priority.LOW,
    size: 'small',
  },
];

/* 
============================================
Generated GraphQL Schema:
============================================

enum UserRole {
  ADMIN
  USER
  GUEST
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum Size {
  small
  medium
  large
}

type SimpleUser {
  id: Int!
  name: String!
  role: UserRole!      # Real GraphQL enum!
  priority: Priority!  # Real GraphQL enum!
}

type SimpleTask {
  id: String!
  title: String!
  status: TaskStatus!  # Real GraphQL enum!
  priority: Priority!  # Real GraphQL enum!
  size: Size!          # Real GraphQL enum!
}

input CreateUserInput {
  name: String!
  role: UserRole!      # Validated enum input!
  priority: Priority!  # Validated enum input!
}

input CreateTaskInput {
  title: String!
  status: TaskStatus!  # Validated enum input!
  priority: Priority!  # Validated enum input!
  size: Size!          # Validated enum input!
}
*/