import { tags } from "typia";

export namespace IEnterpriseLmsLearningPath {
  /**
   * Request type for searching and filtering learning paths with pagination
   * and sorting support.
   */
  export type IRequest = {
    /** Page number used for pagination. */
    page?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Number of items per page.
     *
     * @default 100
     */
    limit?: (number & tags.Type<"int32">) | null | undefined;

    /** Search text to be matched against code or title of learning paths. */
    search?: string | null | undefined;

    /** Optional status filter (e.g., active, inactive, archived). */
    status?: string | null | undefined;

    /** Field to sort the results by. */
    orderBy?: "code" | "title" | "created_at" | "updated_at" | null | undefined;

    /** Sorting direction. */
    orderDirection?: "asc" | "desc" | null | undefined;
  };

  /**
   * Summary information for a learning path entity including its unique code,
   * title, and current lifecycle status.
   */
  export type ISummary = {
    /** Primary Key. */
    id: string & tags.Format<"uuid">;

    /** Unique code identifying this learning path within the tenant. */
    code: string;

    /** Title of the learning path. */
    title: string;

    /**
     * Current lifecycle status of the learning path (e.g., active,
     * inactive, archived).
     */
    status: string;
  };
}
