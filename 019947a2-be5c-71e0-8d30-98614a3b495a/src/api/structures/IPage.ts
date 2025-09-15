import { tags } from "typia";

export namespace IPage {
  /** Page information. */
  export type IPagination = {
    /** Current page number. */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Limitation of records per a page. */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Total records in the database. */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total pages.
     *
     * Equal to {@link records} / {@link limit} with ceiling.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /** Request parameters for paginated data retrieval. */
  export type IRequest = {
    /** Page number. */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /** Limit per page. */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;
  };
}
