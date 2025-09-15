import { tags } from "typia";

export namespace IPoliticalNewsCrawlerPopularityScore {
  /**
   * Request parameters for popularity scores list filtering, sorting, and
   * pagination.
   */
  export type IRequest = {
    /**
     * Page number.
     *
     * Optional pagination parameter indicating the page to retrieve.
     */
    page?: number | null | undefined;

    /**
     * Limitation of records per a page.
     *
     * Optional pagination parameter limiting items per page. Default is 100
     * if omitted.
     */
    limit?: number | null | undefined;

    /**
     * Filter by popularity score greater than or equal.
     *
     * Optional filter to retrieve popularity scores with scores above this
     * value.
     */
    scoreMin?: number | null | undefined;

    /**
     * Filter by popularity score less than or equal.
     *
     * Optional filter to retrieve popularity scores with scores below this
     * value.
     */
    scoreMax?: number | null | undefined;

    /**
     * Filter by snapshot date - start.
     *
     * Optional timestamp to filter scores by snapshot start time.
     */
    snapshotAtStart?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter by snapshot date - end.
     *
     * Optional timestamp to filter scores by snapshot end time.
     */
    snapshotAtEnd?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Summary data for a popularity score snapshot related to a specific
   * popular topic.
   */
  export type ISummary = {
    /** Primary key identifying the popularity score snapshot. */
    id: string & tags.Format<"uuid">;

    /** Reference to the popular topic ID. */
    political_news_crawler_popular_topic_id: string & tags.Format<"uuid">;

    /** Computed score indicating popularity. */
    score: number;

    /** Decay factor applied to score for time decay. */
    decay_factor: number;

    /** Timestamp of the popularity score snapshot. */
    snapshot_at: string & tags.Format<"date-time">;
  };
}
