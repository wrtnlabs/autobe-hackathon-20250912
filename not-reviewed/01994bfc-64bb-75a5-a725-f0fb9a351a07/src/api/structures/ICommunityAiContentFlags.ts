import { tags } from "typia";

export namespace ICommunityAiContentFlags {
  /**
   * Request parameters to filter and paginate moderator reviews linked to
   * content flags.
   */
  export type IModeratorReviewsRequest = {
    /** Page number for pagination */
    page?: (number & tags.Type<"int32">) | null | undefined;

    /** Limit of records per page */
    limit?: (number & tags.Type<"int32">) | null | undefined;

    /** Filter decision value */
    decision?: string | null | undefined;

    /** Sorting specification */
    sort?: string | null | undefined;
  };
}
