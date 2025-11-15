# Code Style and Conventions

## General Principles
- **Succinct and to the point** - avoid verbosity
- **Avoid unnecessary comments** - only add comments that explain non-apparent logic
- **Self-documenting code** - prefer clear naming over comments
- **Correct if wrong** - challenge assumptions, prioritize accuracy

## TypeScript Conventions
- Use TypeScript strict mode
- Zod for runtime validation (see `src/config.ts`)
- Type definitions in `src/types.ts`
- Interfaces for data pipeline: `LogseqPage → DocumentChunk → SearchResult`

## Testing Conventions
- Separate tests into **Arrange, Act, Assert** sections
- Use comments for longer tests where clarification is necessary
- **Never use wildcards (\*)** in test selectors or `--tests`
- **Never delete tests** unless instructed - report failures instead
- Write tests to assert correct outcome, not to assert failure
- Avoid boilerplate - reuse/introduce helper methods for test data
- Create minimum tests needed to verify functionality
- Make private methods public rather than using reflection for testing

## Git Conventions
- **Use modern, explicit git commands**
- **Never perform git operations unless instructed**
- **Never include Claude/AI attribution** in commits (no "Co-authored-by Claude", no "🤖 Generated with...")
- Keep commit messages focused on the "why" not the "what"

## Package Management
- **Always use `bun` instead of `npm`** unless specified otherwise

## Task Completion Checklist
Before declaring a task complete:
1. Run `bun typecheck` to verify no TypeScript errors
2. Test the affected functionality manually
3. Check if IntelliJ/IDE shows compilation errors (note if out of sync, don't fix forever)
