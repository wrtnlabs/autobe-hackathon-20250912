import { tags } from "typia";

export namespace IJobPerformanceEvalJobGroups {
  /** Search criteria and pagination parameters for job groups */
  export type IRequest = {
    /**
     * Filter by unique job group code.
     *
     * This property is expected to be a string uniquely identifying a job
     * group. It is a required property in the search request to narrow down
     * the search.
     */
    code: string;

    /**
     * Filter by name pattern.
     *
     * Optional pattern or keyword filter to search job groups by name. If
     * not used, can be explicitly set to null.
     */
    name?: string | null | undefined;

    /**
     * Minimum creation date filter.
     *
     * Optional ISO 8601 formatted date-time string to filter job groups
     * created after this date. Use explicit null if no value is provided.
     */
    createdAfter?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Maximum creation date filter.
     *
     * Optional ISO 8601 formatted date-time string to filter job groups
     * created before this date. Use explicit null if no value is provided.
     */
    createdBefore?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Pagination page number.
     *
     * Optional unsigned integer indicating the page number for paginated
     * results. Use explicit null if no value is provided.
     */
    page?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Number of records per page.
     *
     * Optional unsigned integer limiting the number of items per page. Use
     * explicit null if no value is provided.
     */
    limit?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Sort key for the paginated results.
     *
     * Optional string specifying the attribute name to sort by, such as
     * 'name' or 'created_at'. Use explicit null if not sorting.
     */
    sortKey?: string | null | undefined;

    /**
     * Sort order direction.
     *
     * Optional string with allowed values 'asc' or 'desc' to define sort
     * order. Use explicit null if no sorting order.
     */
    sortOrder?: "asc" | "desc" | null | undefined;
  };

  /**
   * Summary representation of job group entity.
   *
   * Includes identifiers and displayable name/code properties only.
   *
   * Used in lists and quick reference contexts.
   *
   * Derived from job_performance_eval_job_groups table.
   */
  export type ISummary = {
    /** Unique identifier of the job group. */
    id: string & tags.Format<"uuid">;

    /** Unique code identifying the job group. */
    code: string;

    /** Name of the job group. */
    name: string;
  };
}
