import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E: Technical reviewer submits a review comment on a coding test submission
 * with full cross-role authentication and business workflow validation.
 *
 * This scenario tests the end-to-end workflow:
 *
 * 1. An HR recruiter is registered and logs in
 * 2. An applicant is registered
 * 3. A technical reviewer is registered
 * 4. The HR recruiter creates a coding test for the applicant
 * 5. The applicant submits a coding test submission
 * 6. The technical reviewer logs in and creates a review comment for the
 *    submission
 *
 * The test validates:
 *
 * - All entity/actor authentication flows
 * - Proper linking of applicant, submission, reviewer, and coding test
 * - That review comment creation succeeds and the output matches input data
 *   fields
 * - All DTO and API interfaces are respected
 */
export async function test_api_review_comment_creation_by_tech_reviewer_with_full_auth_flow(
  connection: api.IConnection,
) {
  // --- 1. HR recruiter account setup
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(hrRecruiter);

  // --- 2. Applicant account setup
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(applicant);

  // --- 3. Tech Reviewer account setup
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(techReviewer);

  // --- 4. HR recruiter login & Coding Test creation
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });
  // Simulate application id - required for coding test assignment
  const applicationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationId,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: RandomGenerator.pick([
            "internal",
            "programmers",
            "codesignal",
          ] as const),
          test_external_id: null,
          test_url: null,
          scheduled_at: new Date().toISOString(),
          delivered_at: null,
          status: "scheduled",
          expiration_at: null,
          callback_received_at: null,
          closed_at: null,
        },
      },
    );
  typia.assert(codingTest);

  // --- 5. Applicant login & Submission creation
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  const submission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: applicationId,
          submitted_at: new Date().toISOString(),
          answer_file_url: null,
          answer_text: RandomGenerator.content({ paragraphs: 2 }),
          status: "pending",
          received_external_at: null,
          review_status: "pending",
          reviewed_at: null,
          review_comment_summary: null,
        },
      },
    );
  typia.assert(submission);

  // --- 6. Tech reviewer login
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    },
  });
  // --- 7. Reviewer creates a review comment on the submission
  const now = new Date();
  const commentInput = {
    ats_recruitment_coding_test_submission_id: submission.id,
    ats_recruitment_techreviewer_id: techReviewer.id,
    comment_text: RandomGenerator.content({ paragraphs: 1 }),
    comment_type: RandomGenerator.pick([
      "manual",
      "auto",
      "system",
      "plagiarism_flag",
    ] as const),
    started_at: now.toISOString(),
    commented_at: now.toISOString(),
  };
  const reviewComment =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: commentInput,
      },
    );
  typia.assert(reviewComment);
  TestValidator.equals(
    "review comment text",
    reviewComment.comment_text,
    commentInput.comment_text,
  );
  TestValidator.equals(
    "review comment type",
    reviewComment.comment_type,
    commentInput.comment_type,
  );
  TestValidator.equals(
    "reviewer id matches",
    reviewComment.ats_recruitment_techreviewer_id,
    techReviewer.id,
  );
  TestValidator.equals(
    "submission id matches",
    reviewComment.ats_recruitment_coding_test_submission_id,
    submission.id,
  );
}
