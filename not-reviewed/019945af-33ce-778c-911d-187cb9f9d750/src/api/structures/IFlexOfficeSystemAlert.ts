import { tags } from "typia";

export namespace IFlexOfficeSystemAlert {
  /**
   * Request type for system alert list retrieval with filtering and
   * pagination parameters.
   */
  export type IRequest = {
    /** Severity levels to filter alerts; e.g., info, warning, critical. */
    severity?: string | null | undefined;

    /** Filter to include only resolved or unresolved alerts. */
    is_resolved?: boolean | null | undefined;

    /** Starting date for creation timestamp filter. */
    created_after?: (string & tags.Format<"date-time">) | null | undefined;

    /** Ending date for creation timestamp filter. */
    created_before?: (string & tags.Format<"date-time">) | null | undefined;

    /** Page number for pagination; starts from 1. */
    page?: number | null | undefined;

    /** Maximum number of records per page. */
    limit?: number | null | undefined;
  };

  /** Summary information about FlexOffice system alerts */
  export type ISummary = {
    /** Unique identifier of the system alert entry */
    id: string & tags.Format<"uuid">;

    /** Alert severity level, e.g., 'info', 'warning', 'critical' */
    severity: string;

    /** Detailed alert message describing the issue or event */
    message: string;

    /** Flag indicating whether the alert has been resolved */
    is_resolved: boolean;

    /** Timestamp when the alert was generated */
    created_at: string & tags.Format<"date-time">;
  };
}
