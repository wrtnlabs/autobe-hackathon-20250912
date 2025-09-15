import { tags } from "typia";

export namespace ICommunityAiContentAccessLogs {
  /**
   * Request object for filtering and paginating content access logs. Contains
   * optional filters, pagination, and sorting options.
   */
  export type IRequest = {
    /** Filter by accessing member UUID */
    member_id?: (string & tags.Format<"uuid">) | undefined;

    /** Filter by accessed post UUID */
    post_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Filter by accessed comment UUID */
    comment_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Filter by access event type e.g. 'view', 'edit' */
    access_type?: string | null | undefined;

    /** Filter by client device information */
    device_info?: string | null | undefined;

    /** Filter by client IP address */
    ip_address?: string | null | undefined;

    /** Filter by access event start timestamp */
    created_at_start?: (string & tags.Format<"date-time">) | null | undefined;

    /** Filter by access event end timestamp */
    created_at_end?: (string & tags.Format<"date-time">) | null | undefined;

    /** Current page number */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /** Record limit per page */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /** Field to sort by */
    order_by?: string | null | undefined;

    /** Sort direction asc or desc */
    order_direction?: "asc" | "desc" | null | undefined;
  };

  /**
   * Summary of content access log entries
   *
   * Provides essential information about user interactions with posts and
   * comments for auditing and compliance purposes.
   */
  export type ISummary = {
    /** Unique identifier of the content access log entry */
    id: string & tags.Format<"uuid">;

    /** ID of the accessing member (user) */
    member_id: string & tags.Format<"uuid">;

    /** Accessed post ID (optional) */
    post_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Accessed comment ID (optional) */
    comment_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Type of access event, e.g., 'view', 'edit' */
    access_type: string;

    /** Timestamp when the access event occurred */
    created_at: string & tags.Format<"date-time">;
  };
}
