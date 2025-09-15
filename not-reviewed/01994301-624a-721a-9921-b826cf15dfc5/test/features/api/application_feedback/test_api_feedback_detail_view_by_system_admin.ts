import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * This test validates that a system administrator can view specific feedback
 * details for a job application by ID, as part of compliance or investigative
 * auditing. The test simulates a realistic multi-actor workflow: (1) Register
 * system admin. (2) HR recruiter joins. (3) Applicant joins. (4) Tech reviewer
 * joins. (5) HR recruiter posts a job. (6) Applicant applies to the job,
 * capturing applicationId. (7) Tech reviewer logs in, posts feedback for the
 * application, recording feedbackId. (8) System admin logs in, views the
 * feedback detail for that application/feedback pair using the GET API. The
 * test validates that the admin receives all expected feedback fields (ID,
 * applicationId, reviewerId, feedback_body, rating, is_final_recommendation,
 * created_at) and that they match the submitted data. Edge cases include
 * attempting to retrieve with unrelated or nonexistent IDs, confirming proper
 * error handling and authorization enforcement (not implemented in this E2E but
 * marked for manual checks). Data generation uses realistic random values with
 * correct typing. The workflow models the strictest real-world permissions,
 * ensuring only system admins can view all feedback details regardless of
 * reviewer origin.
 */
export async function test_api_feedback_detail_view_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 3. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 4. Register technical reviewer
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techPassword = RandomGenerator.alphaNumeric(12);
  const techReviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: techEmail,
        password: techPassword,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    });
  typia.assert(techReviewer);

  // 5. HR recruiter creates job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // Create required reference IDs for job posting
  const employmentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postingStateId = typia.random<string & tags.Format<"uuid">>();
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: employmentTypeId,
          job_posting_state_id: postingStateId,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          location: RandomGenerator.name(1),
          salary_range_min: 50000,
          salary_range_max: 100000,
          application_deadline: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 6. Applicant applies to the job
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 7. Tech reviewer writes feedback
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techEmail,
      password: techPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  const createFeedback = {
    feedback_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    rating: 4.5,
    is_final_recommendation: true,
  } satisfies IAtsRecruitmentApplicationFeedback.ICreate;
  const feedback: IAtsRecruitmentApplicationFeedback =
    await api.functional.atsRecruitment.techReviewer.applications.feedback.create(
      connection,
      {
        applicationId: application.id,
        body: createFeedback,
      },
    );
  typia.assert(feedback);

  // 8. System admin logs in and views feedback by ID
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  const feedbackDetail: IAtsRecruitmentApplicationFeedback =
    await api.functional.atsRecruitment.systemAdmin.applications.feedback.at(
      connection,
      {
        applicationId: application.id,
        feedbackId: feedback.id,
      },
    );
  typia.assert(feedbackDetail);
  TestValidator.equals("feedback.id matches", feedbackDetail.id, feedback.id);
  TestValidator.equals(
    "feedback.applicationId matches",
    feedbackDetail.application_id,
    application.id,
  );
  TestValidator.equals(
    "feedback.reviewerId matches",
    feedbackDetail.reviewer_id,
    feedback.reviewer_id,
  );
  TestValidator.equals(
    "feedback_body matches",
    feedbackDetail.feedback_body,
    createFeedback.feedback_body,
  );
  TestValidator.equals(
    "rating matches",
    feedbackDetail.rating,
    createFeedback.rating,
  );
  TestValidator.equals(
    "is_final_recommendation matches",
    feedbackDetail.is_final_recommendation,
    createFeedback.is_final_recommendation,
  );
  TestValidator.predicate(
    "feedback.created_at is present",
    typeof feedbackDetail.created_at === "string" &&
      feedbackDetail.created_at.length > 0,
  );

  // Edge: Nonexistent feedbackId should error
  await TestValidator.error(
    "fetch nonexistent feedback should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applications.feedback.at(
        connection,
        {
          applicationId: application.id,
          feedbackId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
