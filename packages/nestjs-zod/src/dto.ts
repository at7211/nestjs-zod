/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata'
import { ZodSchema, ZodTypeDef } from '@nest-zod/z'

export interface ZodDto<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
> {
  new (): TOutput
  isZodDto: true
  schema: ZodSchema<TOutput, TDef, TInput>
  options?: CreateZodDtoOptions
  create(input: unknown): TOutput
  safeParse(input: unknown): { success: true; data: TOutput } | { success: false; error: any }
  parse(input: unknown): TOutput
  validate(input: unknown): TOutput
  strip(input: unknown): TOutput
  partial(): ZodDto<Partial<TOutput>, any, Partial<TInput>>
  pick<K extends keyof TOutput>(keys: K[]): ZodDto<Pick<TOutput, K>, any, any>
  omit<K extends keyof TOutput>(keys: K[]): ZodDto<Omit<TOutput, K>, any, any>
  extend<T>(schema: ZodSchema<T>): ZodDto<TOutput & T, any, TInput & T>
  merge<T>(other: ZodDto<T>): ZodDto<TOutput & T, any, TInput & T>
  optional(): ZodDto<TOutput | undefined, any, TInput | undefined>
  nullable(): ZodDto<TOutput | null, any, TInput | null>
  array(): ZodDto<TOutput[], any, TInput[]>
  getFieldNames(): string[]
  getFieldSchema(fieldName: string): ZodSchema<any> | undefined
  getFieldType(fieldName: string): string | undefined
  isOptional(fieldName: string): boolean
  isNullable(fieldName: string): boolean
  getDefaultValue(fieldName: string): any
  getDescription(fieldName?: string): string | undefined
  validateField(fieldName: string, value: unknown): boolean
  getValidationErrors(input: unknown): string[]
  fromPlainObject(obj: any): TOutput
  toPlainObject(instance: TOutput): any
  clone(): ZodDto<TOutput, TDef, TInput>
  refine(refinement: (data: TOutput) => boolean, message?: string): ZodDto<TOutput, TDef, TInput>
  superRefine(refinement: (data: TOutput, ctx: any) => void): ZodDto<TOutput, TDef, TInput>
  transform<U>(transformer: (data: TOutput) => U): ZodDto<U, any, TInput>
  preprocess(preprocessor: (data: unknown) => unknown): ZodDto<TOutput, TDef, any>
  brand<B extends string | number | symbol>(brand?: B): ZodDto<TOutput, TDef, TInput>
}

export interface CreateZodDtoOptions {
  name?: string
  description?: string
  graphql?: {
    name?: string
    description?: string
    autoFields?: boolean
    isInput?: boolean
  }
  validation?: {
    transform?: boolean
    skipMissingProperties?: boolean
    whitelist?: boolean
    forbidNonWhitelisted?: boolean
  }
  serialization?: {
    excludeUndefined?: boolean
    transform?: boolean
  }
}

// Schema to class mapping using WeakMaps for better memory management
const schemaToClassMap = new WeakMap<ZodSchema<any>, any>()
const classToSchemaMap = new WeakMap<any, ZodSchema<any>>()

// Global registry for pre-registration of DTO classes
// This allows us to scan and register all DTOs before GraphQL schema building
const dtoClassRegistry = new Set<any>()
const pendingDtoRegistrations = new Map<any, ZodSchema<any>>()




// NestJS-style decorator options interfaces
export interface ZodObjectTypeOptions {
  description?: string
  isAbstract?: boolean
}

export interface ZodInputTypeOptions {
  description?: string
}

// @ZodObjectType decorator following NestJS GraphQL @ObjectType pattern
// Overload 1: With schema parameter
export function ZodObjectType<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(
  schema: ZodSchema<TOutput, TDef, TInput>, 
  name?: string, 
  options?: ZodObjectTypeOptions
): <T extends new (...args: any[]) => any>(constructor: T) => T

