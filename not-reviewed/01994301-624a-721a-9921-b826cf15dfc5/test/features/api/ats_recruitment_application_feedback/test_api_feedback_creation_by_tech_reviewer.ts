import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E scenario: A technical reviewer submits feedback for a candidate's
 * application. Steps:
 *
 * 1. Tech reviewer registers.
 * 2. HR recruiter registers and creates a job posting.
 * 3. Applicant registers and applies for job.
 * 4. Tech reviewer creates feedback on application. Success: Feedback created and
 *    associated to correct application, response confirmed. Validation:
 *    Duplicate feedback from same reviewer fails; invalid/unassigned reviewer
 *    or application triggers error.
 */
export async function test_api_feedback_creation_by_tech_reviewer(
  connection: api.IConnection,
) {
  // 1. Register tech reviewer
  const techReviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewerPwd = RandomGenerator.alphaNumeric(12);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPwd,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  // 2. Register HR recruiter and create job posting
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPwd = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // HR job posting creation needs to have valid job_employment_type_id and job_posting_state_id
  // As these are required, we'll use random UUIDs for the purpose of E2E structure test.
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 3. Register applicant and apply for job
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPwd = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPwd,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 4. Tech reviewer logs in (refresh token for feedback creation context)
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPwd,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // Submit feedback
  const feedbackBody = RandomGenerator.content({ paragraphs: 1 });
  const feedbackInput = {
    feedback_body: feedbackBody,
    rating: 4,
    is_final_recommendation: true,
  } satisfies IAtsRecruitmentApplicationFeedback.ICreate;
  const feedback =
    await api.functional.atsRecruitment.techReviewer.applications.feedback.create(
      connection,
      {
        applicationId: application.id,
        body: feedbackInput,
      },
    );
  typia.assert(feedback);
  TestValidator.equals(
    "application_id of feedback matches",
    feedback.application_id,
    application.id,
  );
  TestValidator.equals(
    "feedback_body of feedback matches",
    feedback.feedback_body,
    feedbackBody,
  );

  // 5. Validation: Duplicate feedback fails
  await TestValidator.error(
    "duplicate feedback creation by same reviewer should fail",
    async () => {
      await api.functional.atsRecruitment.techReviewer.applications.feedback.create(
        connection,
        {
          applicationId: application.id,
          body: feedbackInput,
        },
      );
    },
  );

  // 6. Validation: Unassigned tech reviewer submitting feedback fails
  const anotherTechReviewerEmail = typia.random<
    string & tags.Format<"email">
  >();
  const anotherTechReviewerPwd = RandomGenerator.alphaNumeric(12);
  // Register new techReviewer
  const anotherTechReviewer = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: anotherTechReviewerEmail,
        password: anotherTechReviewerPwd,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    },
  );
  typia.assert(anotherTechReviewer);

  // Login as new reviewer
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: anotherTechReviewerEmail,
      password: anotherTechReviewerPwd,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  await TestValidator.error(
    "Duplicate feedback for application by another tech reviewer - should allow one feedback, but fail for duplicate only to same reviewer",
    async () => {
      // First submission should succeed for this reviewer
      const newFeedback =
        await api.functional.atsRecruitment.techReviewer.applications.feedback.create(
          connection,
          {
            applicationId: application.id,
            body: {
              feedback_body: RandomGenerator.content({ paragraphs: 1 }),
              is_final_recommendation: false,
            } satisfies IAtsRecruitmentApplicationFeedback.ICreate,
          },
        );
      typia.assert(newFeedback);
      // Attempt duplicate
      await api.functional.atsRecruitment.techReviewer.applications.feedback.create(
        connection,
        {
          applicationId: application.id,
          body: {
            feedback_body: RandomGenerator.content({ paragraphs: 1 }),
            is_final_recommendation: false,
          } satisfies IAtsRecruitmentApplicationFeedback.ICreate,
        },
      );
    },
  );

  // 7. Validation: Feedback for non-existent application should fail
  await TestValidator.error(
    "tech reviewer cannot create feedback on non-existent application",
    async () => {
      await api.functional.atsRecruitment.techReviewer.applications.feedback.create(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
          body: feedbackInput,
        },
      );
    },
  );
}
