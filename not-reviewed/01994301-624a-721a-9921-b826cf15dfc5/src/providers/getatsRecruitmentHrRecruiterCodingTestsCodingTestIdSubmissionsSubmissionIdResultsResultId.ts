import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

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
 * Only the HR recruiter assigned to the test can access the result. Strictly
 * validates access and returns the full result in API-native format.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter requesting access
 * @param props.codingTestId - Unique identifier of the coding test (UUID)
 * @param props.submissionId - Unique identifier of the coding test submission
 *   (UUID)
 * @param props.resultId - Unique identifier of the coding test result (UUID)
 * @returns The coding test result including all fields as
 *   IAtsRecruitmentCodingTestResult
 * @throws {Error} When the result does not exist or the recruiter is not
 *   authorized to access it
 */
export async function getatsRecruitmentHrRecruiterCodingTestsCodingTestIdSubmissionsSubmissionIdResultsResultId(props: {
  hrRecruiter: HrrecruiterPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentCodingTestResult> {
  const { hrRecruiter, codingTestId, submissionId, resultId } = props;

  // 1. Find the coding test result for all three IDs
  const result =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.findFirst({
      where: {
        id: resultId,
        ats_recruitment_coding_test_id: codingTestId,
        ats_recruitment_coding_test_submission_id: submissionId,
      },
    });
  if (!result) {
    throw new Error("Coding test result not found");
  }
  // 2. Access control: HR recruiter must be the test owner
  const codingTest =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: {
        id: codingTestId,
        ats_recruitment_hrrecruiter_id: hrRecruiter.id,
      },
    });
  if (!codingTest) {
    throw new Error(
      "Forbidden: HR recruiter cannot access this coding test result",
    );
  }
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
    result_json: result.result_json === null ? undefined : result.result_json,
    finalized_at: toISOStringSafe(result.finalized_at),
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at:
      result.deleted_at === null || typeof result.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(result.deleted_at),
  };
}
