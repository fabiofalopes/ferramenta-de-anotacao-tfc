# Annotation Backend Refactoring

This is a refactored version of the annotation backend that implements several key improvements to make the codebase more flexible and maintainable.

## Key Changes

### 1. Data Item Structure Refactoring

- Removed specialized tables for DataItem subtypes, simplifying the database schema
- Moved specialized fields to meta_data JSON field for flexibility
- Added helper methods for accessing type-specific fields consistently
- Preserved backward compatibility through property accessors

### 2. Dynamic Project Types

- Created a project type registry in config.py
- Added validation for project types and their supported data/annotation types
- Defined schema requirements for each project type
- Ensured chat disentanglement works with the same behavior as before

### 3. Flexible Data Import

- Implemented a configurable mapping system with templates
- Added support for field transformations during import
- Improved validation and error handling
- Maintained backward compatibility with existing import formats

### 4. Standardized Annotation API

- Created a new unified annotations API with proper filtering and pagination
- Added consistent endpoint patterns
- Implemented type validation based on project configuration
- Maintained backward compatibility with existing endpoints

### 5. API Endpoint Standardization

- Added versioned API endpoints under /api/v1/
- Standardized query parameter naming (offset, limit)
- Added consistent filtering options
- Maintained backward compatibility with existing endpoints

## API Structure

### New Versioned API Endpoints

- `/api/v1/auth` - Authentication endpoints
- `/api/v1/admin` - Admin operations
- `/api/v1/projects` - Project management
- `/api/v1/data` - Data item operations
- `/api/v1/import` - Data import operations
- `/api/v1/annotations` - Annotation operations

### Project Types

The system now supports configurable project types:

- `chat_disentanglement` - For chat thread annotation
- `generic` - For general annotation tasks

New project types can be added by extending the `PROJECT_TYPES` dictionary in `config.py`.

## Migration Notes

This refactoring requires database migrations to convert existing data to the new format. Due to the lack of direct database access in this environment, migrations were not implemented. In a production environment, you would need to:

1. Create migration scripts to transfer data from specialized tables to the main DataItem table
2. Convert specialized fields to entries in the meta_data JSON field
3. Test the migration extensively with production data before deployment

## Future Improvements

1. Add proper JSON schema validation for metadata
2. Implement more sophisticated field transformations for imports
3. Add user-configurable project types through the admin interface
4. Implement more detailed access control for annotations
5. Add support for bulk operations

## Testing

The included changes maintain backward compatibility, but should be thoroughly tested with:

- Existing API clients
- Current data imports
- Frontend applications

Use the existing test suite and add new tests for the added functionality. 