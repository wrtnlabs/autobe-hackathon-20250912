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
 * E2E: Applicant can update their coding test submission before review, but not
 * after, and cannot update submissions owned by others.
 *
 * 1. HR recruiter registers and logs in.
 * 2. Applicant (A) registers and logs in.
 * 3. Applicant A applies for a job posting.
 * 4. HR assigns a coding test to A's application.
 * 5. Applicant A submits a coding test solution (initial submission).
 * 6. Applicant A updates their submission (before review).
 *
 *    - Validates that submission is updated (text/status).
 * 7. Applicant A attempts to update after review_status is set to 'reviewed'
 *    (should fail).
 * 8. Another applicant (B) attempts to update A's submission (should fail).
 */
export async function test_api_coding_test_submission_applicant_update(
  connection: api.IConnection,
) {
  // 1. HR recruiter registration and login
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hr: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(hr);

  // 2. Applicant A registration and login
  const applicantAEmail = typia.random<string & tags.Format<"email">>();
  const applicantAPassword = RandomGenerator.alphaNumeric(10);
  const applicantA: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantAEmail,
        password: applicantAPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(applicantA);

  // 3. Applicant A applies for a job posting
  const job_posting_id = typia.random<string & tags.Format<"uuid">>();
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id,
        },
      },
    );
  typia.assert(application);

  // 4. HR recruiter logs in as themselves
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });

  // HR recruiter assigns a coding test to applicant A
  const codingTest: IAtsRecruitmentCodingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicantA.id,
          ats_recruitment_hrrecruiter_id: hr.id,
          test_provider: "internal",
          scheduled_at: new Date(Date.now() + 60 * 1000).toISOString(),
          status: "scheduled",
        },
      },
    );
  typia.assert(codingTest);

  // 5. Applicant A logs in
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantAEmail,
      password: applicantAPassword,
    },
  });

  // Applicant A submits initial coding test submission
  const initialSubmission: IAtsRecruitmentCodingTestSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: application.id,
          submitted_at: new Date().toISOString(),
          answer_file_url: null,
          answer_text: "console.log('hello world')",
          status: "pending",
          review_status: "pending",
        },
      },
    );
  typia.assert(initialSubmission);

  // 6. Applicant A updates their submission before review
  const updateBody = {
    answer_text: "console.log('updated answer')",
    status: "pending",
  } satisfies IAtsRecruitmentCodingTestSubmission.IUpdate;
  const updatedSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.update(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: initialSubmission.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSubmission);
  TestValidator.equals(
    "submission updated",
    updatedSubmission.answer_text,
    updateBody.answer_text,
  );
  TestValidator.equals(
    "submission status unchanged",
    updatedSubmission.status,
    updateBody.status,
  );

  // 7. After review: attempt to update after review_status is set to 'reviewed'
  const patchReviewStatus = {
    review_status: "reviewed",
  } satisfies IAtsRecruitmentCodingTestSubmission.IUpdate;
  await api.functional.atsRecruitment.applicant.codingTests.submissions.update(
    connection,
    {
      codingTestId: codingTest.id,
      submissionId: initialSubmission.id,
      body: patchReviewStatus,
    },
  );
  await TestValidator.error(
    "cannot update after review_status reviewed",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.submissions.update(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: initialSubmission.id,
          body: {
            answer_text: "new answer after review",
          },
        },
      );
    },
  );

  // 8. Another applicant attempts to update A's submission
  const applicantBEmail = typia.random<string & tags.Format<"email">>();
  const applicantBPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantBEmail,
      password: applicantBPassword,
      name: RandomGenerator.name(),
    },
  });
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantBEmail,
      password: applicantBPassword,
    },
  });
  await TestValidator.error(
    "other applicant cannot update submission",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.submissions.update(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: initialSubmission.id,
          body: {
            answer_text: "hacked by another applicant",
          },
        },
      );
    },
  );
}
