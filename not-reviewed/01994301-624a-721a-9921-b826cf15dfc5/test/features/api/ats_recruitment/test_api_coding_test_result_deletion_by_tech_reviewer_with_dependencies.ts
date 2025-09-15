import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for deletion of a coding test result by a technical reviewer in
 * an ATS system, including all authentication and workflow dependencies.
 *
 * This test implements the business scenario:
 *
 * 1. Technical reviewer registers (join) and authenticates.
 * 2. Applicant registers and authenticates.
 * 3. Create sample coding test and submission IDs (simulate, as there is no
 *    API for these).
 * 4. Reviewer creates a coding test result for the applicant's submission
 *    (using result.create endpoint).
 * 5. Reviewer deletes the result via the erase endpoint.
 * 6. Validate successful deletion (no return value, no error).
 * 7. Attempt to delete again and expect error (double deletion).
 * 8. Attempt deletion with random (non-existent) resultId and expect error.
 *
 * The test demonstrates proper authorization, dependency setup, result
 * creation/deletion, error handling, and logical workflow. All type safety,
 * UUID, and format constraints are respected.
 */
export async function test_api_coding_test_result_deletion_by_tech_reviewer_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register technical reviewer (join)
  const techReviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewerPassword = RandomGenerator.alphaNumeric(12);
  const techReviewerName = RandomGenerator.name();

  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
      name: techReviewerName,
      specialization: RandomGenerator.pick([
        "Backend",
        "Frontend",
        "Cloud",
        "AI",
      ]), // optional
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  // 2. Register applicant (join)
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantName = RandomGenerator.name();

  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: applicantName,
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 3. Simulate codingTest and submission IDs
  const codingTestId = typia.random<string & tags.Format<"uuid">>();
  const submissionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Tech reviewer creates result for the applicant's submission
  const nowIso = new Date().toISOString();
  const codingTestResultCreate = {
    ats_recruitment_coding_test_id: codingTestId,
    ats_recruitment_coding_test_submission_id: submissionId,
    evaluation_method: RandomGenerator.pick(["auto", "manual", "external"]),
    score: Math.floor(Math.random() * 100),
    maximum_score: 100,
    plagiarism_flag: false,
    ranking_percentile: Math.floor(Math.random() * 100),
    result_json: JSON.stringify({ testcaseSummary: "All pass", notes: "None" }),
    finalized_at: nowIso,
  } satisfies IAtsRecruitmentCodingTestResult.ICreate;

  const codingTestResult =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
      connection,
      {
        codingTestId,
        submissionId,
        body: codingTestResultCreate,
      },
    );
  typia.assert(codingTestResult);

  // 5. Reviewer deletes the result
  await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.erase(
    connection,
    {
      codingTestId,
      submissionId,
      resultId: codingTestResult.id,
    },
  );

  // 6. Double deletion should error
  await TestValidator.error(
    "second delete attempt on the same result should fail",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.erase(
        connection,
        {
          codingTestId,
          submissionId,
          resultId: codingTestResult.id,
        },
      );
    },
  );

  // 7. Deletion with incorrect resultId returns error
  const invalidResultId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent coding test result by ID should fail",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.erase(
        connection,
        {
          codingTestId,
          submissionId,
          resultId: invalidResultId,
        },
      );
    },
  );
}
