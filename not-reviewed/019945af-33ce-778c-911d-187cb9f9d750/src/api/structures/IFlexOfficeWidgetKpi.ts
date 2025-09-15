import { tags } from "typia";

export namespace IFlexOfficeWidgetKpi {
  /** Request body for searching and filtering KPI widgets. */
  export type IRequest = {
    /** Optional search keyword for filtering. */
    search?: string | null | undefined;

    /** Optional pagination page number. */
    page?: number | null | undefined;

    /** Optional pagination limit per page. */
    limit?: number | null | undefined;

    /** Optional property name to sort by. */
    orderBy?: string | null | undefined;

    /** Optional sort direction ('asc' or 'desc'). */
    orderDirection?: "asc" | "desc" | null | undefined;
  };

  /**
   * Summary information of a KPI widget. Includes IDs and creation date for
   * listing and reference purposes.
   */
  export type ISummary = {
    /** Unique identifier of the KPI widget. */
    id: string & tags.Format<"uuid">;

    /** Linked UI widget ID presenting the KPI data. */
    flex_office_widget_id: string & tags.Format<"uuid">;

    /** Timestamp of KPI widget creation. */
    created_at: string & tags.Format<"date-time">;
  };
}
