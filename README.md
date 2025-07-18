<p align="center">
  <img src="logo.svg" width="560px" align="center" alt="NestJS + Zod logo" style="max-width: 100%;" />
  <h1></h1>
  <p align="center">
    ✨ A seamless validation solution for your NestJS application ✨
  </p>
</p>
<br/>
<p align="center">
  <a href="https://github.com/BenLorantfy/nestjs-zod/actions?query=branch%3Amain">
    <img src="https://github.com/BenLorantfy/nestjs-zod/actions/workflows/test-and-build.yml/badge.svg?event=push&branch=main" alt="nestjs-zod CI Status" />
  </a>
  <a href="https://opensource.org/licenses/MIT" rel="nofollow">
    <img src="https://img.shields.io/github/license/BenLorantfy/nestjs-zod" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/nestjs-zod" rel="nofollow">
    <img src="https://img.shields.io/npm/dw/nestjs-zod.svg" alt="npm">
  </a>
  <a href="https://www.npmjs.com/package/nestjs-zod" rel="nofollow">
    <img src="https://img.shields.io/github/stars/BenLorantfy/nestjs-zod" alt="stars">
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
- Useful helpers for client side error handling (`nestjs-zod/frontend`)

## Installation

```
npm install nestjs-zod zod
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
import { createZodDto } from 'nestjs-zod'
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
import { createZodDto } from 'nestjs-zod/dto'
```

## Using ZodValidationPipe

The validation pipe uses your Zod schema to parse data from parameter decorator.

When the data is invalid - it throws [ZodValidationException](#validation-exceptions).

### Globally (recommended)

```ts
import { ZodValidationPipe } from 'nestjs-zod'
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
import { ZodValidationPipe } from 'nestjs-zod'

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
import { ZodValidationPipe } from 'nestjs-zod'
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
import { createZodValidationPipe } from 'nestjs-zod'

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
import { ZodGuard } from 'nestjs-zod'

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
import { createZodGuard } from 'nestjs-zod'

const MyZodGuard = createZodGuard({
  // provide custom validation exception factory
  createValidationException: (error: ZodError) =>
    new BadRequestException('Ooops'),
})
```

## Create validation from scratch

If you don't like `ZodGuard` and `ZodValidationPipe`, you can use `validate` function:

```ts
import { validate } from 'nestjs-zod'

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

`nestjs-zod` provides seamless GraphQL integration with minimal decorators that automatically generate GraphQL types and fields from your Zod schemas.

### GraphQL Setup

Prerequisites:

- `@nestjs/graphql` with version `^9.0.0` or higher installed
- GraphQL driver (Apollo or Mercurius) configured in your NestJS application

The decorators will automatically detect and integrate with your existing GraphQL setup.

### Creating GraphQL types with @ZodObjectType

Use `@ZodObjectType` to create GraphQL ObjectTypes from your Zod schemas:

```ts
import { ZodObjectType } from 'nestjs-zod'
import { z } from 'zod'

// Define your Zod schema
const PostSchema = z.object({
  id: z.number().describe('The unique identifier of the post'),
  title: z.string().describe('The title of the post'),
  content: z.string().describe('The main content of the post'),
  authorId: z.number().describe('The identifier of the post author'),
})

// Create GraphQL ObjectType with minimal decorator
@ZodObjectType(PostSchema)
export class PostDto {}
```

This is equivalent to the traditional NestJS GraphQL approach, but with **75% less code**:

```ts
// Traditional NestJS GraphQL (verbose)
@ObjectType('Post')
export class PostDto {
  @Field()
  id: number

  @Field({ description: 'The title of the post' })
  title: string

  @Field({ description: 'The main content of the post' })
  content: string

  @Field({ description: 'The identifier of the post author' })
  authorId: number
}

// vs. nestjs-zod (minimal)
@ZodObjectType(PostSchema)
export class PostDto {}
```

### Creating GraphQL inputs with @ZodInputType

Use `@ZodInputType` to create GraphQL InputTypes from your Zod schemas:

```ts
import { ZodInputType } from 'nestjs-zod'
import { z } from 'zod'

const CreatePostSchema = z.object({
  title: z.string().describe('The title of the post'),
  content: z.string().describe('The main content of the post'),
  authorId: z.number().describe('The identifier of the post author'),
})

// Create GraphQL InputType with minimal decorator
@ZodInputType(CreatePostSchema)
export class CreatePostInputDto {}
```

### Using in resolvers

Use your decorated DTOs in GraphQL resolvers just like traditional NestJS GraphQL classes:

```ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql'

@Resolver(() => PostDto)
export class PostsResolver {
  @Query(() => [PostDto])
  async getPosts(): Promise<Post[]> {
    return this.postsService.findAll()
  }

  @Query(() => PostDto, { nullable: true })
  async getPost(@Args('id', { type: () => Int }) id: number): Promise<Post | null> {
    return this.postsService.findOne(id)
  }

  @Mutation(() => PostDto)
  async createPost(
    @Args('input', { type: () => CreatePostInputDto }) input: CreatePostInputDto
  ): Promise<Post> {
    return this.postsService.create(input)
  }
}
```

### Key benefits

- **Minimal boilerplate**: Just 2 lines per DTO (`@decorator` + `export class`)
- **Automatic field generation**: All fields and descriptions auto-generated from Zod schema
- **Type safety**: Full TypeScript support with IntelliSense
- **Single source of truth**: Define schema once, use everywhere (REST + GraphQL)
- **Drop-in replacement**: Perfect compatibility with existing `@ObjectType`/`@InputType` usage
- **Validation included**: Automatic request validation using the same Zod schema

### Advanced usage

You can still provide explicit names and options when needed:

```ts
// With explicit GraphQL type name
@ZodObjectType(PostSchema, 'Post', { 
  description: 'A blog post entity' 
})
export class PostDto {}

// With explicit InputType name
@ZodInputType(CreatePostSchema, 'CreatePostInput', { 
  description: 'Input for creating a new post' 
})
export class CreatePostInputDto {}
```

But the minimal approach is recommended for cleaner code:

```ts
// ✅ Recommended: Minimal approach
@ZodObjectType(PostSchema)
export class PostDto {}

@ZodInputType(CreatePostSchema)
export class CreatePostInputDto {}
```

### Migration from @ObjectType/@InputType

Migrating from traditional NestJS GraphQL is straightforward:

**Before:**
```ts
@ObjectType('Post')
export class PostDto {
  @Field()
  id: number

  @Field({ description: 'The title' })
  title: string

  @Field({ description: 'The content' })
  content: string
}
```

**After:**
```ts
// 1. Define your Zod schema (if you don't have one)
const PostSchema = z.object({
  id: z.number(),
  title: z.string().describe('The title'),
  content: z.string().describe('The content'),
})

// 2. Replace @ObjectType with @ZodObjectType
@ZodObjectType(PostSchema)
export class PostDto {}
```

**Benefits of migration:**
- Remove all `@Field()` decorators
- Remove type annotations
- Centralize validation and type definition in Zod schema
- Get automatic field descriptions from `.describe()`
- Reduce code by ~75%

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
import { patchNestJsSwagger } from 'nestjs-zod'

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
import { zodToOpenAPI } from 'nestjs-zod'
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
