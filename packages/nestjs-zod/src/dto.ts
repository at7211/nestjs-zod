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

// Registry for DTO class mappings
const pendingDtoRegistrations = new Map<any, ZodSchema<any>>()

// Use process.nextTick to delay field resolution
let fieldResolutionScheduled = false

function scheduleFieldResolution() {
  if (fieldResolutionScheduled) return
  fieldResolutionScheduled = true

  // Delay until all decorators have run
  process.nextTick(() => {
    // Now all DTOs are registered, resolve field mappings
    for (const [dtoClass, schema] of pendingDtoRegistrations.entries()) {
      schemaToClassMap.set(schema, dtoClass)
      classToSchemaMap.set(dtoClass, schema)
    }

    pendingDtoRegistrations.clear()
    fieldResolutionScheduled = false
  })
}


// NestJS-style decorator options interfaces
export interface ZodObjectTypeOptions {
  description?: string
  isAbstract?: boolean
}

export interface ZodInputTypeOptions {
  description?: string
}

// Common GraphQL decorator logic
function applyGraphQLDecorator(
  constructor: any,
  schema: any,
  className: string,
  isInput: boolean,
  options: { description?: string; isAbstract?: boolean }
) {
  try {
    // Import NestJS GraphQL decorators
    const graphqlModule = require('@nestjs/graphql')
    const { ObjectType, InputType, Field } = graphqlModule
    const GraphQLDecorator = isInput ? InputType : ObjectType

    // Apply the type decorator
    const decoratorOptions: any = {
      description: options?.description
    }
    if (!isInput && options.isAbstract) {
      decoratorOptions.isAbstract = options.isAbstract
    }
    GraphQLDecorator(className, decoratorOptions)(constructor)

    // Apply @Field decorators to properties based on Zod schema
    if (schema && (schema as any)._def.typeName === 'ZodObject') {
      const shape = (schema as any)._def.shape()

      for (const [fieldName, fieldSchema] of Object.entries<any>(shape)) {
        const fieldType = getGraphQLFieldType(fieldSchema, isInput)
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
          const typeResolver = (typeof fieldType === 'function' || fieldType.prototype) ?
            () => fieldType :
            () => fieldType
          Field(typeResolver, fieldOptions)(constructor.prototype, fieldName)

          // Ensure property exists on prototype
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
      // Schema not found - this is acceptable for some use cases
    }
  } catch (error) {
    // GraphQL decorators not available, falling back to createZodDto
  }
}

// @ZodObjectType decorator following NestJS GraphQL @ObjectType pattern
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
      // Schema provided as first parameter
      schema = schemaOrName
      className = (typeof nameOrOptions === 'string' ? nameOrOptions : constructor.name)
      finalOptions = (typeof nameOrOptions === 'string' ? options : nameOrOptions as ZodObjectTypeOptions)
    } else {
      // No schema, try to extract from createZodDto inheritance
      className = (typeof schemaOrName === 'string' ? schemaOrName : constructor.name)
      if (typeof schemaOrName === 'string') {
        finalOptions = nameOrOptions as ZodObjectTypeOptions | undefined
      } else {
        finalOptions = schemaOrName as ZodObjectTypeOptions | undefined
      }

      // Extract schema from createZodDto inheritance
      schema = (constructor as any).schema ||
               (constructor as any).__zodSchema ||
               (constructor.prototype && constructor.prototype.constructor && constructor.prototype.constructor.schema) ||
               (Object.getPrototypeOf(constructor) && (Object.getPrototypeOf(constructor) as any).schema)
    }

    // Apply GraphQL decorators
    applyGraphQLDecorator(constructor, schema, className, false, finalOptions || {})

    // Handle ZodDto functionality and schema registration
    if (schema) {
      pendingDtoRegistrations.set(constructor, schema)
      scheduleFieldResolution()
      schemaToClassMap.set(schema, constructor)
      classToSchemaMap.set(constructor, schema)
    }

    return constructor as any
  }
}

