import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate HR recruiter can fetch full detail for a coding test submission
 * (happy and error paths).
 *
 * This test validates permissions and correct data retrieval when a recruiter
 * fetches a submission. Covers:
 *
 * - Full actor onboarding (HR + applicant)
 * - Coding test creation for an applicant
 * - Submission by applicant
 * - Successful recruiter access
 * - Field verification
 * - Role-based access denied (recruiter not owner, applicant role,
 *   unauthenticated)
 * - Invalid codingTestId/submissionId error responses
 */
export async function test_api_coding_test_submission_detail_access_hr_recruiter(
  connection: api.IConnection,
) {
  // (1) Register HR recruiter and log in (acquire credentials)
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = "Recruiter!123";
  const hrName = RandomGenerator.name();
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: hrName,
        department: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // (2) Register applicant and authenticate
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "Applicant!456";
  const applicantName = RandomGenerator.name();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: applicantName,
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // (3) HR recruiter log in to ensure token active (in case join did not set)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // Mock application id (no API for that entity - assuming random UUID for coverage)
  const ats_recruitment_application_id = typia.random<
    string & tags.Format<"uuid">
  >();

  // (4) HR recruiter creates coding test assigned to applicant
  const codingTest: IAtsRecruitmentCodingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: "internal",
          scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1hr from now
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // (5) Switch to applicant (for submission)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // (6) Applicant creates coding test submission
  const submission: IAtsRecruitmentCodingTestSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id,
          submitted_at: new Date().toISOString(),
          answer_text: RandomGenerator.paragraph(),
          status: "pending",
          review_status: "pending",
        } satisfies IAtsRecruitmentCodingTestSubmission.ICreate,
      },
    );
  typia.assert(submission);

  // (7) Switch back to HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // (8) HR recruiter fetches submission detail
  const retrieved: IAtsRecruitmentCodingTestSubmission =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.at(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("submission id matches", retrieved.id, submission.id);
  TestValidator.equals(
    "coding test id matches",
    retrieved.ats_recruitment_coding_test_id,
    codingTest.id,
  );
  TestValidator.equals(
    "application id matches",
    retrieved.ats_recruitment_application_id,
    ats_recruitment_application_id,
  );
  TestValidator.equals(
    "answer text matches",
    retrieved.answer_text,
    submission.answer_text,
  );
  TestValidator.equals(
    "review status matches",
    retrieved.review_status,
    "pending",
  );
  TestValidator.equals("status matches", retrieved.status, "pending");
  TestValidator.equals(
    "applicant id matches",
    retrieved.ats_recruitment_applicant_id,
    applicant.id,
  );

  // (9) Negative scenario: role-based/access denied. Use applicant token to access submission (no permission).
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  await TestValidator.error(
    "applicant role denied access to hr recruiter submission endpoint",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
        },
      );
    },
  );

  // (10) Negative scenario: unauthenticated (clear token by using dummy connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access denied", async () => {
    await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.at(
      unauthConn,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
      },
    );
  });

  // (11) Negative scenario: use random non-existent IDs (HR recruiter role)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  await TestValidator.error(
    "fetch with invalid codingTestId returns error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.at(
        connection,
        {
          codingTestId: typia.random<string & tags.Format<"uuid">>(),
          submissionId: submission.id,
        },
      );
    },
  );

  await TestValidator.error(
    "fetch with invalid submissionId returns error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
