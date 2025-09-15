import { tags } from "typia";

export namespace IFlexOfficeCustomScripts {
  /**
   * Request payload for searching and filtering FlexOffice custom scripts
   * with pagination.
   *
   * Allows filtering by keyword, language, and specifying pagination and
   * sorting options.
   */
  export type IRequest = {
    /** Optional search keyword filtering code, name, description. */
    search?: string | null | undefined;

    /** Filter by script language, e.g., "javascript" or "python" */
    script_language?: string | null | undefined;

    /** Page number for pagination. */
    page?: (number & tags.Type<"int32">) | null | undefined;

    /** Limit of records per page. */
    limit?: (number & tags.Type<"int32">) | null | undefined;

    /** Sort order, e.g., name, created_at. */
    sort?: string | null | undefined;

    /** Sort direction, "asc" or "desc". */
    direction?: "asc" | "desc" | null | undefined;
  };
}