// Overload 2: Without schema parameter (for use with createZodDto inheritance)
export function ZodObjectType(
  name?: string,
  options?: ZodObjectTypeOptions
): <T extends new (...args: any[]) => any>(constructor: T) => T

// Overload 3: No parameters (for use with createZodDto inheritance)
export function ZodObjectType(): <T extends new (...args: any[]) => any>(constructor: T) => T

// Implementation
export function ZodObjectType<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(
  schemaOrName?: ZodSchema<TOutput, TDef, TInput> | string, 
  nameOrOptions?: string | ZodObjectTypeOptions, 
  options?: ZodObjectTypeOptions
) {
  return function<T extends new (...args: any[]) => any>(constructor: T): T {
    // Parse parameters based on overloads
    let schema: ZodSchema<TOutput, TDef, TInput> | undefined
    let className: string
    let finalOptions: ZodObjectTypeOptions | undefined
    
    if (schemaOrName && typeof schemaOrName === 'object' && '_def' in schemaOrName) {
      // Overload 1: schema provided
      schema = schemaOrName
      className = (typeof nameOrOptions === 'string' ? nameOrOptions : constructor.name)
      finalOptions = (typeof nameOrOptions === 'string' ? options : nameOrOptions as ZodObjectTypeOptions)
    } else {
      // Overload 2 & 3: no schema, try to extract from createZodDto inheritance
      className = (typeof schemaOrName === 'string' ? schemaOrName : constructor.name)
      if (typeof schemaOrName === 'string') {
        finalOptions = nameOrOptions as ZodObjectTypeOptions | undefined
      } else {
        finalOptions = schemaOrName as ZodObjectTypeOptions | undefined
      }
      
      // Try to extract schema from createZodDto inheritance
      // Check multiple possible locations for the schema
      schema = (constructor as any).schema || 
               (constructor as any).__zodSchema ||
               // Check prototype chain for schema
               (constructor.prototype && constructor.prototype.constructor && constructor.prototype.constructor.schema) ||
               // Check if class extends createZodDto by looking at prototype
               (Object.getPrototypeOf(constructor) && (Object.getPrototypeOf(constructor) as any).schema)
    }
    
    try {
      // Import NestJS GraphQL decorators
      const graphqlModule = require('@nestjs/graphql')
      const { ObjectType, Field } = graphqlModule
      
      // Apply the @ObjectType decorator first
      ObjectType(className, { 
        description: finalOptions?.description,
        isAbstract: finalOptions?.isAbstract 
      })(constructor)
      
      // Apply @Field decorators to properties based on Zod schema
      if (schema && (schema as any)._def.typeName === 'ZodObject') {
        const shape = (schema as any)._def.shape()
        
        for (const [fieldName, fieldSchema] of Object.entries<any>(shape)) {
          const fieldType = getGraphQLFieldType(fieldSchema)
          if (fieldType) {
            const isNullable = isFieldNullable(fieldSchema)
            const description = (fieldSchema as any)._def?.description
            
            const fieldOptions: any = { 
              nullable: isNullable
            }
            if (description) {
              fieldOptions.description = description
            }

            // Apply Field decorator
            // For object types (DTO classes), use the class directly
            // For primitive types, wrap in a function
            const typeResolver = (typeof fieldType === 'function' || fieldType.prototype) ? 
              () => fieldType : 
              () => fieldType
            Field(typeResolver, fieldOptions)(constructor.prototype, fieldName)
            
            // Ensure property exists on prototype (only if not already from createZodDto)
            if (!constructor.prototype.hasOwnProperty(fieldName)) {
              Object.defineProperty(constructor.prototype, fieldName, {
                enumerable: true,
                configurable: true,
                writable: true,
                value: undefined
              })
            }
            
            // Set design:type metadata for GraphQL
            Reflect.defineMetadata('design:type', getReflectType(fieldType), constructor.prototype, fieldName)
          }
        }
      } else if (!schema) {
        console.warn(`@ZodObjectType: No schema found for class ${className}. Make sure to either provide a schema parameter or extend createZodDto.`)
      }
    } catch (error) {
      console.warn('GraphQL decorators not available, falling back to createZodDto:', error)
    }
    
    // Handle ZodDto functionality and schema registration
    if (schema) {
      // Register in global DTO registry for pre-registration
      dtoClassRegistry.add(constructor)
      pendingDtoRegistrations.set(constructor, schema)
      
      // Always register schema mapping for GraphQL field resolution
      schemaToClassMap.set(schema, constructor)
      classToSchemaMap.set(constructor, schema)
      
      // Only create ZodDto functionality if not already applied
      if (!(constructor as any).isZodDto) {
        const zodDtoOptions: CreateZodDtoOptions = {
          name: className,
          description: finalOptions?.description,
          graphql: {
            name: className,
            description: finalOptions?.description,
            isInput: false,  // Always ObjectType
            autoFields: true
          }
        }
        
        // Create the ZodDto and copy its static methods
        const ZodDtoClass = createZodDto(schema, zodDtoOptions)
        
        // Copy ZodDto static methods to the decorated class
        Object.getOwnPropertyNames(ZodDtoClass).forEach(propName => {
          if (propName !== 'length' && propName !== 'name' && propName !== 'prototype') {
            const descriptor = Object.getOwnPropertyDescriptor(ZodDtoClass, propName)
            if (descriptor) {
              Object.defineProperty(constructor, propName, descriptor)
            }
          }
        })
      }
    }
    
    return constructor as any
  }
}

