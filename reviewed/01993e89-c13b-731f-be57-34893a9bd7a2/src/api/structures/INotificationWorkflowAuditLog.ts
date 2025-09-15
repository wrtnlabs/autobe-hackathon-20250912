import { tags } from "typia";

export namespace INotificationWorkflowAuditLog {
  /**
   * Page request parameters for audit log filtering.
   *
   * Supports filtering by actor ID, event type, and timestamps.
   *
   * Used to search audit logs recorded for the notification workflow system.
   */
  export type IRequest = {
    /** Page number (1-based index). */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /** Maximum number of records per page. */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /** Actor ID to filter logs by actor (nullable). */
    actor_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Event type filter (nullable). */
    event_type?: string | null | undefined;

    /** Date start filter (ISO 8601). */
    created_after?: (string & tags.Format<"date-time">) | null | undefined;

    /** Date end filter (ISO 8601). */
    created_before?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Summary view for notification workflow audit logs.
   *
   * Contains the essential properties for list views and filtering.
   */
  export type ISummary = {
    /** Unique identifier of the audit log entry. */
    id: string & tags.Format<"uuid">;

    /**
     * ID of the user or system actor responsible for the event, nullable
     * for system events.
     */
    actor_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Type of event recorded (e.g., workflow_created, trigger_fired,
     * user_role_assigned).
     */
    event_type: string;

    /** JSON string containing detailed event data and context. */
    event_data: string;

    /** Timestamp of when the event was recorded. */
    created_at: string & tags.Format<"date-time">;
  };
}
