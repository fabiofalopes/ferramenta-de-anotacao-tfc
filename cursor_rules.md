# Cursor Development Rules

## 1. Code Organization
- Follow the project structure defined in development_structure.md
- Keep related functionality in appropriate modules
- Use clear and descriptive naming conventions
- Maintain consistent file organization

## 2. Implementation Flow
1. Start with the current phase in development_structure.md
2. For each task:
   - Read and understand requirements
   - Plan implementation approach
   - Write code with tests
   - Run tests and fix issues
   - Document changes
   - Update development_structure.md
   - Move to next task

## 3. Testing Protocol
- Write tests before or alongside implementation
- Run tests after each significant change
- Ensure all tests pass before moving forward
- Document test results and any issues found

## 4. Documentation Standards
- Update documentation as code changes
- Keep docstrings current and comprehensive
- Document any deviations from original plan
- Maintain clear commit messages

## 5. Code Quality
- Follow PEP 8 style guide
- Use type hints consistently
- Keep functions focused and small
- Write clear and maintainable code
- Remove unused code and comments

## 6. Security Practices
- Never commit sensitive information
- Follow security best practices
- Validate all inputs
- Handle errors securely
- Keep dependencies updated

## 7. Performance Considerations
- Optimize database queries
- Use appropriate data structures
- Implement caching where beneficial
- Monitor performance metrics

## 8. Error Handling
- Implement comprehensive error handling
- Log errors appropriately
- Provide clear error messages
- Handle edge cases

## 9. Version Control
- Make atomic commits
- Write clear commit messages
- Keep feature branches up to date
- Review changes before committing

## 10. Continuous Integration
- Run all tests before committing
- Check code coverage
- Verify type hints
- Run security scans

## 11. Development Environment
- Use virtual environment
- Keep dependencies updated
- Maintain consistent development setup
- Document environment setup

## 12. Code Review Process
- Review code for:
  - Functionality
  - Security
  - Performance
  - Maintainability
  - Documentation
- Address review comments before proceeding

## 13. Progress Tracking
- Update development_structure.md regularly
- Mark completed tasks
- Document any blockers
- Track time spent on tasks

## 14. Communication
- Document major decisions
- Keep team informed of progress
- Report issues promptly
- Share knowledge and solutions

## 15. Quality Assurance
- Verify all requirements are met
- Check for edge cases
- Ensure backward compatibility
- Validate performance requirements

## 16. Deployment Considerations
- Prepare for deployment early
- Document deployment process
- Consider scalability
- Plan for monitoring

## 17. Maintenance
- Keep code maintainable
- Document maintenance procedures
- Plan for future updates
- Consider technical debt

## 18. Exit Criteria
Before moving to next phase:
- All tests passing
- Documentation complete
- Code reviewed
- Performance verified
- Security checked
- Requirements met 