// @ZodInputType decorator following NestJS GraphQL @InputType pattern
// Overload 1: With schema parameter
export function ZodInputType<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(
  schema: ZodSchema<TOutput, TDef, TInput>, 
  name?: string, 
  options?: ZodInputTypeOptions
): <T extends new (...args: any[]) => any>(constructor: T) => T

// Overload 2: Without schema parameter (for use with createZodDto inheritance)
export function ZodInputType(
  name?: string,
  options?: ZodInputTypeOptions
): <T extends new (...args: any[]) => any>(constructor: T) => T

// Overload 3: No parameters (for use with createZodDto inheritance)
export function ZodInputType(): <T extends new (...args: any[]) => any>(constructor: T) => T

// Implementation
export function ZodInputType<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(
  schemaOrName?: ZodSchema<TOutput, TDef, TInput> | string, 
  nameOrOptions?: string | ZodInputTypeOptions, 
  options?: ZodInputTypeOptions
) {
  return function<T extends new (...args: any[]) => any>(constructor: T): T {
    // Parse parameters based on overloads
    let schema: ZodSchema<TOutput, TDef, TInput> | undefined
    let className: string
    let finalOptions: ZodInputTypeOptions | undefined
    
    if (schemaOrName && typeof schemaOrName === 'object' && '_def' in schemaOrName) {
      // Overload 1: schema provided
      schema = schemaOrName
      className = (typeof nameOrOptions === 'string' ? nameOrOptions : constructor.name)
      finalOptions = (typeof nameOrOptions === 'string' ? options : nameOrOptions as ZodInputTypeOptions)
    } else {
      // Overload 2 & 3: no schema, try to extract from createZodDto inheritance
      className = (typeof schemaOrName === 'string' ? schemaOrName : constructor.name)
      if (typeof schemaOrName === 'string') {
        finalOptions = nameOrOptions as ZodInputTypeOptions | undefined
      } else {
        finalOptions = schemaOrName as ZodInputTypeOptions | undefined
      }
      
      // Try to extract schema from createZodDto inheritance
      // Check multiple possible locations for the schema
      schema = (constructor as any).schema || 
               (constructor as any).__zodSchema ||
               // Check prototype chain for schema
               (constructor.prototype && constructor.prototype.constructor && constructor.prototype.constructor.schema) ||
               // Check if class extends createZodDto by looking at prototype
               (Object.getPrototypeOf(constructor) && (Object.getPrototypeOf(constructor) as any).schema)
    }
    
    try {
      // Import NestJS GraphQL decorators
      const graphqlModule = require('@nestjs/graphql')
      const { InputType, Field } = graphqlModule
      
      // Apply the @InputType decorator first
      InputType(className, { 
        description: finalOptions?.description
      })(constructor)
      
      // Apply @Field decorators to properties based on Zod schema
      if (schema && (schema as any)._def.typeName === 'ZodObject') {
        const shape = (schema as any)._def.shape()
        
        for (const [fieldName, fieldSchema] of Object.entries<any>(shape)) {
          const fieldType = getGraphQLFieldType(fieldSchema)
          if (fieldType) {
            const isNullable = isFieldNullable(fieldSchema)
            const description = (fieldSchema as any)._def?.description
            
            const fieldOptions: any = { 
              nullable: isNullable
            }
            if (description) {
              fieldOptions.description = description
            }

            // Apply Field decorator
            // For object types (DTO classes), use the class directly
            // For primitive types, wrap in a function
            const typeResolver = (typeof fieldType === 'function' || fieldType.prototype) ? 
              () => fieldType : 
              () => fieldType
            Field(typeResolver, fieldOptions)(constructor.prototype, fieldName)
            
            // Ensure property exists on prototype (only if not already from createZodDto)
            if (!constructor.prototype.hasOwnProperty(fieldName)) {
              Object.defineProperty(constructor.prototype, fieldName, {
                enumerable: true,
                configurable: true,
                writable: true,
                value: undefined
              })
            }
            
            // Set design:type metadata for GraphQL
            Reflect.defineMetadata('design:type', getReflectType(fieldType), constructor.prototype, fieldName)
          }
        }
      } else if (!schema) {
        console.warn(`@ZodInputType: No schema found for class ${className}. Make sure to either provide a schema parameter or extend createZodDto.`)
      }
    } catch (error) {
      console.warn('GraphQL decorators not available, falling back to createZodDto:', error)
    }
    
    // Handle ZodDto functionality and schema registration
    if (schema) {
      // Register in global DTO registry for pre-registration
      dtoClassRegistry.add(constructor)
      pendingDtoRegistrations.set(constructor, schema)
      
      // Always register schema mapping for GraphQL field resolution
      schemaToClassMap.set(schema, constructor)
      classToSchemaMap.set(constructor, schema)
      
      // Only create ZodDto functionality if not already applied
      if (!(constructor as any).isZodDto) {
        const zodDtoOptions: CreateZodDtoOptions = {
          name: className,
          description: finalOptions?.description,
          graphql: {
            name: className,
            description: finalOptions?.description,
            isInput: true,  // Always InputType
            autoFields: true
          }
        }
        
        // Create the ZodDto and copy its static methods
        const ZodDtoClass = createZodDto(schema, zodDtoOptions)
        
        // Copy ZodDto static methods to the decorated class
        Object.getOwnPropertyNames(ZodDtoClass).forEach(propName => {
          if (propName !== 'length' && propName !== 'name' && propName !== 'prototype') {
            const descriptor = Object.getOwnPropertyDescriptor(ZodDtoClass, propName)
            if (descriptor) {
              Object.defineProperty(constructor, propName, descriptor)
            }
          }
        })
      }
    }
    
    return constructor as any
  }
}

