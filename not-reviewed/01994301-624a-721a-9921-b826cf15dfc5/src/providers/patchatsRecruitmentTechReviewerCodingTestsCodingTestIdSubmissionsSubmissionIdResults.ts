import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import { IPageIAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestResult";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * List and search code test results by submission
 * (ats_recruitment_coding_test_results table).
 *
 * This endpoint retrieves a paginated and filtered list of coding test result
 * records associated with a specific coding test submission. Filters and
 * sorting criteria are applied per request body. Only authenticated and
 * authorized tech reviewers may access these results. Each result includes
 * normalized score, evaluation method, ranking percentile, plagiarism flag,
 * JSON feedback, finalized timestamp, and audit information. Pagination and
 * sorting are supported.
 *
 * @param props -
 *
 *   - TechReviewer: The authenticated tech reviewer making the request
 *   - CodingTestId: UUID of the coding test
 *       (ats_recruitment_coding_test_results.ats_recruitment_coding_test_id)
 *   - SubmissionId: UUID of the submission
 *       (ats_recruitment_coding_test_results.ats_recruitment_coding_test_submission_id)
 *   - Body: Search, filter, and pagination parameters
 *       (IAtsRecruitmentCodingTestResult.IRequest)
 *
 * @returns Paginated list of coding test result entries matching the provided
 *   filters and pagination options
 */
export async function patchatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdResults(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestResult.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTestResult> {
  const { codingTestId, submissionId, body } = props;
  // Pagination defaults (always valid)
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  // Allowed sort fields (must match schema)
  const allowedSortFields = [
    "finalized_at",
    "score",
    "ranking_percentile",
    "evaluation_method",
    "created_at",
  ];
  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "finalized_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";
  // Prisma where clause construction (safe for all types, filter on nullable)
  const where = {
    ats_recruitment_coding_test_id: codingTestId,
    ats_recruitment_coding_test_submission_id: submissionId,
    ...(body.evaluation_method !== undefined && {
      evaluation_method: body.evaluation_method,
    }),
    ...(body.plagiarism_flag !== undefined && {
      plagiarism_flag: body.plagiarism_flag,
    }),
    ...(body.score_gte !== undefined && { score: { gte: body.score_gte } }),
    ...(body.score_lte !== undefined && { score: { lte: body.score_lte } }),
    ...(body.finalized_from !== undefined || body.finalized_to !== undefined
      ? {
          finalized_at: {
            ...(body.finalized_from !== undefined && {
              gte: body.finalized_from,
            }),
            ...(body.finalized_to !== undefined && { lte: body.finalized_to }),
          },
        }
      : {}),
  };
  // Prisma orderBy definition (inline only, field-checked)
  const orderBy = { [sortField]: sortOrder };
  // Data retrieval (concurrent)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_test_results.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    MyGlobal.prisma.ats_recruitment_coding_test_results.count({ where }),
  ]);
  // Map results to the DTO format, strictly matching type
  const data = rows.map((r) => ({
    id: r.id,
    ats_recruitment_coding_test_submission_id:
      r.ats_recruitment_coding_test_submission_id,
    ats_recruitment_coding_test_id: r.ats_recruitment_coding_test_id,
    evaluation_method: r.evaluation_method,
    score: r.score,
    maximum_score: r.maximum_score,
    plagiarism_flag: r.plagiarism_flag,
    ranking_percentile: r.ranking_percentile,
    result_json: r.result_json ?? undefined,
    finalized_at: toISOStringSafe(r.finalized_at),
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    deleted_at:
      r.deleted_at !== null && r.deleted_at !== undefined
        ? toISOStringSafe(r.deleted_at)
        : undefined,
  }));
  // Pagination tags (must be plain numbers)
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / Number(pageSize)),
    },
    data,
  };
}
