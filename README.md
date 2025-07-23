// Note: This is a fork of the original nestjs-zod repository by BenLorantfy. The main addition is enhanced GraphQL support, addressing [Issue #155](https://github.com/BenLorantfy/nestjs-zod/issues/155).

<p align="center">
  <img src="logo.svg" width="560px" align="center" alt="NestJS + Zod logo" style="max-width: 100%;" />
  <h1></h1>
  <p align="center">
    ✨ A seamless validation solution for your NestJS application ✨
  </p>
</p>
<br/>
<p align="center">
  <a href="https://github.com/at7211/nestjs-zod/actions?query=branch%3Amain">
    <img src="https://github.com/at7211/nestjs-zod/actions/workflows/test-and-build.yml/badge.svg?event=push&branch=main" alt="nestjs-zod CI Status" />
  </a>
  <a href="https://opensource.org/licenses/MIT" rel="nofollow">
    <img src="https://img.shields.io/github/license/at7211/nestjs-zod" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@at7211/nestjs-zod" rel="nofollow">
    <img src="https://img.shields.io/npm/dw/@at7211/nestjs-zod.svg" alt="npm">
  </a>
  <a href="https://www.npmjs.com/package/@at7211/nestjs-zod" rel="nofollow">
    <img src="https://img.shields.io/github/stars/at7211/nestjs-zod" alt="stars">
  </a>
</p>

## Core library features

- `createZodDto` - create DTO classes from Zod schemas
- `ZodValidationPipe` - validate `body` / `query` / `params` using Zod DTOs
- `ZodGuard` - guard routes by validating `body` / `query` / `params`  
  (it can be useful when you want to do that before other guards)
- `UseZodGuard` - alias for `@UseGuards(new ZodGuard(source, schema))`
- `ZodValidationException` - BadRequestException extended with Zod errors
- `zodToOpenAPI` - create OpenAPI declarations from Zod schemas
- **GraphQL support** ✨
  - `@ZodObjectType` - create GraphQL ObjectTypes from Zod schemas (minimal approach)
  - `@ZodInputType` - create GraphQL InputTypes from Zod schemas (minimal approach)
  - Automatic field generation from Zod schema with descriptions
  - Drop-in replacement for `@ObjectType` and `@InputType` from `@nestjs/graphql`
- OpenAPI support
  - `@nestjs/swagger` integration using the patch
  - `zodToOpenAPI` - generate highly accurate Swagger Schema
  - Zod DTOs can be used in any `@nestjs/swagger` decorator
- Extended Zod schemas for NestJS (`@nest-zod/z`)
  - **Note:** _`@nest-zod/z` is deprecated and will not be supported soon.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information._
  - `dateString` for dates (supports casting to `Date`)
  - `password` for passwords (more complex string rules + OpenAPI conversion)
- Customization - change exception format easily
- Useful helpers for client side error handling (`@at7211/nestjs-zod/frontend`)

## Installation

```
npm install @at7211/nestjs-zod zod
```

Peer dependencies:

- `zod` - `>= 3.14.3`
- `@nestjs/common` - `>= 8.0.0` (required on server side)
- `@nestjs/core` - `>= 8.0.0` (required on server side)
- `@nestjs/swagger` - `>= 5.0.0` (only when using `patchNestJsSwagger`)
- `@nestjs/graphql` - `>= 9.0.0` (only when using GraphQL decorators)

All peer dependencies are marked as optional for better client side usage, but you need to install required ones when using `nestjs-zod` on server side.

## Navigation

