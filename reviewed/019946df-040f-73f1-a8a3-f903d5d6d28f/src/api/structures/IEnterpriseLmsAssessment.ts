import { tags } from "typia";

export namespace IEnterpriseLmsAssessment {
  /**
   * Request payload type for updating an existing assessment in the
   * Enterprise LMS. All fields are optional and nullable, allowing partial
   * updates.
   */
  export type IUpdate = {
    /** Unique business code identifying the assessment */
    code?: string | undefined;

    /** Title of the assessment */
    title?: string | undefined;

    /** Detailed description of the assessment content and purpose */
    description?: string | undefined;

    /**
     * Type of assessment, e.g., quiz, survey, peer review, practical
     * assignment
     */
    assessment_type?: string | undefined;

    /** Maximum achievable score for this assessment */
    max_score?: number | undefined;

    /** Minimum score required to pass this assessment */
    passing_score?: number | undefined;

    /** Scheduled start datetime for the assessment */
    scheduled_start_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Scheduled end datetime for the assessment */
    scheduled_end_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Current status of the assessment */
    status?: string | undefined;

    /** Soft deletion timestamp, null if not deleted */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
