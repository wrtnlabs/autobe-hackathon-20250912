import { tags } from "typia";

export namespace IJobPerformanceEvalEvaluationSnapshots {
  /** Request payload for paginated retrieval of evaluation snapshots. */
  export type IRequest = {
    /** Page number to retrieve, used for paginated results. */
    page?: (number & tags.Minimum<0>) | null | undefined;

    /** Maximum number of records to return per page. */
    limit?: (number & tags.Minimum<0>) | null | undefined;

    /** Filters object to narrow down result set based on criteria. */
    filter?:
      | {
          /** UUID of the evaluation cycle to filter results. */
          evaluation_cycle_id?: (string & tags.Format<"uuid">) | undefined;

          /** UUID of the employee to filter results. */
          employee_id?: (string & tags.Format<"uuid">) | undefined;

          /** Return records created after this ISO 8601 date-time. */
          created_after?: (string & tags.Format<"date-time">) | undefined;

          /** Return records created before this ISO 8601 date-time. */
          created_before?: (string & tags.Format<"date-time">) | undefined;
        }
      | null
      | undefined;

    /** Search keyword for matching records. */
    search?: string | null | undefined;

    /** Field name to order the results by, e.g., created_at. */
    orderBy?: string | null | undefined;

    /** Sort order direction, either 'asc' or 'desc'. */
    orderDirection?: "asc" | "desc" | null | undefined;
  };

  /**
   * Summary of job performance evaluation snapshots.
   *
   * Includes key scores and references with timestamps for overview listing.
   */
  export type ISummary = {
    /**
     * Primary Key.
     *
     * Unique identifier of the evaluation snapshot record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Referenced evaluation cycle's unique ID.
     *
     * Links this snapshot to a specific evaluation period.
     */
    evaluation_cycle_id: string & tags.Format<"uuid">;

    /**
     * Referenced employee's unique ID.
     *
     * Indicates which employee this snapshot belongs to.
     */
    employee_id: string & tags.Format<"uuid">;

    /**
     * Employee's self-evaluated job performance score.
     *
     * Scale: 1 to 5, with 1 being the lowest and 5 the highest.
     */
    performance_score: number & tags.Type<"int32">;

    /**
     * Employee's self-evaluated knowledge and skills score.
     *
     * Scale: 1 to 5.
     */
    knowledge_score: number & tags.Type<"int32">;

    /**
     * Employee's self-evaluated problem solving and collaboration score.
     *
     * Scale: 1 to 5.
     */
    problem_solving_score: number & tags.Type<"int32">;

    /**
     * Employee's self-evaluated innovation score.
     *
     * Scale: 1 to 5.
     */
    innovation_score: number & tags.Type<"int32">;

    /**
     * Manager's evaluation of job performance score.
     *
     * Scale: 1 to 5.
     *
     * Optional; null if manager has not yet evaluated this category.
     */
    manager_performance_score?:
      | (number & tags.Type<"int32">)
      | null
      | undefined;

    /**
     * Manager's evaluation of knowledge and skills score.
     *
     * Scale: 1 to 5.
     *
     * Optional; null if manager has not yet evaluated this category.
     */
    manager_knowledge_score?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Manager's evaluation of problem solving and collaboration score.
     *
     * Scale: 1 to 5.
     *
     * Optional; null if manager has not yet evaluated this category.
     */
    manager_problem_solving_score?:
      | (number & tags.Type<"int32">)
      | null
      | undefined;

    /**
     * Manager's evaluation of innovation score.
     *
     * Scale: 1 to 5.
     *
     * Optional; null if manager has not yet evaluated this category.
     */
    manager_innovation_score?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Snapshot creation timestamp.
     *
     * Records when this snapshot was first created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Snapshot last update timestamp.
     *
     * Indicates the latest modification time.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
