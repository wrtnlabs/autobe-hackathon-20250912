import { tags } from "typia";

export namespace ITaskManagementTasks {
  /**
   * Request type for searching and paginating tasks.
   *
   * Includes pagination, filtering by task attributes, and sorting options.
   */
  export type IRequest = {
    /** Optional page number. */
    page?: (number & tags.Default<1>) | null | undefined;

    /** Optional limit of entries per page. */
    limit?: (number & tags.Default<100>) | null | undefined;

    /** Optional search keyword to filter tasks. */
    search?: string | null | undefined;

    /** Optional status filter (UUID). */
    status_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Optional priority filter (UUID). */
    priority_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Optional creator filter (UUID). */
    creator_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Optional project filter (UUID). */
    project_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Optional board filter (UUID). */
    board_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Optional sorting field. */
    sort_by?: string | null | undefined;

    /** Optional sorting order; 'asc' (ascending) or 'desc' (descending). */
    sort_order?: "asc" | "desc" | null | undefined;
  };

  /**
   * Summary view of task including essential fields like id, title, and
   * optionally status and priority names, and due date.
   */
  export type ISummary = {
    /** Unique identifier of the task */
    id: string & tags.Format<"uuid">;

    /** Title of the task */
    title: string;

    /** Denormalized status name (optional) */
    status_name?: string | null | undefined;

    /** Denormalized priority name (optional) */
    priority_name?: string | null | undefined;

    /** Due date and time (optional) */
    due_date?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
