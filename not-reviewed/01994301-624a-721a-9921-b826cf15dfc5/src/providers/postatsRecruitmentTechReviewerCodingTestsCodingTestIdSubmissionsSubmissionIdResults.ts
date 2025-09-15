import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Create and finalize a new coding test result for an applicant's submission
 * (ats_recruitment_coding_test_results).
 *
 * This endpoint allows technical reviewers to register a new evaluation result
 * for a specific coding test submission. Only authorized tech reviewers may
 * create coding test results, ensuring compliance and integrity.
 *
 * - Validates the submission exists and matches the codingTestId provided.
 * - Prevents creation of duplicate results for the same submission.
 * - Creates a new coding test result record with full audit metadata and
 *   system-generated fields.
 * - Returns the completed IAtsRecruitmentCodingTestResult DTO, with all dates
 *   formatted as ISO 8601 strings.
 *
 * @param props - Contains the authenticated tech reviewer, the relevant coding
 *   test and submission IDs, and the full result creation body.
 * @param props.techReviewer - The authenticated tech reviewer payload.
 * @param props.codingTestId - The coding test being evaluated (UUID).
 * @param props.submissionId - The submission receiving the result (UUID).
 * @param props.body - The IAtsRecruitmentCodingTestResult.ICreate structure for
 *   the new result.
 * @returns Full IAtsRecruitmentCodingTestResult reflecting the created result
 *   record.
 * @throws {Error} When the submission does not exist, does not match the coding
 *   test, or a result already exists for the submission.
 */
export async function postatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdResults(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestResult.ICreate;
}): Promise<IAtsRecruitmentCodingTestResult> {
  const { techReviewer, codingTestId, submissionId, body } = props;

  // Step 1: Validate the submission exists and matches the codingTestId
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findUnique({
      where: { id: submissionId },
    });
  if (!submission) {
    throw new Error("Submission not found");
  }
  if (submission.ats_recruitment_coding_test_id !== codingTestId) {
    throw new Error("Submission does not belong to the given coding test");
  }

  // Step 2: Ensure no result already exists for this submission
  const existing =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.findFirst({
      where: { ats_recruitment_coding_test_submission_id: submissionId },
    });
  if (existing) {
    throw new Error("A coding test result for this submission already exists");
  }

  // Step 3: Prepare system-generated values
  const now = toISOStringSafe(new Date());
  const newId = v4();

  // Step 4: Create the coding test result
  const created =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.create({
      data: {
        id: newId,
        ats_recruitment_coding_test_submission_id: submissionId,
        ats_recruitment_coding_test_id: codingTestId,
        evaluation_method: body.evaluation_method,
        score: body.score,
        maximum_score: body.maximum_score,
        plagiarism_flag: body.plagiarism_flag,
        ranking_percentile: body.ranking_percentile,
        result_json: body.result_json ?? null,
        finalized_at: body.finalized_at,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Step 5: Return DTO, with all branding and date conversions
  return {
    id: created.id,
    ats_recruitment_coding_test_submission_id:
      created.ats_recruitment_coding_test_submission_id,
    ats_recruitment_coding_test_id: created.ats_recruitment_coding_test_id,
    evaluation_method: created.evaluation_method,
    score: created.score,
    maximum_score: created.maximum_score,
    plagiarism_flag: created.plagiarism_flag,
    ranking_percentile: created.ranking_percentile,
    result_json: created.result_json ?? null,
    finalized_at: toISOStringSafe(created.finalized_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
