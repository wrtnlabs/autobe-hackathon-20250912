import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for applicant coding test submission workflow.
 *
 * Validates:
 *
 * 1. Applicant registration and login
 * 2. HR recruiter registration and login
 * 3. Applicant applies to a job posting
 * 4. HR assigns a coding test to applicant's application
 * 5. Applicant submits coding test answer successfully (happy path)
 * 6. Duplicate submission for the same coding test (should fail)
 * 7. Submission when not authenticated (should fail)
 * 8. Submission to a non-existent coding test (should fail)
 *
 * Covers proper role switching, full flow, and major edge/error cases.
 */
export async function test_api_coding_test_submission_applicant_flow(
  connection: api.IConnection,
) {
  // 1. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
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

  // 2. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrName = RandomGenerator.name();
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: hrName,
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 3. Switch to applicant, login applicant
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 4. Applicant applies for a job posting (simulate posted job with random UUID)
  const jobPostingId = typia.random<string & tags.Format<"uuid">>();
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPostingId,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 5. Switch to HR recruiter, login HR
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 6. HR assigns coding test to application/applicant
  const nowSec = Date.now();
  const scheduledAt = new Date(nowSec + 60 * 60 * 1000).toISOString(); // 1 hour later
  const codingTest: IAtsRecruitmentCodingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: "internal",
          scheduled_at: scheduledAt,
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 7. Switch back to applicant and login
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 8. Applicant submits coding test answer (main happy path)
  const answerText = RandomGenerator.paragraph({ sentences: 10 });
  const submissionTime = new Date(Date.now()).toISOString();
  const submissionBody = {
    ats_recruitment_coding_test_id: codingTest.id,
    ats_recruitment_application_id: application.id,
    submitted_at: submissionTime,
    answer_text: answerText,
    status: "pending",
    review_status: "pending",
  } satisfies IAtsRecruitmentCodingTestSubmission.ICreate;
  const submission: IAtsRecruitmentCodingTestSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: submissionBody,
      },
    );
  typia.assert(submission);
  TestValidator.equals(
    "submission answer_text matches",
    submission.answer_text,
    answerText,
  );
  TestValidator.equals(
    "submission applicant id matches",
    submission.ats_recruitment_applicant_id,
    applicant.id,
  );
  TestValidator.equals(
    "submission coding test id matches",
    submission.ats_recruitment_coding_test_id,
    codingTest.id,
  );
  TestValidator.equals(
    "submission application id matches",
    submission.ats_recruitment_application_id,
    application.id,
  );
  TestValidator.equals("status is 'pending'", submission.status, "pending");
  TestValidator.equals(
    "review_status is 'pending'",
    submission.review_status,
    "pending",
  );

  // 9. Applicant attempts to submit again for same coding test (should be denied)
  await TestValidator.error("duplicate submission should fail", async () => {
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: submissionBody,
      },
    );
  });

  // 10. Attempt to submit when not logged in (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated submission should fail",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
        unauthConn,
        {
          codingTestId: codingTest.id,
          body: submissionBody,
        },
      );
    },
  );

  // 11. Attempt to submit for non-existent coding test (should fail)
  await TestValidator.error(
    "non-existent codingTestId should fail",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
        connection,
        {
          codingTestId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            ...submissionBody,
            ats_recruitment_coding_test_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );
}
