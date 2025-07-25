import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import {
  SimpleUserDto,
  SimpleTaskDto,
  CreateUserInput,
  CreateTaskInput,
  mockUsers,
  mockTasks,
  SimpleUser,
  SimpleTask,
  Priority,
} from './simple-enum.dto';

// Mutable data stores for demo
const users: SimpleUser[] = [...mockUsers];
const tasks: SimpleTask[] = [...mockTasks];

@Resolver(() => SimpleUserDto)
export class SimpleEnumUsersResolver {
  @Query(() => [SimpleUserDto], {
    name: 'simpleUsers',
    description: 'Get users with enhanced enum support',
  })
  async getUsers(): Promise<SimpleUserDto[]> {
    console.log('🎯 GraphQL Query: Getting users with enhanced enums');
    
    return users.map(user => {
      const validated = SimpleUserDto.parse(user);
      console.log(`✅ User ${user.name} - Role: ${user.role}, Priority: ${user.priority}`);
      return validated;
    });
  }

  @Query(() => SimpleUserDto, {
    name: 'simpleUser', 
    description: 'Get user by ID with enum validation',
    nullable: true,
  })
  async getUser(@Args('id', { type: () => Int }) id: number): Promise<SimpleUserDto | null> {
    console.log(`🎯 GraphQL Query: Getting user ${id}`);
    
    const user = users.find(u => u.id === id);
    if (!user) return null;
    
    return SimpleUserDto.parse(user);
  }

  @Query(() => [SimpleUserDto], {
    name: 'usersByRole',
    description: 'Filter users by role enum',
  })
  async getUsersByRole(@Args('role') role: string): Promise<SimpleUserDto[]> {
    console.log(`🎯 GraphQL Query: Getting users with role: ${role}`);
    
    const filtered = users.filter(user => user.role === role);
    return filtered.map(user => SimpleUserDto.parse(user));
  }

  @Mutation(() => SimpleUserDto, {
    name: 'createSimpleUser',
    description: 'Create user with enum validation',
  })
  async createUser(@Args('input') input: CreateUserInput): Promise<SimpleUserDto> {
    console.log('🎯 GraphQL Mutation: Creating user with enum validation');
    console.log('📝 Input:', { role: input.role, priority: input.priority });
    
    // Input is automatically validated by Zod with enum constraints
    const validated = CreateUserInput.parse(input);
    
    const newUser: SimpleUser = {
      id: Math.max(...users.map(u => u.id), 0) + 1,
      ...validated,
    };
    
    users.push(newUser);
    console.log('✅ User created with validated enums');
    return SimpleUserDto.parse(newUser);
  }
}

@Resolver(() => SimpleTaskDto)
export class SimpleEnumTasksResolver {
  @Query(() => [SimpleTaskDto], {
    name: 'simpleTasks',
    description: 'Get tasks with enhanced enum support',
  })
  async getTasks(): Promise<SimpleTaskDto[]> {
    console.log('🎯 GraphQL Query: Getting tasks with enhanced enums');
    
    return tasks.map(task => {
      const validated = SimpleTaskDto.parse(task);
      console.log(`✅ Task ${task.title} - Status: ${task.status}, Priority: ${task.priority}, Size: ${task.size}`);
      return validated;
    });
  }

  @Query(() => [SimpleTaskDto], {
    name: 'tasksByStatus',
    description: 'Filter tasks by status enum',
  })
  async getTasksByStatus(@Args('status') status: string): Promise<SimpleTaskDto[]> {
    console.log(`🎯 GraphQL Query: Getting tasks with status: ${status}`);
    
    const filtered = tasks.filter(task => task.status === status);
    return filtered.map(task => SimpleTaskDto.parse(task));
  }

  @Query(() => [SimpleTaskDto], {
    name: 'tasksByPriority',
    description: 'Filter tasks by priority enum',
  })
  async getTasksByPriority(@Args('priority') priority: string): Promise<SimpleTaskDto[]> {
    console.log(`🎯 GraphQL Query: Getting tasks with priority: ${priority}`);
    
    const filtered = tasks.filter(task => task.priority === priority);
    return filtered.map(task => SimpleTaskDto.parse(task));
  }

