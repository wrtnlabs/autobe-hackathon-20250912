import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create and finalize a new coding test result for an applicant's submission
 * (ats_recruitment_coding_test_results).
 *
 * This operation creates a new evaluation result for a coding test submission,
 * performed by a system administrator. It ensures:
 *
 * - Uniqueness: Only one result record can be attached to a submission for audit
 *   and business rule compliance.
 * - Referential integrity: Submission and coding test IDs must exist before
 *   creation.
 * - Audit and traceability: All relevant fields are filled and date/datetime
 *   values are ISO-formatted strings.
 *
 * @param props - Properties for result creation
 * @param props.systemAdmin - The authenticated system admin performing the
 *   operation
 * @param props.codingTestId - Coding test identifier for audit/reference
 * @param props.submissionId - Submission identifier being evaluated
 * @param props.body - Payload containing evaluation/scoring/result data for
 *   persistence
 * @returns The newly created coding test result, fully detailed for API/audit
 *   use
 * @throws {Error} If referenced submission or coding test do not exist
 * @throws {Error} If a result already exists for this submission (business
 *   unique constraint)
 */
export async function postatsRecruitmentSystemAdminCodingTestsCodingTestIdSubmissionsSubmissionIdResults(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestResult.ICreate;
}): Promise<IAtsRecruitmentCodingTestResult> {
  // Step 1: Validate referenced submission exists
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findUnique({
      where: { id: props.submissionId },
    });
  if (!submission) {
    throw new Error("Submission not found");
  }
  // Step 2: Validate referenced coding test exists
  const test = await MyGlobal.prisma.ats_recruitment_coding_tests.findUnique({
    where: { id: props.codingTestId },
  });
  if (!test) {
    throw new Error("Coding test not found");
  }
  // Step 3: Enforce one result per submission (business uniqueness)
  const exists =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.findFirst({
      where: { ats_recruitment_coding_test_submission_id: props.submissionId },
    });
  if (exists) {
    throw new Error("A result for this submission already exists");
  }
  // Step 4: Create result (all date/datetime values string, id immutably generated, no Date type assigned)
  const timestamp = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.create({
      data: {
        id: v4(),
        ats_recruitment_coding_test_submission_id:
          props.body.ats_recruitment_coding_test_submission_id,
        ats_recruitment_coding_test_id:
          props.body.ats_recruitment_coding_test_id,
        evaluation_method: props.body.evaluation_method,
        score: props.body.score,
        maximum_score: props.body.maximum_score,
        plagiarism_flag: props.body.plagiarism_flag,
        ranking_percentile: props.body.ranking_percentile,
        result_json: props.body.result_json ?? undefined,
        finalized_at: props.body.finalized_at,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: undefined,
      },
    });
  // Step 5: Return full API structure (no Date, all date/datetimes are string)
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
    result_json:
      typeof created.result_json === "undefined"
        ? undefined
        : created.result_json,
    finalized_at: created.finalized_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at:
      typeof created.deleted_at === "undefined" || created.deleted_at === null
        ? undefined
        : created.deleted_at,
  };
}
