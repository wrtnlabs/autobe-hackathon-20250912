import { tags } from "typia";

export namespace IAuctionPlatformAuctionCandidates {
  /**
   * Request body for searching auction candidates with pagination, filtering
   * and sorting.
   */
  export type IRequest = {
    /**
     * Page number.
     *
     * Pagination page index, unsigned integer.
     */
    page?: (number & tags.Minimum<0>) | undefined;

    /**
     * Limitation of records per a page.
     *
     * Default is 100 if not specified.
     */
    limit?: (number & tags.Minimum<1>) | undefined;

    /**
     * Search keyword to filter auction candidates by nickname or other
     * fields.
     */
    search?: string | undefined;

    /**
     * Sorting option.
     *
     * Possible values might be: "nickname_asc", "nickname_desc",
     * "created_at_asc", "created_at_desc".
     */
    sort_by?: string | undefined;
  };

  /**
   * Summary view of an auction candidate.
   *
   * Includes unique ID and nickname.
   *
   * Used for listing auction candidates in UI or API responses.
   */
  export type ISummary = {
    /** Unique identifier of the auction candidate */
    id: string & tags.Format<"uuid">;

    /** Candidate's display nickname in auctions */
    nickname: string;
  };
}
