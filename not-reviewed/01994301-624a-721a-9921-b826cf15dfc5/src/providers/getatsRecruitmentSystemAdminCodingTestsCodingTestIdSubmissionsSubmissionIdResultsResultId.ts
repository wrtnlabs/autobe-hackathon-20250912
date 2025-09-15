import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific coding test result for a submission
 * (ats_recruitment_coding_test_results).
 *
 * Retrieves a detailed result for a specific coding test submission. This
 * operation interfaces with the ats_recruitment_coding_test_results table in
 * the Prisma schema, providing the result associated with a single submission
 * and test. It is designed for technical reviewers, HR recruiters, and system
 * admins to access exact scoring, evaluation methods, and audit information for
 * a precise review or troubleshooting cycle.
 *
 * Only users with 'systemAdmin' role and a valid, active account can access
 * this endpoint. The function strictly validates that the requested result
 * matches the provided coding test and submission identifiers and is not
 * soft-deleted (deleted_at is null).
 *
 * @param props - The request properties including:
 *
 *   - SystemAdmin: The authenticated SystemadminPayload (enforced by
 *       infrastructure)
 *   - CodingTestId: UUID of the coding test instance
 *   - SubmissionId: UUID of the coding test submission
 *   - ResultId: UUID of the coding test result
 *
 * @returns The detailed coding test result including all scoring, evaluation,
 *   audit, and provenance fields (IAtsRecruitmentCodingTestResult).
 * @throws {Error} If the result is not found, mismatched, or soft-deleted,
 *   throws an error with message "Coding test result not found"
 */
export async function getatsRecruitmentSystemAdminCodingTestsCodingTestIdSubmissionsSubmissionIdResultsResultId(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentCodingTestResult> {
  const result =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.findFirst({
      where: {
        id: props.resultId,
        ats_recruitment_coding_test_id: props.codingTestId,
        ats_recruitment_coding_test_submission_id: props.submissionId,
        deleted_at: null,
      },
    });
  if (!result) throw new Error("Coding test result not found");
  return {
    id: result.id,
    ats_recruitment_coding_test_submission_id:
      result.ats_recruitment_coding_test_submission_id,
    ats_recruitment_coding_test_id: result.ats_recruitment_coding_test_id,
    evaluation_method: result.evaluation_method,
    score: result.score,
    maximum_score: result.maximum_score,
    plagiarism_flag: result.plagiarism_flag,
    ranking_percentile: result.ranking_percentile,
    result_json: result.result_json ?? undefined,
    finalized_at: toISOStringSafe(result.finalized_at),
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at
      ? toISOStringSafe(result.deleted_at)
      : undefined,
  };
}
