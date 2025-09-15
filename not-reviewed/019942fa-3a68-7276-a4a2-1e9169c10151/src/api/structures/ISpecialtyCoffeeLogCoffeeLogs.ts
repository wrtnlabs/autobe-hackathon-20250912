import { tags } from "typia";

export namespace ISpecialtyCoffeeLogCoffeeLogs {
  /** Request parameters for searching and filtering coffee logs. */
  export type IRequest = {
    /** Current page number. */
    page?: (number & tags.Type<"int32">) | null | undefined;

    /** Limitation of records per a page. */
    limit?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Search text filter for coffee logs (e.g., bean name or tasting
     * notes).
     */
    search?: string | null | undefined;

    /** Minimum star rating filter. */
    star_rating_min?: (number & tags.Type<"int32">) | null | undefined;

    /** Maximum star rating filter. */
    star_rating_max?: (number & tags.Type<"int32">) | null | undefined;

    /** Filter by member_id. */
    member_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Sort field name. */
    order_by?: string | null | undefined;

    /** Sort direction: "asc" or "desc". */
    order_direction?: "asc" | "desc" | null | undefined;
  };
}
