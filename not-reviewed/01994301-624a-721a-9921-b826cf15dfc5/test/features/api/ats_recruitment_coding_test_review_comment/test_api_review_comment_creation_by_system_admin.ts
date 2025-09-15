import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test for system administrator submitting a code review comment
 * on a coding test submission.
 *
 * The workflow:
 *
 * 1. Register and login as HR recruiter, applicant, and system admin
 * 2. HR recruiter creates a coding test assigned to the applicant
 * 3. Applicant submits a coding test submission
 * 4. System admin posts a review comment for the submission (success case)
 * 5. Validate returned review comment: correct author (system admin tech
 *    reviewer), submission linkage, timestamps, content echo
 * 6. Failure: try to comment on non-existent submissionId/codingTestId
 * 7. Failure: post as non-admin (e.g., as applicant or recruiter)
 * 8. Confirm creation cannot succeed with unauthorized or insufficient
 *    permission
 */
export async function test_api_review_comment_creation_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: false,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(systemAdmin);
  // Additional admin login is unnecessary unless explicitly switching roles mid-test.

  // 2. Register and login as HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 3. Register and login as applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // HR recruiter login (ensure next action is performed as recruiter)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 4. Create a coding test for the applicant
  const codingTestBody = {
    ats_recruitment_application_id: typia.random<
      string & tags.Format<"uuid">
    >(), // Simulated application
    ats_recruitment_applicant_id: applicant.id,
    ats_recruitment_hrrecruiter_id: hrRecruiter.id,
    test_provider: RandomGenerator.pick([
      "internal",
      "programmers",
      "codesignal",
    ] as const),
    scheduled_at: new Date().toISOString(),
    status: RandomGenerator.pick(["scheduled", "delivered"] as const),
  } satisfies IAtsRecruitmentCodingTest.ICreate;
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      { body: codingTestBody },
    );
  typia.assert(codingTest);

  // Applicant login for submission
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 5. Create a submission to the coding test
  const submissionBody = {
    ats_recruitment_coding_test_id: codingTest.id,
    ats_recruitment_application_id: codingTest.ats_recruitment_application_id,
    submitted_at: new Date().toISOString(),
    answer_text: RandomGenerator.content({ paragraphs: 2 }),
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

  // Switch back to system admin for review comment creation
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 6. Create a review comment (success)
  const now = new Date();
  const commentBody = {
    ats_recruitment_coding_test_submission_id: submission.id,
    ats_recruitment_techreviewer_id: systemAdmin.id, // For admin, assume admin is also valid tech reviewer id in this flow
    comment_text: RandomGenerator.paragraph({ sentences: 5 }),
    comment_type: RandomGenerator.pick(["manual", "system"] as const),
    started_at: new Date(now.getTime() - 300000).toISOString(),
    commented_at: now.toISOString(),
  } satisfies IAtsRecruitmentCodingTestReviewComment.ICreate;
  const reviewComment =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: commentBody,
      },
    );
  typia.assert(reviewComment);
  TestValidator.equals(
    "review comment author",
    reviewComment.ats_recruitment_techreviewer_id,
    systemAdmin.id,
  );
  TestValidator.equals(
    "review comment submission linkage",
    reviewComment.ats_recruitment_coding_test_submission_id,
    submission.id,
  );
  TestValidator.equals(
    "comment text matches",
    reviewComment.comment_text,
    commentBody.comment_text,
  );
  TestValidator.equals(
    "comment type matches",
    reviewComment.comment_type,
    commentBody.comment_type,
  );

  // 7. Error: Non-existent submissionId/codingTestId
  await TestValidator.error("non-existent submissionId fails", async () => {
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId: typia.random<string & tags.Format<"uuid">>(), // Intentionally not existing
        submissionId: typia.random<string & tags.Format<"uuid">>(), // Intentionally not existing
        body: commentBody,
      },
    );
  });

  // 8. Error: Permissions - applicant attempts to post admin review comment
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant cannot create admin review comment",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.create(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          body: commentBody,
        },
      );
    },
  );
  // HR recruiter also not allowed
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "hr recruiter cannot create admin review comment",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.create(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          body: commentBody,
        },
      );
    },
  );
}