// @ZodInputType decorator following NestJS GraphQL @InputType pattern
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
      // Schema provided as first parameter
      schema = schemaOrName
      className = (typeof nameOrOptions === 'string' ? nameOrOptions : constructor.name)
      finalOptions = (typeof nameOrOptions === 'string' ? options : nameOrOptions as ZodInputTypeOptions)
    } else {
      // No schema, try to extract from createZodDto inheritance
      className = (typeof schemaOrName === 'string' ? schemaOrName : constructor.name)
      if (typeof schemaOrName === 'string') {
        finalOptions = nameOrOptions as ZodInputTypeOptions | undefined
      } else {
        finalOptions = schemaOrName as ZodInputTypeOptions | undefined
      }

      // Extract schema from createZodDto inheritance
      schema = (constructor as any).schema ||
               (constructor as any).__zodSchema ||
               (constructor.prototype && constructor.prototype.constructor && constructor.prototype.constructor.schema) ||
               (Object.getPrototypeOf(constructor) && (Object.getPrototypeOf(constructor) as any).schema)
    }

    // Apply GraphQL decorators
    applyGraphQLDecorator(constructor, schema, className, true, finalOptions || {})

    // Handle ZodDto functionality and schema registration
    if (schema) {
      pendingDtoRegistrations.set(constructor, schema)
      scheduleFieldResolution()
      schemaToClassMap.set(schema, constructor)
      classToSchemaMap.set(constructor, schema)
    }

    return constructor as any
  }
}



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
      // GraphQL integration failed
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
        const fieldType = getGraphQLFieldType(fieldSchema, isInputType)
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


  // Store schema for backward compatibility
  ;(BaseZodDto as any).__zodSchema = schema

  return BaseZodDto as unknown as ZodDto<TOutput, TDef, TInput>
}

function getReflectType(graphqlType: any): any {
  if (graphqlType === String) return String
  if (graphqlType === Number) return Number
  if (graphqlType === Boolean) return Boolean
  if (graphqlType === Date) return Date
  if (Array.isArray(graphqlType)) return Array
  return Object
}

function isFieldNullable(fieldSchema: any): boolean {
  const typeName = fieldSchema._def.typeName
  return typeName === 'ZodOptional' ||
         typeName === 'ZodNullable' ||
         typeName === 'ZodDefault'
}

function getGraphQLFieldType(fieldSchema: any, isInputContext = false): any {
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
      const itemType = getGraphQLFieldType(fieldSchema._def.type, isInputContext)
      return itemType ? [itemType] : [String]
    case 'ZodObject':
      // Handle nested objects
      return getOrCreateDtoClass(fieldSchema, isInputContext)
    case 'ZodOptional':
    case 'ZodNullable':
    case 'ZodDefault':
      return getGraphQLFieldType(fieldSchema._def.innerType || fieldSchema._def.type, isInputContext)
    case 'ZodEnum':
      return String // Enums as strings by default
    default:
      return String // Default fallback
  }
}


function getOrCreateDtoClass(schema: ZodSchema<any>, isInputContext = false): any {
  // 1. Direct lookup first
  let dtoClass = schemaToClassMap.get(schema)
  if (dtoClass) {
    return dtoClass
  }

  // 2. Search in pending registrations
  for (const [pendingClass, pendingSchema] of pendingDtoRegistrations.entries()) {
    if (pendingSchema === schema) {
      // Found exact match - register it now
      schemaToClassMap.set(schema, pendingClass)
      classToSchemaMap.set(pendingClass, schema)
      return pendingClass
    }
  }

  // 3. Content-based matching for schemas with .describe() wrappers
  for (const [pendingClass, pendingSchema] of pendingDtoRegistrations.entries()) {
    if (schemasAreEquivalent(schema, pendingSchema)) {
      schemaToClassMap.set(schema, pendingClass)
      return pendingClass
    }
  }

  // 4. Auto-generate DTO class as last resort
  const autoDto = createZodDto(schema, {
    name: `AutoGenerated_${Date.now()}`,
    graphql: {
      autoFields: true,
      isInput: isInputContext
    }
  })

  return autoDto
}

function schemasAreEquivalent(schema1: any, schema2: any): boolean {
  // Handle describe() wrappers
  const unwrap = (s: any) => s._def.innerType || s
  const s1 = unwrap(schema1)
  const s2 = unwrap(schema2)

  return s1 === s2
}

export function preRegisterAllDtos() {
  if (pendingDtoRegistrations.size === 0) {
    return
  }

  // Simple batch registration
  for (const [dtoClass, schema] of pendingDtoRegistrations.entries()) {
    if (!schemaToClassMap.has(schema)) {
      schemaToClassMap.set(schema, dtoClass)
      classToSchemaMap.set(dtoClass, schema)
    }
  }

  pendingDtoRegistrations.clear()
}

export function triggerDelayedResolution() {
  scheduleFieldResolution()
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

// Export internal functions for testing
export { getGraphQLFieldType, isFieldNullable, getOrCreateDtoClass }
