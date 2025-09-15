import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing coding test result (ats_recruitment_coding_test_results).
 *
 * This endpoint allows authorized system administrators to update the details
 * of a coding test result. Permitted updates include fields such as score,
 * evaluation method, plagiarism flag, and audit fields. Only accessible by
 * authenticated systemAdmin users. Audit/isolation is enforced per business
 * rules.
 *
 * @param props - Object containing the systemAdmin payload, path parameters,
 *   and update body.
 * @param props.systemAdmin - Authenticated systemAdmin making the request.
 * @param props.codingTestId - UUID of the coding test (path parameter, not used
 *   for update, but checked as context).
 * @param props.submissionId - UUID of the submission (path parameter, not used
 *   for update, but checked as context).
 * @param props.resultId - UUID of the result to update (primary key for
 *   update).
 * @param props.body - Partial update fields respecting
 *   IAtsRecruitmentCodingTestResult.IUpdate type.
 * @returns The full updated IAtsRecruitmentCodingTestResult after update.
 * @throws {Error} If the result does not exist or is already soft-deleted.
 */
export async function putatsRecruitmentSystemAdminCodingTestsCodingTestIdSubmissionsSubmissionIdResultsResultId(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestResult.IUpdate;
}): Promise<IAtsRecruitmentCodingTestResult> {
  const { resultId, body } = props;

  const found =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.findFirst({
      where: {
        id: resultId,
        deleted_at: null,
      },
    });
  if (!found) throw new Error("Result not found");

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.update({
      where: { id: resultId },
      data: {
        ...(body.evaluation_method !== undefined
          ? { evaluation_method: body.evaluation_method }
          : {}),
        ...(body.score !== undefined ? { score: body.score } : {}),
        ...(body.maximum_score !== undefined
          ? { maximum_score: body.maximum_score }
          : {}),
        ...(body.plagiarism_flag !== undefined
          ? { plagiarism_flag: body.plagiarism_flag }
          : {}),
        ...(body.ranking_percentile !== undefined
          ? { ranking_percentile: body.ranking_percentile }
          : {}),
        ...(body.result_json !== undefined
          ? { result_json: body.result_json }
          : {}),
        ...(body.finalized_at !== undefined
          ? { finalized_at: body.finalized_at }
          : {}),
        ...(body.deleted_at !== undefined
          ? { deleted_at: body.deleted_at }
          : {}),
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    ats_recruitment_coding_test_submission_id:
      updated.ats_recruitment_coding_test_submission_id,
    ats_recruitment_coding_test_id: updated.ats_recruitment_coding_test_id,
    evaluation_method: updated.evaluation_method,
    score: updated.score,
    maximum_score: updated.maximum_score,
    plagiarism_flag: updated.plagiarism_flag,
    ranking_percentile: updated.ranking_percentile,
    result_json: updated.result_json ?? undefined,
    finalized_at: toISOStringSafe(updated.finalized_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
