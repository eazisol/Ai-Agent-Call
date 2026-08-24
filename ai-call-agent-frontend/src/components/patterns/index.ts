/**
 * EaziAICall reusable patterns (framework-portable).
 *
 * These compose the shadcn-style primitives in `src/components/ui`
 * into product-level patterns.
 */
export {
  StatusBadge,
  statusBadgeVariants,
  type StatusBadgeProps,
  type StatusBadgeStatus,
} from "./status-badge";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { ErrorState, type ErrorStateProps } from "./error-state";
export {
  Spinner,
  LoadingState,
  CardSkeleton,
  TableSkeleton,
  type LoadingStateProps,
} from "./loading-state";
export { FormField, type FormFieldProps } from "./form-field";
