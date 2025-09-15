import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import { IPageIAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestResult";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * List and search code test results by submission
 * (ats_recruitment_coding_test_results table).
 *
 * This operation allows applicants to retrieve the list of coding test results
 * for their own submission. It enforces access control, supports search,
 * filter, sort, and pagination. Results include scoring, evaluation metadata,
 * and audit dates. Only the submission owner may view results.
 *
 * @param props - Request properties
 * @param props.applicant - Authenticated applicant
 * @param props.codingTestId - Coding test (parent) UUID
 * @param props.submissionId - Submission UUID
 * @param props.body - Search/filter/pagination request
 * @returns Paginated list of matching coding test results
 */
export async function patchatsRecruitmentApplicantCodingTestsCodingTestIdSubmissionsSubmissionIdResults(props: {
  applicant: ApplicantPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestResult.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTestResult> {
  const { applicant, codingTestId, submissionId, body } = props;

  // Step 1: Authorize by submission ownership
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: {
        id: submissionId,
        ats_recruitment_coding_test_id: codingTestId,
        ats_recruitment_applicant_id: applicant.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!submission) {
    // Returns zero-results if not owner (or doesn't exist)
    const page = body.page ?? 1;
    const page_size = body.page_size ?? 20;
    return {
      pagination: {
        current: Number(page),
        limit: Number(page_size),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Step 2: Build where clause (strict schema-derived fields only)
  const resultWhere = {
    ats_recruitment_coding_test_id: codingTestId,
    ats_recruitment_coding_test_submission_id: submissionId,
    deleted_at: null,
    ...(body.evaluation_method !== undefined && {
      evaluation_method: body.evaluation_method,
    }),
    ...(body.plagiarism_flag !== undefined && {
      plagiarism_flag: body.plagiarism_flag,
    }),
    ...((body.score_gte !== undefined || body.score_lte !== undefined) && {
      score: {
        ...(body.score_gte !== undefined && { gte: body.score_gte }),
        ...(body.score_lte !== undefined && { lte: body.score_lte }),
      },
    }),
    ...((body.finalized_from !== undefined ||
      body.finalized_to !== undefined) && {
      finalized_at: {
        ...(body.finalized_from !== undefined && {
          gte: body.finalized_from,
        }),
        ...(body.finalized_to !== undefined && {
          lte: body.finalized_to,
        }),
      },
    }),
  };

  // Step 3: Sort/pagination
  const sortField = body.sort_by ?? "finalized_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";
  const orderBy = { [sortField]: sortOrder };

  const page = body.page ?? 1;
  const page_size = body.page_size ?? 20;
  const skip = (Number(page) - 1) * Number(page_size);
  const take = Number(page_size);

  // Step 4: Query for data + total simultaneously
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_test_results.findMany({
      where: resultWhere,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.ats_recruitment_coding_test_results.count({
      where: resultWhere,
    }),
  ]);

  // Step 5: Map to DTO, converting all date fields using toISOStringSafe()
  const data = rows.map((row) => ({
    id: row.id,
    ats_recruitment_coding_test_submission_id:
      row.ats_recruitment_coding_test_submission_id,
    ats_recruitment_coding_test_id: row.ats_recruitment_coding_test_id,
    evaluation_method: row.evaluation_method,
    score: row.score,
    maximum_score: row.maximum_score,
    plagiarism_flag: row.plagiarism_flag,
    ranking_percentile: row.ranking_percentile,
    result_json:
      row.result_json !== undefined && row.result_json !== null
        ? row.result_json
        : undefined,
    finalized_at: toISOStringSafe(row.finalized_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== undefined && row.deleted_at !== null
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  // Step 6: Return paged result
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / Number(page_size)),
    },
    data,
  };
}
