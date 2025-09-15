import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Retrieve a specific coding test result for a submission
 * (ats_recruitment_coding_test_results).
 *
 * Retrieves full detail and audit trail for a coding test result via composite
 * match, enforcing reviewer authorization and privacy. Only techReviewers who
 * have participated in review (via ats_recruitment_coding_test_review_comments)
 * or are directly responsible may access the result. Returns full scoring,
 * ranking, and evaluation JSON for reviewer audit and investigation.
 *
 * @param props - Request context
 * @param props.techReviewer - The authenticated tech reviewer (must be a
 *   reviewer for this submission to access)
 * @param props.codingTestId - Unique identifier of the coding test instance
 * @param props.submissionId - Unique identifier of the coding test submission
 * @param props.resultId - Unique identifier of the coding test result
 * @returns The detailed coding test result per IAtsRecruitmentCodingTestResult
 * @throws {Error} If result is not found or access is forbidden (not reviewer
 *   for this test)
 */
export async function getatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdResultsResultId(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentCodingTestResult> {
  // Step 1: Fetch coding test result (ensure all 3 keys match and not soft-deleted)
  const result =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.findFirst({
      where: {
        id: props.resultId,
        ats_recruitment_coding_test_id: props.codingTestId,
        ats_recruitment_coding_test_submission_id: props.submissionId,
        deleted_at: null,
      },
    });
  if (!result) {
    throw new Error("Coding test result not found");
  }

  // Step 2: Authorization - reviewer must be a participant in this review
  const reviewerParticipation =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.findFirst(
      {
        where: {
          ats_recruitment_coding_test_submission_id: props.submissionId,
          ats_recruitment_techreviewer_id: props.techReviewer.id,
        },
      },
    );
  if (!reviewerParticipation) {
    throw new Error(
      "Forbidden: Tech reviewer not authorized for this submission",
    );
  }

  // Step 3: Transform and return as IAtsRecruitmentCodingTestResult
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
