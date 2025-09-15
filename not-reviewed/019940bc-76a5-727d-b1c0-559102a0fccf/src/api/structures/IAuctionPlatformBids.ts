import { tags } from "typia";

export namespace IAuctionPlatformBids {
  /** Request parameters for filtering and paginating auction bids. */
  export type IRequest = {
    /** Page number for pagination */
    page?: (number & tags.Type<"int32">) | undefined;

    /** Max items per page */
    limit?: (number & tags.Type<"int32">) | undefined;

    /** UUID of the auction room to filter */
    auction_room_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** UUID of the auction candidate to filter */
    auction_candidate_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** UUID of the team leader to filter */
    team_leader_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Start timestamp for bid time filtering */
    bid_time_start?: (string & tags.Format<"date-time">) | null | undefined;

    /** End timestamp for bid time filtering */
    bid_time_end?: (string & tags.Format<"date-time">) | null | undefined;

    /** Filter bids that are currently winning */
    is_winning?: boolean | null | undefined;

    /** Field to order by */
    order_by?: "bid_time" | "bid_points" | null | undefined;

    /** Direction of ordering */
    order_direction?: "asc" | "desc" | null | undefined;
  };

  /**
   * Summary information for auction bids, including essential properties for
   * listing and quick reference.
   */
  export type ISummary = {
    /** Unique identifier of the auction bid record. */
    id: string & tags.Format<"uuid">;

    /** Unique identifier of the auction room where the bid was placed. */
    auction_room_id: string & tags.Format<"uuid">;

    /** The number of points used in this bid. */
    bid_points: number & tags.Type<"int32">;

    /** Timestamp when the bid was placed in ISO 8601 format. */
    bid_time: string & tags.Format<"date-time">;

    /** Indicates if this bid is the current winning bid. */
    is_winning: boolean;
  };
}
