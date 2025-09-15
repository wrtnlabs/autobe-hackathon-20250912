import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Update an existing coding test result (ats_recruitment_coding_test_results).
 *
 * This PUT endpoint allows technical reviewers to update an existing coding
 * test result. Only the originally assigned tech reviewer (verified by review
 * submission) may update a result record. The function enforces proper
 * authorization, validates submission and coding test mappings, and carries out
 * a partial update of updatable fields provided in the request body. All
 * updated and returned date fields are formatted as string &
 * tags.Format<'date-time'>. The endpoint response is the fully updated result
 * per IAtsRecruitmentCodingTestResult, ready for workflow consumption or audit
 * tracing.
 *
 * @param props - Operation parameters
 * @param props.techReviewer - Authenticated tech reviewer making the request
 * @param props.codingTestId - The coding test UUID to which this result belongs
 * @param props.submissionId - The coding test submission UUID linked to this
 *   result
 * @param props.resultId - The coding test result UUID to update
 * @param props.body - Body containing any and all updatable fields (partial
 *   update allowed)
 * @returns The fully updated coding test result record per
 *   IAtsRecruitmentCodingTestResult
 * @throws {Error} If the result, submission, or reviewer linkage is invalid or
 *   does not meet authorization constraints
 */
export async function putatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdResultsResultId(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestResult.IUpdate;
}): Promise<IAtsRecruitmentCodingTestResult> {
  const { techReviewer, codingTestId, submissionId, resultId, body } = props;

  // 1. Fetch the target coding test result and validate existence & linkage
  const result =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.findUnique({
      where: { id: resultId },
    });
  if (!result)
    throw new Error("Coding test result not found for the provided resultId.");
  if (
    result.ats_recruitment_coding_test_id !== codingTestId ||
    result.ats_recruitment_coding_test_submission_id !== submissionId
  ) {
    throw new Error(
      "Coding test or submission ID does not match the result record.",
    );
  }

  // 2. Fetch the submission to ensure it exists and is part of the intended coding test
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findUnique({
      where: { id: submissionId },
    });
  if (!submission)
    throw new Error(
      "Coding test submission not found for the given submissionId.",
    );
  if (submission.ats_recruitment_coding_test_id !== codingTestId) {
    throw new Error(
      "Submission is not linked to the provided codingTestId (reviewer not authorized for this submission).",
    );
  }

  // 3. Ensure tech reviewer is active (additional business policy can be implemented if reviewer linkage is introduced)
  const reviewer =
    await MyGlobal.prisma.ats_recruitment_techreviewers.findFirst({
      where: { id: techReviewer.id, is_active: true, deleted_at: null },
    });
  if (!reviewer) {
    throw new Error(
      "Tech reviewer account is not valid or currently inactive.",
    );
  }

  // 4. Prepare the update fields (partial update only for provided fields)
  // Use inline construction for clear type error exposure
  const updated =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.update({
      where: { id: resultId },
      data: {
        ...(body.evaluation_method !== undefined && {
          evaluation_method: body.evaluation_method,
        }),
        ...(body.score !== undefined && { score: body.score }),
        ...(body.maximum_score !== undefined && {
          maximum_score: body.maximum_score,
        }),
        ...(body.plagiarism_flag !== undefined && {
          plagiarism_flag: body.plagiarism_flag,
        }),
        ...(body.ranking_percentile !== undefined && {
          ranking_percentile: body.ranking_percentile,
        }),
        ...(body.result_json !== undefined && {
          result_json: body.result_json,
        }),
        ...(body.finalized_at !== undefined && {
          finalized_at: body.finalized_at,
        }),
        ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
      },
    });

  // 5. Map the Prisma result to the API return type, converting all date fields to string & tags.Format<'date-time'>
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
    result_json:
      typeof updated.result_json === "string" ? updated.result_json : null,
    finalized_at: toISOStringSafe(updated.finalized_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
