import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates system admin's access to coding test submission review comments for
 * audit/compliance.
 *
 * Steps:
 *
 * 1. Register system admin, HR recruiter, applicant, tech reviewer
 * 2. HR creates a job posting (system-IDs for employment type and posting state
 *    are randomly generated)
 * 3. (Mock a codingTestId and applicationId for submission, since no linking APIs
 *    exist)
 * 4. Applicant creates a submission
 * 5. Tech reviewer creates a review comment for this submission
 * 6. System admin fetches the review comment and verifies all major fields
 * 7. Attempt to fetch with fake reviewCommentId or unrelated
 *    codingTestId/submissionId and confirm error thrown
 */
export async function test_api_system_admin_coding_test_review_comment_access(
  connection: api.IConnection,
) {
  // 1. Register all actors
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPass = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
      name: RandomGenerator.name(),
      super_admin: true,
    },
  });
  typia.assert(admin);

  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPass = RandomGenerator.alphaNumeric(12);
  const hr = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPass,
      name: RandomGenerator.name(),
    },
  });
  typia.assert(hr);

  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPass = RandomGenerator.alphaNumeric(16);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPass,
      name: RandomGenerator.name(),
    },
  });
  typia.assert(applicant);

  const techEmail = typia.random<string & tags.Format<"email">>();
  const techPass = RandomGenerator.alphaNumeric(16);
  const tech = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techEmail,
      password: techPass,
      name: RandomGenerator.name(),
    },
  });
  typia.assert(tech);

  // 2. HR creates job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPass,
    },
  });
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hr.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
        },
      },
    );
  typia.assert(jobPosting);

  // 3. Mock codingTestId and applicationId as random uuid
  const codingTestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const applicationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Applicant creates a submission
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPass,
    },
  });
  const submission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId,
        body: {
          ats_recruitment_coding_test_id: codingTestId,
          ats_recruitment_application_id: applicationId,
          submitted_at: new Date().toISOString(),
          answer_text: RandomGenerator.paragraph({ sentences: 6 }),
          status: "pending",
          review_status: "pending",
        },
      },
    );
  typia.assert(submission);

  // 5. Tech reviewer creates review comment
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techEmail,
      password: techPass,
    },
  });
  const reviewComment =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId,
        submissionId: submission.id,
        body: {
          ats_recruitment_coding_test_submission_id: submission.id,
          ats_recruitment_techreviewer_id: tech.id,
          comment_text: RandomGenerator.paragraph({ sentences: 4 }),
          comment_type: "manual",
          started_at: new Date().toISOString(),
          commented_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(reviewComment);

  // 6. System admin fetches review comment by ID
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
    },
  });
  const fetched =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.at(
      connection,
      {
        codingTestId,
        submissionId: submission.id,
        reviewCommentId: reviewComment.id,
      },
    );
  typia.assert(fetched);
  // Major field match
  TestValidator.equals(
    "review comment ID matches",
    fetched.id,
    reviewComment.id,
  );
  TestValidator.equals(
    "comment text matches",
    fetched.comment_text,
    reviewComment.comment_text,
  );
  TestValidator.equals(
    "tech reviewer ID matches",
    fetched.ats_recruitment_techreviewer_id,
    tech.id,
  );

  // 7. Negative: fetch with invalid reviewCommentId
  const fakeReviewCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "fetching non-existent reviewCommentId fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.at(
        connection,
        {
          codingTestId,
          submissionId: submission.id,
          reviewCommentId: fakeReviewCommentId,
        },
      );
    },
  );

  // 8. Negative: fetch with wrong submissionId
  const fakeSubmissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "fetching with wrong submissionId fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.at(
        connection,
        {
          codingTestId,
          submissionId: fakeSubmissionId,
          reviewCommentId: reviewComment.id,
        },
      );
    },
  );
  // 9. Negative: wrong codingTestId
  const fakeCodingTestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "fetching with wrong codingTestId fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.at(
        connection,
        {
          codingTestId: fakeCodingTestId,
          submissionId: submission.id,
          reviewCommentId: reviewComment.id,
        },
      );
    },
  );
}