- [Creating DTO from Zod schema](#creating-dto-from-zod-schema)
  - [Using DTO](#using-dto)
- [Using ZodValidationPipe](#using-zodvalidationpipe)
  - [Globally](#globally-recommended)
  - [Locally](#locally)
  - [Creating custom validation pipe](#creating-custom-validation-pipe)
- [Using ZodGuard](#using-zodguard)
  - [Creating custom guard](#creating-custom-guard)
- [Validation Exceptions](#validation-exceptions)
- [Using ZodSerializerInterceptor](#using-zodserializerinterceptor-for-output-validation)
- **[GraphQL support](#graphql-support)** ✨
  - [Setup](#graphql-setup)
  - [Creating GraphQL types with @ZodObjectType](#creating-graphql-types-with-zodobjecttype)
  - [Creating GraphQL inputs with @ZodInputType](#creating-graphql-inputs-with-zodinputtype)
  - [Using in resolvers](#using-in-resolvers)
  - [Migration from @ObjectType/@InputType](#migration-from-objecttypeinputtype)
- [Extended Zod](#extended-zod)
  - [ZodDateString](#zoddatestring)
  - [ZodPassword](#zodpassword)
  - [Json Schema](#json-schema)
  - ["from" function](#from-function)
  - [Extended Zod Errors](#extended-zod-errors)
  - [Working with errors on the client side](#working-with-errors-on-the-client-side)
- [OpenAPI (Swagger) support](#openapi-swagger-support)
  - [Setup](#setup)
  - [Writing more Swagger-compatible schemas](#writing-more-swagger-compatible-schemas)
  - [Using zodToOpenAPI](#using-zodtoopenapi)

## Creating DTO from Zod schema

```ts
import { createZodDto } from '@at7211/nestjs-zod'
import { z } from 'zod'

const CredentialsSchema = z.object({
  username: z.string(),
  password: z.string(),
})

// class is required for using DTO as a type
class CredentialsDto extends createZodDto(CredentialsSchema) {}
```

### Using DTO

DTO does two things:

- Provides a schema for `ZodValidationPipe`
- Provides a type from Zod schema for you

```ts
@Controller('auth')
class AuthController {
  // with global ZodValidationPipe (recommended)
  async signIn(@Body() credentials: CredentialsDto) {}
  async signIn(@Param() signInParams: SignInParamsDto) {}
  async signIn(@Query() signInQuery: SignInQueryDto) {}

  // with route-level ZodValidationPipe
  @UsePipes(ZodValidationPipe)
  async signIn(@Body() credentials: CredentialsDto) {}
}

// with controller-level ZodValidationPipe
@UsePipes(ZodValidationPipe)
@Controller('auth')
class AuthController {
  async signIn(@Body() credentials: CredentialsDto) {}
}
```

### Using standalone (without server-side dependencies)

```ts
import { createZodDto } from '@at7211/nestjs-zod/dto'
```

## Using ZodValidationPipe

The validation pipe uses your Zod schema to parse data from parameter decorator.

When the data is invalid - it throws [ZodValidationException](#validation-exceptions).

### Globally (recommended)

```ts
import { ZodValidationPipe } from '@at7211/nestjs-zod'
import { APP_PIPE } from '@nestjs/core'

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
```

### Locally

```ts
import { ZodValidationPipe } from '@at7211/nestjs-zod'

// controller-level
@UsePipes(ZodValidationPipe)
class AuthController {}

class AuthController {
  // route-level
  @UsePipes(ZodValidationPipe)
  async signIn() {}
}
```

Also, you can instantly pass a Schema or DTO:

```ts
import { ZodValidationPipe } from '@at7211/nestjs-zod'
import { UserDto, UserSchema } from './auth.contracts'

// using schema
@UsePipes(new ZodValidationPipe(UserSchema))
// using DTO
@UsePipes(new ZodValidationPipe(UserDto))
class AuthController {}

class AuthController {
  // the same applies to route-level
  async signIn() {}
}
```

### Creating custom validation pipe

```ts
import { createZodValidationPipe } from '@at7211/nestjs-zod'

const MyZodValidationPipe = createZodValidationPipe({
  // provide custom validation exception factory
  createValidationException: (error: ZodError) =>
    new BadRequestException('Ooops'),
})
```

## Using ZodGuard

Sometimes, we need to validate user input before specific Guards. We can't use Validation Pipe since NestJS Pipes are always executed after Guards.

The solution is `ZodGuard`. It works just like `ZodValidationPipe`, except for that is doesn't transform the input.

It has 2 syntax forms:

- `@UseGuards(new ZodGuard('body', CredentialsSchema))`
- `@UseZodGuard('body', CredentialsSchema)`

Parameters:

1. The source - `'body' | 'query' | 'params'`
2. Zod Schema or DTO (just like `ZodValidationPipe`)

When the data is invalid - it throws [ZodValidationException](#validation-exceptions).

```ts
import { ZodGuard } from '@at7211/nestjs-zod'

// controller-level
@UseZodGuard('body', CredentialsSchema)
@UseZodGuard('params', CredentialsDto)
class MyController {}

class MyController {
  // route-level
  @UseZodGuard('query', CredentialsSchema)
  @UseZodGuard('body', CredentialsDto)
  async signIn() {}
}
```

### Creating custom guard

```ts
import { createZodGuard } from '@at7211/nestjs-zod'

const MyZodGuard = createZodGuard({
  // provide custom validation exception factory
  createValidationException: (error: ZodError) =>
    new BadRequestException('Ooops'),
})
```

## Create validation from scratch

If you don't like `ZodGuard` and `ZodValidationPipe`, you can use `validate` function:

```ts
import { validate } from '@at7211/nestjs-zod'

validate(wrongThing, UserDto, (zodError) => new MyException(zodError)) // throws MyException

const validatedUser = validate(
  user,
  UserDto,
  (zodError) => new MyException(zodError)
) // returns typed value when succeed
```

## Validation Exceptions

The default server response on validation error looks like that:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "code": "too_small",
      "minimum": 8,
      "type": "string",
      "inclusive": true,
      "message": "String must contain at least 8 character(s)",
      "path": ["password"]
    }
  ]
}
```

The reason of this structure is default `ZodValidationException`.

You can customize the exception by creating custom `nestjs-zod` entities using the factories:

- [Validation Pipe](#creating-custom-validation-pipe)
- [Guard](#creating-custom-guard)

You can create `ZodValidationException` manually by providing `ZodError`:

```ts
const exception = new ZodValidationException(error)
```

Also, `ZodValidationException` has an additional API for better usage in NestJS Exception Filters:

```ts
@Catch(ZodValidationException)
export class ZodValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException) {
    exception.getZodError() // -> ZodError
  }
}
```

## Using ZodSerializerInterceptor for output validation

To ensure that a response conforms to a certain shape, you may use the `ZodSerializerInterceptor` interceptor.

This would be especially useful in prevent accidental data leaks.

This is similar to NestJs' `@ClassSerializerInterceptor` feature [here](https://docs.nestjs.com/techniques/serialization)

### Include `@ZodSerializerInterceptor` in application root

```ts
@Module({
  ...
  providers: [
    ...,
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
```

### Use `@ZodSerializerDto` to define the shape of the response for endpoint in controller

```ts
const UserSchema = z.object({ username: string() })

export class UserDto extends createZodDto(UserSchema) {}
```

```ts
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ZodSerializerDto(UserDto)
  getUser(id: number) {
    return this.userService.findOne(id) // --> The native service method returns { username: string, password: string by default }
  }
}
```

In the above example, despite the `userService.findOne` method returns `password`, the `password` property will be stripped out thanks to the `@ZodSerializerDto` decorator.

### Logging serialization errors using `ZodSerializationException` 

You can catch serialization errors using `ZodSerializationException` and log them using your preferred logger.

```ts
if (exception instanceof ZodSerializationException) {
    const zodError = exception.getZodError();
    this.logger.error(`ZodSerializationException: ${zodError.message}`);
}
```
See the example app [here](/packages/example/src/http-exception.filter.ts) for more information.

## GraphQL support

`@at7211/nestjs-zod` provides powerful GraphQL integration that automatically generates GraphQL types from your Zod schemas. Choose the approach that fits your needs.

### Setup

Prerequisites:
- `@nestjs/graphql` version `^9.0.0` or higher
- GraphQL driver (Apollo or Mercurius) configured

The library automatically detects your GraphQL setup - no additional configuration needed.

### Three Usage Patterns

#### Pattern 1: Simple Function Call (Recommended)

Perfect for quick prototyping and when you don't need custom methods:

```ts
import { createZodDto } from '@at7211/nestjs-zod'
import { z } from 'zod'

const UserSchema = z.object({
  id: z.number().describe('User ID'),
  name: z.string().describe('Full name'),
  email: z.string().email().describe('Email address'),
})

// Creates DTO with GraphQL support + validation methods
const UserDto = createZodDto(UserSchema, {
  graphql: { name: 'User' }
})

// Immediately usable
const user = UserDto.parse({ id: 1, name: 'John', email: 'john@example.com' })
```

#### Pattern 2: Class with Full Features (Most Flexible)

Best for production code when you need custom methods and maximum type safety:

```ts
import { ZodObjectType, createZodDto } from '@at7211/nestjs-zod'

@ZodObjectType()
export class UserDto extends createZodDto(UserSchema) {
  // ✅ Add custom methods
  getDisplayName(): string {
    return `${this.name} (${this.email})`
  }
  
  // ✅ Add static methods
  static async findByEmail(email: string) {
    // Custom logic here
  }
  
  // ✅ Full TypeScript intellisense
  // this.id, this.name, this.email all available
}

// Usage in resolvers
@Resolver(() => UserDto)
export class UsersResolver {
  @Query(() => UserDto)
  async getUser(@Args('id') id: number): Promise<UserDto> {
    const userData = await this.usersService.findOne(id)
    return UserDto.parse(userData) // Full validation + type safety
  }
}
```

#### Pattern 3: Decorator Only (GraphQL Only)

Use when you only need GraphQL types without validation methods:

```ts
@ZodObjectType(UserSchema, 'User')
export class UserDto {}

// ⚠️ Note: This gives you GraphQL types but no validation methods
```

### Input Types for Mutations

Create GraphQL InputTypes for mutations and form inputs:

```ts
const CreateUserSchema = z.object({
  name: z.string().min(2).describe('Full name'),
  email: z.string().email().describe('Email address'),
})

// Pattern 1: Simple
const CreateUserInput = createZodDto(CreateUserSchema, {
  graphql: { name: 'CreateUserInput', isInput: true }
})

// Pattern 2: Class with validation methods
@ZodInputType()
export class CreateUserInput extends createZodDto(CreateUserSchema) {}

// Usage in resolver
@Mutation(() => UserDto)
async createUser(
  @Args('input') input: CreateUserInput
): Promise<UserDto> {
  // Input is automatically validated
  const userData = CreateUserInput.parse(input)
  return this.usersService.create(userData)
}
```

### Nested Objects & Arrays

The library automatically handles complex nested structures:

```ts
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string(),
})

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  addresses: z.array(AddressSchema),      // Array of objects
  metadata: z.record(z.string()),        // Key-value pairs
  createdAt: z.date(),                   // Date fields
})

// Everything auto-generates correctly in GraphQL
@ZodObjectType()
export class UserDto extends createZodDto(UserSchema) {}
```

### Practical Examples

#### Complete CRUD Setup

```ts
// schemas/user.schema.ts
export const UserSchema = z.object({
  id: z.number().describe('Unique identifier'),
  name: z.string().min(2).max(50).describe('Full name'),
  email: z.string().email().describe('Email address'),
  createdAt: z.date(),
})

export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true })
export const UpdateUserSchema = CreateUserSchema.partial()

// dto/user.dto.ts
@ZodObjectType()
export class UserDto extends createZodDto(UserSchema) {}

@ZodInputType()
export class CreateUserInput extends createZodDto(CreateUserSchema) {}

@ZodInputType()
export class UpdateUserInput extends createZodDto(UpdateUserSchema) {}

// resolvers/users.resolver.ts
@Resolver(() => UserDto)
export class UsersResolver {
  @Query(() => [UserDto])
  async users(): Promise<UserDto[]> {
    const users = await this.usersService.findAll()
    return users.map(user => UserDto.parse(user))
  }

  @Mutation(() => UserDto)
  async createUser(@Args('input') input: CreateUserInput): Promise<UserDto> {
    const validInput = CreateUserInput.parse(input)
    const user = await this.usersService.create(validInput)
    return UserDto.parse(user)
  }

  @Mutation(() => UserDto)
  async updateUser(
    @Args('id') id: number,
    @Args('input') input: UpdateUserInput
  ): Promise<UserDto> {
    const validInput = UpdateUserInput.parse(input)
    const user = await this.usersService.update(id, validInput)
    return UserDto.parse(user)
  }
}
```

### Best Practices

#### 1. Use Pattern 1 for Simple Cases
```ts
// ✅ Good for simple DTOs
const UserDto = createZodDto(UserSchema, { graphql: { name: 'User' } })
```

#### 2. Use Pattern 2 for Production Code
```ts
// ✅ Best for real applications
@ZodObjectType()
export class UserDto extends createZodDto(UserSchema) {
  // Add custom business logic here
}
```

#### 3. Organize Your Schemas
```ts
// ✅ Keep schemas separate from DTOs
// schemas/user.schema.ts
export const UserSchema = z.object({ ... })

// dto/user.dto.ts  
@ZodObjectType()
export class UserDto extends createZodDto(UserSchema) {}
```

#### 4. Use Descriptions for Better GraphQL Docs
```ts
const UserSchema = z.object({
  id: z.number().describe('Unique user identifier'),
  name: z.string().describe('User full name'),
  email: z.string().email().describe('User email address'),
})
```

### Migration from Traditional GraphQL

**Before (Traditional NestJS GraphQL):**
```ts
@ObjectType('User')
export class UserDto {
  @Field(() => ID)
  id: number

  @Field({ description: 'User full name' })
  name: string

  @Field({ description: 'User email address' })
  email: string
}

@InputType('CreateUserInput')
export class CreateUserInput {
  @Field({ description: 'User full name' })
  name: string

  @Field({ description: 'User email address' })
  email: string
}
```

**After (With nestjs-zod):**
```ts
const UserSchema = z.object({
  id: z.number().describe('Unique user identifier'),
  name: z.string().describe('User full name'),
  email: z.string().email().describe('User email address'),
})

const CreateUserSchema = UserSchema.omit({ id: true })

@ZodObjectType()
export class UserDto extends createZodDto(UserSchema) {}

@ZodInputType()
export class CreateUserInput extends createZodDto(CreateUserSchema) {}
```

**Benefits:**
- 75% less boilerplate code
- Single source of truth for validation and GraphQL
- Automatic validation in resolvers
- Better type safety
- Consistent field descriptions

## Extended Zod

> [!CAUTION]
> `@nest-zod/z` is deprecated and will not be supported soon.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

`@nest-zod/z` provides a special version of Zod. It helps you to validate the user input more accurately by using our custom schemas and methods.

### ZodDateString

> [!CAUTION]
> `@nest-zod/z` is deprecated and will not be supported soon.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

In HTTP, we always accept Dates as strings. But default Zod only has validations for full date-time strings. `ZodDateString` was created to address this issue.

```ts
// 1. Expect user input to be a "string" type
// 2. Expect user input to be a valid date (by using new Date)
z.dateString()

// Cast to Date instance
// (use it on end of the chain, but before "describe")
z.dateString().cast()

// Expect string in "full-date" format from RFC3339
z.dateString().format('date')

// [default format]
// Expect string in "date-time" format from RFC3339
z.dateString().format('date-time')

// Expect date to be the past
z.dateString().past()

// Expect date to be the future
z.dateString().future()

// Expect year to be greater or equal to 2000
z.dateString().minYear(2000)

// Expect year to be less or equal to 2025
z.dateString().maxYear(2025)

// Expect day to be a week day
z.dateString().weekDay()

// Expect year to be a weekend
z.dateString().weekend()
```

Valid `date` format examples:

- `2022-05-15`

Valid `date-time` format examples:

- `2022-05-02:08:33Z`
- `2022-05-02:08:33.000Z`
- `2022-05-02:08:33+00:00`
- `2022-05-02:08:33-00:00`
- `2022-05-02:08:33.000+00:00`

Errors:

- `invalid_date_string` - invalid date

- `invalid_date_string_format` - wrong format

  Payload:

  - `expected` - `'date' | 'date-time'`

- `invalid_date_string_direction` - not past/future

  Payload:

  - `expected` - `'past' | 'future'`

- `invalid_date_string_day` - not weekDay/weekend

  Payload:

  - `expected` - `'weekDay' | 'weekend'`

- `too_small` with `type === 'date_string_year'`
- `too_big` with `type === 'date_string_year'`

### ZodPassword

> [!CAUTION]
> `@nest-zod/z` is deprecated and will not be supported soon.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

`ZodPassword` is a string-like type, just like the `ZodDateString`. As you might have guessed, it's intended to help you with password schemas definition.

Also, `ZodPassword` has a more accurate OpenAPI conversion, comparing to regular `.string()`: it has `password` format and generated RegExp string for `pattern`.

```ts
// Expect user input to be a "string" type
z.password()

// Expect password length to be greater or equal to 8
z.password().min(8)

// Expect password length to be less or equal to 100
z.password().max(100)

// Expect password to have at least one digit
z.password().atLeastOne('digit')

// Expect password to have at least one lowercase letter
z.password().atLeastOne('lowercase')

// Expect password to have at least one uppercase letter
z.password().atLeastOne('uppercase')

// Expect password to have at least one special symbol
z.password().atLeastOne('special')
```

Errors:

- `invalid_password_no_digit`
- `invalid_password_no_lowercase`
- `invalid_password_no_uppercase`
- `invalid_password_no_special`
- `too_small` with `type === 'password'`
- `too_big` with `type === 'password'`

### Json Schema

> [!CAUTION]
> `@nest-zod/z` is deprecated and will not be supported soon.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

> Created for `nestjs-zod-prisma`

```ts
z.json()
```

### "from" function

> [!CAUTION]
> `@nest-zod/z` is deprecated and will not be supported soon.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

> Created for custom schemas in `nestjs-zod-prisma`

Just returns the same Schema

```ts
z.from(MySchema)
```

### Extended Zod Errors

> [!CAUTION]
> `@nest-zod/z` is deprecated and will not be supported soon.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.

Currently, we use `custom` error code due to some Zod limitations (`errorMap` priorities)

Therefore, the error details is located inside `params` property:

```ts
const error = {
  code: 'custom',
  message: 'Invalid date, expected it to be the past',
  params: {
    isNestJsZod: true,
    code: 'invalid_date_string_direction',

    // payload is always located here in a flat view
    expected: 'past',
  },
  path: ['date'],
}
```

### Working with errors on the client side

> [!CAUTION]
> `@nest-zod/z/frontend` is deprecated and will not be supported soon.  It is recommended to use `zod` directly.  See [MIGRATION.md](./MIGRATION.md) for more information.


Optionally, you can install `@nest-zod/z` on the client side.

The library provides you a `@nest-zod/z/frontend` entry point, that can be used to detect custom NestJS Zod issues and process them the way you want.

```ts
import { isNestJsZodIssue, NestJsZodIssue, ZodIssue } from '@nest-zod/z/frontend'

function mapToFormErrors(issues: ZodIssue[]) {
  for (const issue of issues) {
    if (isNestJsZodIssue(issue)) {
      // issue is NestJsZodIssue
    }
  }
}
```

> :warning: **If you use `zod` in your client-side application, and you want to install `@nest-zod/z` too, it may be better to completely switch to `@nest-zod/z` to prevent issues caused by mismatch between `zod` versions. `@nest-zod/z/frontend` doesn't use `zod` at the runtime, but it uses its types.**

## OpenAPI (Swagger) support

### Setup

Prerequisites:

- `@nestjs/swagger` with version `^5.0.0` installed

Apply the patch `patchNestJsSwagger()` in your `main.ts` file before setting up your swagger module:

```ts
import { patchNestJsSwagger } from '@at7211/nestjs-zod'

patchNestJsSwagger()
```

For addtional documentation, follow the [Nest.js' Swagger Module Guide](https://docs.nestjs.com/openapi/introduction), or you can see the example application guide [here](/packages/example/) .

### Writing more Swagger-compatible schemas

Use `.describe()` method to add Swagger description:

```ts
import { z } from 'zod'

const CredentialsSchema = z.object({
  username: z.string().describe('This is an username'),
  password: z.string().describe('This is a password'),
})
```

### Using zodToOpenAPI

You can convert any Zod schema to an OpenAPI JSON object:

```ts
import { zodToOpenAPI } from '@at7211/nestjs-zod'
import { z } from 'zod'

const SignUpSchema = z.object({
  username: z.string().min(8).max(20),
  password: z.string().min(8).max(20),
  sex: z
    .enum(['male', 'female', 'nonbinary'])
    .describe('We respect your gender choice'),
  social: z.record(z.string().url())
})

const openapi = zodToOpenAPI(SignUpSchema)
```

The output will be the following:

```json
{
  "type": "object",
  "properties": {
    "username": {
      "type": "string",
      "minLength": 8,
      "maxLength": 20
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "maxLength": 20
    },
    "sex": {
      "description": "We respect your gender choice",
      "type": "string",
      "enum": ["male", "female", "nonbinary"]
    },
    "social": {
      "type": "object",
      "additionalProperties": {
        "type": "string",
        "format": "uri"
      }
    },
    "birthDate": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": ["username", "password", "sex", "social", "birthDate"]
}
```

## Credits

- [zod-dto](https://github.com/kbkk/abitia/tree/master/packages/zod-dto)  
  `nestjs-zod` includes a lot of refactored code from `zod-dto`.

- [zod-nestjs](https://github.com/anatine/zod-plugins/blob/main/packages/zod-nestjs/README.md) and [zod-openapi](https://github.com/anatine/zod-plugins/tree/main/packages/zod-openapi)  
  These libraries bring some new features compared to `zod-dto`.  
  `nestjs-zod` has used them too.