// Legacy: Class-based decorator for automatic ZodDto creation (deprecated in favor of @ZodObjectType/@ZodInputType)
export function AutoZod<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(schema: ZodSchema<TOutput, TDef, TInput>, options?: CreateZodDtoOptions) {
  return function<T extends new (...args: any[]) => any>(constructor: T): T {
    // Get the class name automatically from the constructor
    const className = constructor.name
    
    // Auto-detect if this should be an InputType based on class name
    const isInputType = options?.graphql?.isInput === true || 
      className.toLowerCase().includes('input') ||
      className.toLowerCase().includes('create') ||
      className.toLowerCase().includes('update')
    
    // Create enhanced options with auto-detected class name
    const finalOptions: CreateZodDtoOptions = {
      name: className,
      ...options,
      graphql: {
        name: className,
        isInput: isInputType,
        autoFields: true,
        ...options?.graphql
      }
    }
    
    // Create the ZodDto with auto-detected options
    const ZodDtoClass = createZodDto(schema, finalOptions)
    
    // Copy all static methods from ZodDto to the original class
    Object.setPrototypeOf(constructor, ZodDtoClass)
    Object.assign(constructor, ZodDtoClass)
    
    // Copy static properties
    Object.getOwnPropertyNames(ZodDtoClass).forEach(name => {
      if (name !== 'length' && name !== 'name' && name !== 'prototype') {
        Object.defineProperty(constructor, name, Object.getOwnPropertyDescriptor(ZodDtoClass, name) || {})
      }
    })
    
    return constructor as any
  }
}


