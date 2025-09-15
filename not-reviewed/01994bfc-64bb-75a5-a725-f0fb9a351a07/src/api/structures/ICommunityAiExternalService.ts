import { tags } from "typia";

export namespace ICommunityAiExternalService {
  /**
   * Request schema for querying external system services with optional
   * filtering by service name, active status, and timestamps. Supports
   * pagination parameters to control data retrieval size and pages.
   */
  export type IRequest = {
    /** Unique name of the external service used for filtering. */
    service_name?: string | null | undefined;

    /**
     * Flag indicating if the service is currently active and enabled for
     * filtering.
     */
    is_active?: boolean | null | undefined;

    /** Record creation timestamp used for filtering. */
    created_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Record last update timestamp used for filtering. */
    updated_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Limit of records per page for pagination. */
    limit?: (number & tags.Type<"int32">) | null | undefined;

    /** Page number for pagination. */
    page?: (number & tags.Type<"int32">) | null | undefined;
  };

  /**
   * Summary information of external AI and system integration services.
   *
   * Includes key status indicators and unique service names.
   */
  export type ISummary = {
    /** Primary Key. */
    id: string & tags.Format<"uuid">;

    /** Unique name of the external service. */
    service_name: string;

    /** Flag indicating if the service is currently active and enabled. */
    is_active: boolean;
  };
}
