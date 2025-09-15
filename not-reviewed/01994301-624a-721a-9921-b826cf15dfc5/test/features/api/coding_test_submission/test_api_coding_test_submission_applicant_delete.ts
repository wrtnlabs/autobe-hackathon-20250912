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
 * Validate the soft deletion (erase) of a coding test submission by the owner
 * applicant before review phase locks the record.
 *
 * 1. Register HR recruiter and applicant, and log in as necessary for system role
 *    switching.
 * 2. Applicant applies to a randomly generated job posting (simulated by random
 *    uuid).
 * 3. HR recruiter logs in, assigns a coding test to the applicant → sets up
 *    necessary relationship links.
 * 4. Switch to applicant, submit a coding test solution (answer_text only).
 * 5. Perform soft deletion as the owner applicant before it is reviewed; expect
 *    success with no error.
 * 6. Try to delete the record after it enters review phase: update business state
 *    in a simulated setup, attempt erase and expect error.
 * 7. Try to delete a non-owned submission as a different applicant; expect error.
 * 8. Try to erase with random, non-existent submissionId; expect error.
 */
export async function test_api_coding_test_submission_applicant_delete(
  connection: api.IConnection,
) {
  // 1. HR recruiter registration and login
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrJoin);
  const hrId = hrJoin.id;

  // 2. Applicant registration and login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantJoin = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantJoin);
  const applicantId = applicantJoin.id;

  // 3. Applicant applies to a job posting (simulate job post uuid)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const jobPostingId = typia.random<string & tags.Format<"uuid">>();
  const app = await api.functional.atsRecruitment.applicant.applications.create(
    connection,
    {
      body: {
        job_posting_id: jobPostingId,
      } satisfies IAtsRecruitmentApplication.ICreate,
    },
  );
  typia.assert(app);

  // 4. HR assigns coding test to applicant's application
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: app.id,
          ats_recruitment_applicant_id: applicantId,
          ats_recruitment_hrrecruiter_id: hrId,
          test_provider: "internal",
          scheduled_at: new Date().toISOString(),
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 5. Applicant submits a coding test answer
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const submissionBody = {
    ats_recruitment_coding_test_id: codingTest.id,
    ats_recruitment_application_id: app.id,
    submitted_at: new Date().toISOString(),
    answer_text: RandomGenerator.paragraph({ sentences: 6 }),
    status: "pending",
    review_status: "pending",
  } satisfies IAtsRecruitmentCodingTestSubmission.ICreate;
  const submission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: submissionBody,
      },
    );
  typia.assert(submission);

  // 6. Applicant deletes submission before review (should succeed)
  await api.functional.atsRecruitment.applicant.codingTests.submissions.erase(
    connection,
    {
      codingTestId: codingTest.id,
      submissionId: submission.id,
    },
  );
  TestValidator.predicate("erase succeeded with no error", true);

  // 7. Applicant attempts to delete again (should error - already deleted)
  await TestValidator.error(
    "cannot erase submission after deletion",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.submissions.erase(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
        },
      );
    },
  );

  // 8. HR recruiter assigns another coding test and applicant submits/HR reviews it (simulate review)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const codingTest2 =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: app.id,
          ats_recruitment_applicant_id: applicantId,
          ats_recruitment_hrrecruiter_id: hrId,
          test_provider: "internal",
          scheduled_at: new Date().toISOString(),
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest2);
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const reviewedSubmissionBody = {
    ats_recruitment_coding_test_id: codingTest2.id,
    ats_recruitment_application_id: app.id,
    submitted_at: new Date().toISOString(),
    answer_text: RandomGenerator.paragraph({ sentences: 6 }),
    status: "pending",
    review_status: "reviewed",
    reviewed_at: new Date().toISOString(),
    review_comment_summary: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentCodingTestSubmission.ICreate;
  const reviewedSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest2.id,
        body: reviewedSubmissionBody,
      },
    );
  typia.assert(reviewedSubmission);
  // attempt erase after review - should fail
  await TestValidator.error(
    "cannot erase submission after review",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.submissions.erase(
        connection,
        {
          codingTestId: codingTest2.id,
          submissionId: reviewedSubmission.id,
        },
      );
    },
  );

  // 9. Register second applicant, attempt cross-ownership deletion
  const applicant2Email = typia.random<string & tags.Format<"email">>();
  const applicant2Password = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicant2Email,
      password: applicant2Password,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicant2Email,
      password: applicant2Password,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error("cannot delete submission not owned", async () => {
    await api.functional.atsRecruitment.applicant.codingTests.submissions.erase(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
      },
    );
  });

  // 10. Attempt to delete submission using non-existent submissionId
  await TestValidator.error(
    "cannot erase non-existent submission",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.submissions.erase(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