// Enhanced createZodDto with auto-naming capability
export function createZodDto<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(schema: ZodSchema<TOutput, TDef, TInput>, options?: CreateZodDtoOptions): ZodDto<TOutput, TDef, TInput>

// Overload with explicit name for auto-naming
export function createZodDto<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(schema: ZodSchema<TOutput, TDef, TInput>, name: string, options?: Omit<CreateZodDtoOptions, 'name'>): ZodDto<TOutput, TDef, TInput>

export function createZodDto<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(
  schema: ZodSchema<TOutput, TDef, TInput>, 
  nameOrOptions?: string | CreateZodDtoOptions, 
  additionalOptions?: Omit<CreateZodDtoOptions, 'name'>
) {
  // Handle overloads: (schema, name, options) or (schema, options)
  let options: CreateZodDtoOptions | undefined
  let explicitName: string | undefined
  
  if (typeof nameOrOptions === 'string') {
    explicitName = nameOrOptions
    options = additionalOptions ? { name: explicitName, ...additionalOptions } : { name: explicitName }
  } else {
    options = nameOrOptions
  }

  // Create a unique class name with simple fallback
  const className = options?.name || 
                   explicitName || 
                   options?.graphql?.name || 
                   'ZodDto'
  
  // Check if GraphQL integration is requested and available
  let ObjectType: any = null
  let InputType: any = null
  let Field: any = null
  let hasGraphQL = false
  
  if (options?.graphql && typeof process !== 'undefined' && !process.env.DISABLE_GRAPHQL) {
    try {
      const graphqlModule = require('@nestjs/graphql')
      if (graphqlModule) {
        ObjectType = graphqlModule.ObjectType
        InputType = graphqlModule.InputType
        Field = graphqlModule.Field
        hasGraphQL = true
      }
    } catch (error) {
      console.warn('GraphQL integration failed:', error)
    }
  }

  // Determine GraphQL type if needed
  let isInputType = false
  if (hasGraphQL && options?.graphql) {
    // Check explicit isInput flag first, then fallback to name-based detection
    if (options.graphql.isInput === true) {
      isInputType = true
    } else if (options.graphql.name) {
      isInputType = (
        options.graphql.name.toLowerCase().includes('input') || 
        options.graphql.name.toLowerCase().includes('create') ||
        options.graphql.name.toLowerCase().includes('update')
      )
    }
  }

  // Create base class with static methods and proper name
  const DynamicZodDto = {
    [className]: class {
      public static isZodDto = true
      public static schema = schema
      public static options = options

      public static create(input: unknown) {
        return this.schema.parse(input)
      }

      public static safeParse(input: unknown) {
        return this.schema.safeParse(input)
      }

      public static parse(input: unknown) {
        return this.schema.parse(input)
      }

      public static validate(input: unknown) {
        return this.schema.parse(input)
      }

      public static strip(input: unknown) {
        const result = this.schema.safeParse(input)
        return result.success ? result.data : input
      }

      public static partial() {
        return createZodDto((this.schema as any).partial(), options)
      }

      public static pick<K extends keyof TOutput>(keys: K[]) {
        return createZodDto((this.schema as any).pick(keys), options)
      }

      public static omit<K extends keyof TOutput>(keys: K[]) {
        return createZodDto((this.schema as any).omit(keys), options)
      }

      public static extend<T>(schema: ZodSchema<T>) {
        return createZodDto((this.schema as any).extend(schema), options)
      }

      public static merge<T>(other: ZodDto<T>) {
        return createZodDto((this.schema as any).merge(other.schema), options)
      }

      public static optional() {
        return createZodDto((this.schema as any).optional(), options)
      }

      public static nullable() {
        return createZodDto((this.schema as any).nullable(), options)
      }

      public static array() {
        return createZodDto((this.schema as any).array(), options)
      }

      public static getFieldNames(): string[] {
        if ((this.schema as any)._def.typeName !== 'ZodObject') return []
        
        const shape = (this.schema as any)._def.shape()
        return Object.keys(shape)
      }

      public static getFieldSchema(fieldName: string): ZodSchema<any> | undefined {
        if ((this.schema as any)._def.typeName !== 'ZodObject') return undefined
        
        const shape = (this.schema as any)._def.shape()
        return shape[fieldName]
      }

      public static getFieldType(fieldName: string): string | undefined {
        const fieldSchema = this.getFieldSchema(fieldName)
        if (!fieldSchema) return undefined
        
        return (fieldSchema as any)._def.typeName
      }

      public static isOptional(fieldName: string): boolean {
        const fieldSchema = this.getFieldSchema(fieldName)
        if (!fieldSchema) return false
        
        return (fieldSchema as any)._def.typeName === 'ZodOptional' || 
               (fieldSchema as any).isOptional?.() === true
      }

      public static isNullable(fieldName: string): boolean {
        const fieldSchema = this.getFieldSchema(fieldName)
        if (!fieldSchema) return false
        
        return (fieldSchema as any)._def.typeName === 'ZodNullable' ||
               (fieldSchema as any).isNullable?.() === true
      }

      public static getDefaultValue(fieldName: string): any {
        const fieldSchema = this.getFieldSchema(fieldName)
        if (!fieldSchema) return undefined
        
        return (fieldSchema as any)._def.defaultValue?.()
      }

      public static getDescription(fieldName?: string): string | undefined {
        if (fieldName) {
          const fieldSchema = this.getFieldSchema(fieldName)
          return (fieldSchema as any)._def?.description
        }
        
        return (this.schema as any)._def?.description || options?.description
      }

      public static validateField(fieldName: string, value: unknown): boolean {
        const fieldSchema = this.getFieldSchema(fieldName)
        if (!fieldSchema) return false
        
        const result = fieldSchema.safeParse(value)
        return result.success
      }

      public static getValidationErrors(input: unknown): string[] {
        const result = this.schema.safeParse(input)
        if (result.success) return []
        
        return result.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        )
      }

      public static fromPlainObject(obj: any): TOutput {
        return this.schema.parse(obj)
      }

      public static toPlainObject(instance: TOutput): any {
        return instance
      }

      public static clone() {
        return createZodDto(this.schema, options) as any
      }

      public static refine(refinement: (data: TOutput) => boolean, message?: string) {
        return createZodDto((this.schema as any).refine(refinement, message), options)
      }

      public static superRefine(refinement: (data: TOutput, ctx: any) => void) {
        return createZodDto((this.schema as any).superRefine(refinement), options)
      }

      public static transform<U>(transformer: (data: TOutput) => U) {
        return createZodDto((this.schema as any).transform(transformer), options)
      }

      public static preprocess(preprocessor: (data: unknown) => unknown) {
        return createZodDto((this.schema as any).preprocess(preprocessor), options)
      }

      public static brand<B extends string | number | symbol>(brand?: B) {
        return createZodDto((this.schema as any).brand(brand), options)
      }
    }
  }[className]

  const BaseZodDto = DynamicZodDto

  // Apply GraphQL decorators at the class level before returning
  if (hasGraphQL && options?.graphql) {
    const GraphQLDecorator = isInputType ? InputType : ObjectType
    const graphqlName = options.graphql.name || className
    const decoratorOptions = { 
      description: options.graphql.description || options.description 
    }
    
    // Apply the type decorator
    GraphQLDecorator(graphqlName, decoratorOptions)(BaseZodDto)

    // Auto-apply field decorators if enabled (default true) and this is an object schema
    const shouldAutoFields = options.graphql.autoFields !== false
    if (shouldAutoFields && (schema as any)._def.typeName === 'ZodObject') {
      const shape = (schema as any)._def.shape()
      
      for (const [fieldName, fieldSchema] of Object.entries<any>(shape)) {
        const fieldType = getGraphQLFieldType(fieldSchema)
        if (fieldType) {
          const isNullable = isFieldNullable(fieldSchema)
          const description = (fieldSchema as any)._def?.description
          
          const fieldOptions: any = { 
            nullable: isNullable
          }
          if (description) {
            fieldOptions.description = description
          }

          // Apply Field decorator
          Field(() => fieldType, fieldOptions)(BaseZodDto.prototype, fieldName)
          
          // Ensure property exists on prototype for GraphQL reflection
          if (!BaseZodDto.prototype.hasOwnProperty(fieldName)) {
            Object.defineProperty(BaseZodDto.prototype, fieldName, {
              enumerable: true,
              configurable: true,
              writable: true,
              value: undefined
            })
          }
          
          // Set design:type metadata for GraphQL
          Reflect.defineMetadata('design:type', getReflectType(fieldType), BaseZodDto.prototype, fieldName)
        }
      }
    }
  }

  // Register schema to class mapping
  schemaToClassMap.set(schema, BaseZodDto)
  classToSchemaMap.set(BaseZodDto, schema)

  // Store schema for backward compatibility
  ;(BaseZodDto as any).__zodSchema = schema

  return BaseZodDto as unknown as ZodDto<TOutput, TDef, TInput>
}

