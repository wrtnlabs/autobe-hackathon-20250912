import { tags } from "typia";

export namespace IAuctionPlatformCalendarEvents {
  /** Filter criteria and pagination parameters for calendar event retrieval */
  export type IRequest = {
    /**
     * Filter criteria to search and paginate auction platform calendar
     * events.
     *
     * Allows filtering by fields such as streamer name, date ranges, and
     * pagination support for efficient retrieval.
     */
    search_text?: string | null | undefined;

    /** Pagination: page number. */
    page?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Pagination: amount of records per page.
     *
     * @default 100
     */
    limit?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Sort field for listing calendar events.
     *
     * Allowed values typically include 'start_at', 'title', 'updated_at'.
     */
    sort_by?: string | null | undefined;

    /**
     * Sort direction, either ascending or descending.
     *
     * Enum: 'asc', 'desc'
     */
    sort_direction?: "asc" | "desc" | null | undefined;
  };

  /**
   * Summary information for calendar events with essential scheduling
   * properties.
   */
  export type ISummary = {
    /** Unique identifier of the calendar event. */
    id: string & tags.Format<"uuid">;

    /** Identifier of the auction room linked to this calendar event. */
    auction_platform_auction_room_id: string & tags.Format<"uuid">;

    /** Title or name of the calendar event representing the auction. */
    title: string;

    /** Start date and time of the calendar event. */
    start_at: string & tags.Format<"date-time">;

    /** Optional end date and time of the calendar event. */
    end_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
