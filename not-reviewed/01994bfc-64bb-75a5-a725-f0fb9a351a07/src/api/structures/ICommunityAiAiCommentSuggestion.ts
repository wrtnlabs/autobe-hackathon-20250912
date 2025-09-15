import { tags } from "typia";

export namespace ICommunityAiAiCommentSuggestion {
  /**
   * Pagination, filtering, and sorting request parameters for AI comment
   * suggestions.
   *
   * This request schema allows filtering by confidence scores, member ID,
   * creation date ranges, search keywords, and supports pagination and
   * sorting options.
   *
   * All fields are optional and nullable when not provided.
   */
  export type IRequest = {
    /** Optional search keyword to match suggestion text. */
    search?: string | undefined;

    /** Minimum confidence score filter (0.0 to 1.0). */
    confidence_score_min?: number | undefined;

    /** Maximum confidence score filter (0.0 to 1.0). */
    confidence_score_max?: number | undefined;

    /** Filter suggestions by specific member ID. */
    member_id?: (string & tags.Format<"uuid">) | undefined;

    /** Start date for filtering suggestions by creation time. */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /** End date for filtering suggestions by creation time. */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /** Page number for pagination (default 1). */
    page?: (number & tags.Type<"int32">) | undefined;

    /** Number of items per page for pagination (default 20). */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * Sort field; e.g., 'created_at' or 'confidence_score'. Must respect
     * defined sort fields.
     */
    sort?: string | undefined;

    /** Sort order direction: 'asc' or 'desc'. */
    order?: "asc" | "desc" | undefined;
  } | null;

  /**
   * Summary of an AI-generated comment suggestion.
   *
   * Includes unique ID, suggestion text, and confidence score for brief
   * display in suggestion lists.
   */
  export type ISummary = {
    /** Unique identifier of the AI comment suggestion. */
    id: string & tags.Format<"uuid">;

    /** AI-generated comment improvement suggestion text. */
    suggestion_text: string;

    /** Confidence score for the AI suggestion ranging from 0.0 to 1.0. */
    confidence_score: number;
  };
}