// Helper function to get reflection type for primitive types
function getReflectType(graphqlType: any): any {
  if (graphqlType === String) return String
  if (graphqlType === Number) return Number
  if (graphqlType === Boolean) return Boolean
  if (graphqlType === Date) return Date
  if (Array.isArray(graphqlType)) return Array
  return Object
}

// Helper function to determine if field is nullable
function isFieldNullable(fieldSchema: any): boolean {
  const typeName = fieldSchema._def.typeName
  return typeName === 'ZodOptional' || 
         typeName === 'ZodNullable' ||
         typeName === 'ZodDefault'
}

// Helper function to determine GraphQL field type
function getGraphQLFieldType(fieldSchema: any): any {
  const typeName = fieldSchema._def.typeName
  
  switch (typeName) {
    case 'ZodString':
      return String
    case 'ZodNumber':
      return Number
    case 'ZodBoolean':
      return Boolean
    case 'ZodDate':
      return Date
    case 'ZodArray':
      const itemType = getGraphQLFieldType(fieldSchema._def.type)
      return itemType ? [itemType] : [String]
    case 'ZodObject':
      // Try to find the DTO class directly
      const dtoClass = schemaToClassMap.get(fieldSchema)
      if (dtoClass) {
        return dtoClass
      }
      
      // If no DTO class found, warn and return Object for now
      console.warn(`No DTO class found for nested ZodObject schema. Consider defining a @ZodObjectType decorated class for this schema.`)
      return Object
    case 'ZodOptional':
    case 'ZodNullable':
    case 'ZodDefault':
      return getGraphQLFieldType(fieldSchema._def.innerType || fieldSchema._def.type)
    case 'ZodEnum':
      return String // Enums as strings by default
    default:
      console.warn(`Unsupported Zod type: ${typeName}, falling back to String`)
      return String // Default to string
  }
}


