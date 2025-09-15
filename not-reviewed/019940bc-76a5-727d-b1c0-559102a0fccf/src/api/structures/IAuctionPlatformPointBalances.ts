import { tags } from "typia";

export namespace IAuctionPlatformPointBalances {
  /**
   * Request type for searching and paginating auction platform point
   * balances. Supports optional pagination, search text, complex filter
   * conditions, and sorting options.
   *
   * Includes:
   *
   * - `page`: pagination page number, zero or positive integer
   * - `limit`: number of records per page, positive integer
   * - `search`: general text search, nullable to disable
   * - `filter`: detailed conditions on team leader ID, auction room ID, points
   *   allocated and used range
   * - `orderBy`: specification of field and direction for sorting
   *
   * All properties are optional and nullable to allow flexible queries.
   */
  export type IRequest = {
    /** Page number for pagination; zero or positive integer. */
    page?: (number & tags.Type<"int32"> & tags.Minimum<0>) | null | undefined;

    /** Limit of records per page; positive integer. */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /** General search text; can be null to disable. */
    search?: string | null | undefined;

    /** Filter conditions for auction platform point balances. */
    filter?:
      | {
          /** Filter by team leader UUID. */
          team_leader_id?: (string & tags.Format<"uuid">) | null | undefined;

          /** Filter by auction room UUID. */
          auction_room_id?: (string & tags.Format<"uuid">) | null | undefined;

          /** Filter minimal allocated points. */
          min_points_allocated?:
            | (number & tags.Type<"int32">)
            | null
            | undefined;

          /** Filter maximal allocated points. */
          max_points_allocated?:
            | (number & tags.Type<"int32">)
            | null
            | undefined;

          /** Filter minimal used points. */
          min_points_used?: (number & tags.Type<"int32">) | null | undefined;

          /** Filter maximal used points. */
          max_points_used?: (number & tags.Type<"int32">) | null | undefined;
        }
      | null
      | undefined;

    /** Sort order for results. */
    orderBy?:
      | {
          /** Field name for ordering. */
          field:
            | "points_allocated"
            | "points_used"
            | "created_at"
            | "updated_at";

          /** Order direction. */
          direction: "asc" | "desc";
        }
      | null
      | undefined;
  };

  /**
   * Summary data for point balances of team leaders, representing their
   * allocated and used points in auctions.
   */
  export type ISummary = {
    /** Unique identifier of the point balance record. */
    id: string & tags.Format<"uuid">;

    /**
     * Unique identifier of the team leader associated with this point
     * balance.
     */
    team_leader_id: string & tags.Format<"uuid">;

    /** Total auction points allocated to the team leader. */
    points_allocated: number & tags.Type<"int32">;

    /** Total auction points used by the team leader. */
    points_used: number & tags.Type<"int32">;
  };
}