  @Mutation(() => SimpleTaskDto, {
    name: 'createSimpleTask',
    description: 'Create task with comprehensive enum validation',
  })
  async createTask(@Args('input') input: CreateTaskInput): Promise<SimpleTaskDto> {
    console.log('🎯 GraphQL Mutation: Creating task with enum validation');
    console.log('📝 Input:', {
      status: input.status,
      priority: input.priority,
      size: input.size,
    });
    
    const validated = CreateTaskInput.parse(input);
    
    const newTask: SimpleTask = {
      id: `task-${Date.now()}`,
      ...validated,
    };
    
    tasks.push(newTask);
    console.log('✅ Task created with validated enums');
    return SimpleTaskDto.parse(newTask);
  }

  @Mutation(() => SimpleTaskDto, {
    name: 'updateTaskStatus',
    description: 'Update task status with enum validation',
    nullable: true,
  })
  async updateTaskStatus(
    @Args('id') id: string,
    @Args('status') status: string
  ): Promise<SimpleTaskDto | null> {
    console.log(`🎯 GraphQL Mutation: Updating task ${id} status to ${status}`);
    
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return null;
    
    // Update with enum validation
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      status: status as any, // GraphQL will validate the enum
    };
    
    console.log('✅ Task status updated with enum validation');
    return SimpleTaskDto.parse(tasks[taskIndex]);
  }
}

@Resolver()
export class SimpleEnumDemoResolver {
  @Query(() => String, {
    name: 'simpleEnumDemo',
    description: 'Demonstrate enhanced enum features',
  })
  async demonstrateEnums(): Promise<string> {
    console.log('🎯 GraphQL Query: Demonstrating enhanced enum features');
    
    const features = [
      '✅ Zod Enum: z.enum([\'ADMIN\', \'USER\', \'GUEST\']) → GraphQL Enum',
      '✅ Native Enum: enum Priority { HIGH, MEDIUM, LOW } → GraphQL Enum',
      '✅ Union Literals: z.union([z.literal(\'small\'), z.literal(\'large\')]) → GraphQL Enum',
      '✅ Automatic Validation: Enum values validated at runtime',
      '✅ Type Safety: Full TypeScript and GraphQL type safety',
      '✅ IntelliSense: IDE auto-completion for enum values',
      '',
      '🚀 Try these queries:',
      '• simpleUsers - See users with enum fields',
      '• usersByRole(role: "ADMIN") - Filter by enum value',
      '• createSimpleUser(input: {...}) - Create with enum validation',
      '• simpleTasks - See tasks with multiple enum types',
      '• tasksByStatus(status: "TODO") - Filter by enum status',
    ];
    
    return features.join('\n');
  }
}

/*
============================================
Example GraphQL Queries to Test:
============================================

# 1. Query users with enum fields
query {
  simpleUsers {
    id
    name
    role        # Shows: ADMIN | USER | GUEST
    priority    # Shows: HIGH | MEDIUM | LOW
  }
}

# 2. Filter by enum value
query {
  usersByRole(role: "ADMIN") {
    id
    name
    role
  }
}

# 3. Create user with enum validation
mutation {
  createSimpleUser(input: {
    name: "New User"
    role: ADMIN     # GraphQL enum value
    priority: HIGH  # GraphQL enum value
  }) {
    id
    name
    role
    priority
  }
}

# 4. Query tasks with multiple enum types
query {
  simpleTasks {
    id
    title
    status      # Shows: TODO | IN_PROGRESS | DONE
    priority    # Shows: HIGH | MEDIUM | LOW
    size        # Shows: small | medium | large
  }
}

# 5. Create task with comprehensive enum validation
mutation {
  createSimpleTask(input: {
    title: "New Task"
    status: TODO      # GraphQL enum value
    priority: HIGH    # GraphQL enum value  
    size: medium      # GraphQL enum value
  }) {
    id
    title
    status
    priority
    size
  }
}

All enum values provide:
- ✅ Runtime validation
- ✅ GraphQL schema integration
- ✅ TypeScript type safety
- ✅ IDE IntelliSense
*/