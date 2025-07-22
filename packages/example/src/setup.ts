// Setup file to initialize pre-registration before GraphQL schema building
import { preRegisterAllDtos } from '@at7211/nestjs-zod';

// Import all DTO files to trigger decorator execution
import './posts/posts.dto';

// Execute pre-registration
export function setupDtoPreRegistration() {
  console.log('Setting up DTO pre-registration...');
  preRegisterAllDtos();
  console.log('DTO pre-registration setup completed');
}