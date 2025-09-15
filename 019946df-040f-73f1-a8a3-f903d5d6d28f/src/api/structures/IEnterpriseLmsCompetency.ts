import { tags } from "typia";

export namespace IEnterpriseLmsCompetency {
  /**
   * Search and filter request for diagnostics related to competencies.
   *
   * Contains optional properties for tenant filtering, code matching, name
   * searching, and pagination.
   */
  export type IRequest = {
    /**
     * Filter by tenant ID.
     *
     * Optional UUID string.
     */
    tenant_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by competency code.
     *
     * Optional string for partial or exact match.
     */
    code?: string | undefined;

    /**
     * Filter by competency name.
     *
     * Optional string for partial or exact match.
     */
    name?: string | undefined;

    /**
     * Keywords to search in description.
     *
     * Optional string for search functionality.
     */
    description?: string | undefined;

    /**
     * Include only active competencies, i.e., deleted_at must be null.
     *
     * Optional boolean.
     */
    onlyActive?: boolean | undefined;

    /**
     * Pagination page number.
     *
     * Optional unsigned integer.
     */
    page?: number | null | undefined;

    /**
     * Pagination page size.
     *
     * Optional unsigned integer.
     */
    limit?: number | null | undefined;

    /**
     * Sort order.
     *
     * Optional string. Could be e.g., 'created_at asc' or 'name desc'.
     */
    sort?: string | null | undefined;
  };

  /**
   * Summary of competency skill or capability entity.
   *
   * Contains only the essential fields required for list views or references.
   */
  export type ISummary = {
    /** Unique ID of the competency within the tenant organization. */
    id: string & tags.Format<"uuid">;

    /** A code string used for referencing the competency. */
    code: string;

    /** Display name of the competency. */
    name: string;
  };
}
