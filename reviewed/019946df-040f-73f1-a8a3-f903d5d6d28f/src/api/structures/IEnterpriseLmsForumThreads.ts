import { tags } from "typia";

export namespace IEnterpriseLmsForumThreads {
  /**
   * Request body for searching and filtering forum threads. Supports
   * pagination, sorting, search criteria. All properties optional.
   */
  export type IRequest = {
    /** Optional pagination page number (default first page). */
    page?: number | null | undefined;

    /** Optional number of items per page (default configurable). */
    limit?: number | null | undefined;

    /** Optional full-text search string to filter by thread title or body. */
    search?: string | null | undefined;

    /** Optional sort order, e.g., "created_at DESC" or "title ASC". */
    sort?: string | null | undefined;
  };

  /**
   * A summarized representation of a forum thread suited for list displays in
   * the Enterprise LMS.
   */
  export type ISummary = {
    /** Unique identifier of the forum thread summary. */
    id: string & tags.Format<"uuid">;

    /** Foreign key reference to the parent forum. */
    forum_id: string & tags.Format<"uuid">;

    /**
     * Identifier of the thread author, typically a content creator or
     * instructor.
     */
    author_id: string & tags.Format<"uuid">;

    /** Title of the forum thread for quick reference. */
    title: string;

    /** Timestamp when the thread was created. */
    created_at: string & tags.Format<"date-time">;
  };
}
