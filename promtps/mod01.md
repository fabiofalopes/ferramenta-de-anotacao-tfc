# Annotation Tool Optimization Prompt

## Context and Goals

You are tasked with optimizing an annotation tool backend focused on chat disentanglement. The project uses FastAPI and SQLAlchemy with a structure built around Projects, DataContainers, DataItems, and Annotations. While functional, it has become too rigid and needs refactoring to be more flexible while maintaining its core functionality.

Key pain points to address:
- Rigid field mappings in data imports
- Overly specialized data structures
- Inflexible relationships between data items and annotations
- Hardcoded aspects specific to chat disentanglement

Time constraints are significant (hours, not days), so focus on high-impact changes with minimal risk.

## Development Workflow

1. Create a copy of the existing backend codebase for all modifications
2. Implement changes in small, testable increments
3. Test each change thoroughly before moving to the next
4. Maintain backward compatibility throughout
5. Document all changes clearly for later reference

## Step 1: Data Item Structure Refactoring

Current issue: DataItem model is too rigid, with specialized subclasses limiting flexibility.

Tasks:
1. Examine the DataItem base class in models.py
2. Identify which fields are truly common vs. specialized
3. Move specialized fields to meta_data while preserving current behavior
4. Create helper functions to access type-specific fields consistently
5. Update serialization to maintain API compatibility

Test by ensuring:
- Existing data is still accessible
- API responses maintain the same structure
- Type-specific behavior works as before

## Step 2: Dynamic Project Types

Current issue: Project types are hardcoded, making extension difficult.

Tasks:
1. Create a simple ProjectType registry (can start as a dictionary in config.py)
2. Define required fields and validation schema for each type
3. Add a validation layer for project-specific data
4. Update project creation/editing APIs to use this registry
5. Ensure chat disentanglement still works with the same behavior

Test by:
- Creating a project with the existing chat_disentanglement type
- Verifying all behavior matches current functionality

## Step 3: Flexible Data Import

Current issue: Import mappings are rigid and don't adapt to different data sources.

Tasks:
1. Create a mapping configuration system with templates
2. Store mapping configuration with each import operation
3. Create defaults for chat disentanglement that match current behavior
4. Update import endpoints to use the new mapping system
5. Ensure validation maintains data integrity

Test with:
- Import of a CSV with current expected structure
- Import of a CSV with different column names using custom mapping

## Step 4: Annotation Structure Review

Current issue: Annotations are tightly coupled to specific project types.

Tasks:
1. Standardize annotation retrieval API
2. Add proper filtering and pagination
3. Ensure type-specific behaviors are preserved
4. Add verification for annotation-item type compatibility

Test with:
- Creating thread annotations for chat messages
- Retrieving annotations with filters

## Step 5: API Endpoint Standardization

Current issue: Inconsistent endpoints make frontend integration difficult.

Tasks:
1. Standardize query parameter naming (offset, limit, filters)
2. Add consistent sorting options
3. Document the standardized patterns
4. Update endpoints to follow these patterns

Test with:
- Using the updated endpoints with the frontend

## Implementation Guidelines

### Common LLM Development Pitfalls to Avoid
- Inconsistent naming patterns
- Incomplete validation checks
- Missing imports or dependencies
- Partial implementation of database migrations
- Forgetting to update serialization schemas
- Introducing breaking changes to APIs

### Keeping Changes Minimal and Safe
- Prefer adding to existing structures over replacing them
- Create adapter functions where needed to maintain compatibility
- Start with read-only operations before modifying write operations
- Use database transactions consistently
- Add logging for important operations

## Testing Strategy
For each modification:
1. Write simple test cases that validate behavior
2. Test with real data from the current system
3. Verify backward compatibility with existing API calls
4. Check error handling paths explicitly

## Deliverables
- Modified backend code (as a copy of the original)
- Brief documentation of changes made
- Any new configuration files or templates
- Migration scripts if database schema changes

Proceed step by step, testing thoroughly after each change. Focus on maintaining functionality while adding flexibility.