// Helper function to check if a class is a ZodDto
export function isZodDto(metatype: any): metatype is ZodDto {
  return metatype?.isZodDto === true
}

// Helper function to get the schema from a ZodDto class
export function getSchemaFromDto(dto: any): ZodSchema<any> | undefined {
  if (isZodDto(dto)) {
    return dto.schema
  }
  return classToSchemaMap.get(dto)
}

// Helper function to get a DTO class from a schema
export function getDtoFromSchema(schema: ZodSchema<any>): any {
  return schemaToClassMap.get(schema)
}

// Helper function to register a custom mapping
export function registerDtoMapping(dtoClass: any, schema: ZodSchema<any>) {
  schemaToClassMap.set(schema, dtoClass)
  classToSchemaMap.set(dtoClass, schema)
}

// Pre-registration function to process all DTOs before GraphQL schema building
export function preRegisterAllDtos() {
  console.log(`Pre-registering ${pendingDtoRegistrations.size} DTO classes...`)
  
  for (const [dtoClass, schema] of pendingDtoRegistrations.entries()) {
    console.log(`Registering DTO class: ${dtoClass.name} with schema`)
    
    // Ensure the mapping is established
    if (!schemaToClassMap.has(schema)) {
      schemaToClassMap.set(schema, dtoClass)
    }
    if (!classToSchemaMap.has(dtoClass)) {
      classToSchemaMap.set(dtoClass, schema)
    }
    
    // Process nested schemas within this DTO's schema
    if (schema && (schema as any)._def.typeName === 'ZodObject') {
      const shape = (schema as any)._def.shape()
      
      for (const [fieldName, fieldSchema] of Object.entries<any>(shape)) {
        if (fieldSchema._def.typeName === 'ZodObject') {
          console.log(`Found nested ZodObject field: ${fieldName}`)
          
          // Check if there's already a DTO class for this nested schema
          if (!schemaToClassMap.has(fieldSchema)) {
            console.log(`No DTO class found for nested field ${fieldName}, searching...`)
            
            // Look for a matching DTO in the registry
            for (const [otherDtoClass, otherSchema] of pendingDtoRegistrations.entries()) {
              // Check for exact object identity first
              if (otherSchema === fieldSchema) {
                console.log(`Found exact matching DTO class: ${otherDtoClass.name} for nested field ${fieldName}`)
                schemaToClassMap.set(fieldSchema, otherDtoClass)
                break
              }
              
              // If not exact match, check for schema with .describe() wrapper
              // ZodObject with describe() wraps the original schema
              if (fieldSchema._def.typeName === 'ZodObject' && 
                  (fieldSchema._def as any).innerType && 
                  otherSchema === (fieldSchema._def as any).innerType) {
                console.log(`Found matching DTO class through innerType: ${otherDtoClass.name} for nested field ${fieldName}`)
                schemaToClassMap.set(fieldSchema, otherDtoClass)
                break
              }
              
              // Alternative approach: check if otherSchema is wrapped and matches fieldSchema
              if ((otherSchema._def as any).innerType === fieldSchema) {
                console.log(`Found matching DTO class through reverse innerType: ${otherDtoClass.name} for nested field ${fieldName}`)
                schemaToClassMap.set(fieldSchema, otherDtoClass)
                break
              }
            }
            
            if (!schemaToClassMap.has(fieldSchema)) {
              console.log(`Still no DTO class found for nested field ${fieldName}`)
            }
          } else {
            console.log(`DTO class already registered for nested field: ${fieldName}`)
          }
        }
      }
    }
  }
  
  // Clear pending registrations after processing
  pendingDtoRegistrations.clear()
  console.log('Pre-registration completed')
}
