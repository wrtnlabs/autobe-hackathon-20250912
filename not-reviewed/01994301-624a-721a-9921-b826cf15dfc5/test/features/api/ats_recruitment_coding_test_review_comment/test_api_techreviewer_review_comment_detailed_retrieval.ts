import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for technical reviewer detailed review comment retrieval in coding
 * test.
 *
 * This test covers the full positive and negative business workflow:
 *
 * 1. Tech Reviewer, HR Recruiter & Applicant accounts are created and context is
 *    switched between each using login/join endpoints.
 * 2. HR recruiter creates a job posting, Applicant uploads a resume & applies, HR
 *    recruiter assigns coding test.
 * 3. Applicant submits a coding test submission; Tech Reviewer creates a review
 *    comment.
 * 4. Tech Reviewer (author) retrieves that comment via detail endpoint, checking
 *    for all fields and business correctness of returned object.
 * 5. Negative checks: another reviewer cannot retrieve, and error is thrown for
 *    non-existent review comment IDs.
 * 6. All business logic, field correspondence, and permission enforcement is
 *    validated.
 */
export async function test_api_techreviewer_review_comment_detailed_retrieval(
  connection: api.IConnection,
) {
  // Register & login Tech Reviewer
  const techReviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewerPassword = RandomGenerator.alphaNumeric(12);
  const techReviewerJoin = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: techReviewerEmail,
        password: techReviewerPassword,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(techReviewerJoin);

  // Register & login HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    },
  });
  typia.assert(hrJoin);
  await api.functional.auth.hrRecruiter.login(connection, {
    body: { email: hrEmail, password: hrPassword },
  });

  // HR creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrJoin.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 6,
            sentenceMax: 12,
          }),
          location: RandomGenerator.paragraph({ sentences: 2 }),
          is_visible: true,
        },
      },
    );
  typia.assert(jobPosting);

  // Applicant registration, login and resume upload
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantJoin = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(applicantJoin);
  await api.functional.auth.applicant.login(connection, {
    body: { email: applicantEmail, password: applicantPassword },
  });
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: { title: RandomGenerator.name(1) },
    },
  );
  typia.assert(resume);

  // Applicant applies to job posting
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
          resume_id: resume.id,
        },
      },
    );
  typia.assert(application);

  // HR login and assign coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: { email: hrEmail, password: hrPassword },
  });
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicantJoin.id,
          ats_recruitment_hrrecruiter_id: hrJoin.id,
          test_provider: "internal",
          scheduled_at: new Date().toISOString(),
          status: "scheduled",
        },
      },
    );
  typia.assert(codingTest);

  // Applicant submits coding test
  await api.functional.auth.applicant.login(connection, {
    body: { email: applicantEmail, password: applicantPassword },
  });
  const now = new Date().toISOString();
  const submission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: application.id,
          submitted_at: now,
          answer_text: RandomGenerator.paragraph({ sentences: 5 }),
          status: "pending",
          review_status: "pending",
        },
      },
    );
  typia.assert(submission);

  // Tech Reviewer logs in, creates review comment
  await api.functional.auth.techReviewer.login(connection, {
    body: { email: techReviewerEmail, password: techReviewerPassword },
  });
  const startedAt = new Date().toISOString();
  const commentedAt = new Date(Date.now() + 10000).toISOString();
  const reviewComment =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: {
          ats_recruitment_coding_test_submission_id: submission.id,
          ats_recruitment_techreviewer_id: techReviewerJoin.id,
          comment_text: RandomGenerator.content({ paragraphs: 1 }),
          comment_type: "manual",
          started_at: startedAt,
          commented_at: commentedAt,
        },
      },
    );
  typia.assert(reviewComment);

  // Positive: Retrieve comment as author (tech reviewer)
  const retrieved =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.at(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        reviewCommentId: reviewComment.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "review comment id matches",
    retrieved.id,
    reviewComment.id,
  );
  TestValidator.equals(
    "submission id matches",
    retrieved.ats_recruitment_coding_test_submission_id,
    submission.id,
  );
  TestValidator.equals(
    "reviewer id matches",
    retrieved.ats_recruitment_techreviewer_id,
    techReviewerJoin.id,
  );
  TestValidator.equals(
    "comment text matches",
    retrieved.comment_text,
    reviewComment.comment_text,
  );
  TestValidator.equals(
    "comment type matches",
    retrieved.comment_type,
    reviewComment.comment_type,
  );
  TestValidator.equals(
    "started_at matches",
    retrieved.started_at,
    reviewComment.started_at,
  );
  TestValidator.equals(
    "commented_at matches",
    retrieved.commented_at,
    reviewComment.commented_at,
  );
  TestValidator.equals("not soft deleted", retrieved.deleted_at, null);

  // Negative: Wrong reviewer role cannot retrieve
  const otherReviewerEmail = typia.random<string & tags.Format<"email">>();
  const otherReviewerPassword = RandomGenerator.alphaNumeric(12);
  const otherReviewer = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: otherReviewerEmail,
        password: otherReviewerPassword,
        name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(otherReviewer);
  await api.functional.auth.techReviewer.login(connection, {
    body: { email: otherReviewerEmail, password: otherReviewerPassword },
  });
  await TestValidator.error(
    "non-author reviewer cannot access detailed comment retrieval",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          reviewCommentId: reviewComment.id,
        },
      );
    },
  );
  // Negative: non-existent review comment id
  await TestValidator.error(
    "accessing non-existent review comment fails",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.at(
        connection,
        {
          codingTestId: typia.random<string & tags.Format<"uuid">>(),
          submissionId: typia.random<string & tags.Format<"uuid">>(),
          reviewCommentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
