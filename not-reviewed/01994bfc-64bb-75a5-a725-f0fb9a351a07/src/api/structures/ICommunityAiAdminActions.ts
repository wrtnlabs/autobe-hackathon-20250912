import { tags } from "typia";

export namespace ICommunityAiAdminActions {
  /**
   * Request type for searching or filtering admin actions with optional date
   * filters and detail text.
   */
  export type IRequest = {
    /** The admin who performed the action. community_ai_admins.id */
    community_ai_admin_id: string & tags.Format<"uuid">;

    /**
     * Moderator review on which this action is based (nullable if action is
     * based on a user report).
     */
    community_ai_moderator_review_id?:
      | (string & tags.Format<"uuid">)
      | null
      | undefined;

    /**
     * User report on which this action is based (nullable if action is
     * based on a moderator review).
     */
    community_ai_user_report_id?:
      | (string & tags.Format<"uuid">)
      | null
      | undefined;

    /**
     * Type of administrative action such as 'ban user', 'unban user', 'warn
     * user', or 'delete content'.
     */
    action_type: string;

    /** Additional details or reasons regarding the action by the admin. */
    details?: string | null | undefined;

    /** Timestamp of when the action was performed. */
    created_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Timestamp of the last update on the action. */
    updated_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Nullable soft delete timestamp to mark if the action is deleted and
     * hidden.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
