import { tags } from "typia";

export namespace ICommunityAiUserReports {
  /** Filter and pagination parameters for searching user reports. */
  export type IRequest = {
    /** Primary Key. */
    id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Member who submitted the report. {@link community_ai_members.id} */
    community_ai_member_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Post reported (nullable if the report targets a comment).
     * {@link community_ai_posts.id}
     */
    community_ai_post_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Comment reported (nullable if the report targets a post).
     * {@link community_ai_comments.id}
     */
    community_ai_comment_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Reason for reporting the content or user behavior. */
    report_reason?: string | null | undefined;

    /**
     * Current resolution status such as 'open', 'investigating', or
     * 'closed'.
     */
    resolution_status?: string | null | undefined;

    /** Timestamp when the report was created. */
    created_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Timestamp when the report was last updated. */
    updated_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Nullable soft delete timestamp to mark if the report is deleted and
     * hidden.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Summary view of user reports.
   *
   * Contains essential information about member-submitted content or user
   * behavior reports.
   *
   * References the community_ai_user_reports Prisma table's key fields for
   * report processing.
   */
  export type ISummary = {
    /** Unique identifier of the user report */
    id: string & tags.Format<"uuid">;

    /** Reason for reporting the content or user behavior. */
    report_reason: string;

    /**
     * Current resolution status such as 'open', 'investigating', or
     * 'closed'.
     */
    resolution_status: string;

    /** Timestamp when the report was created. */
    created_at: string & tags.Format<"date-time">;
  };
}
