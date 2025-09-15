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
 * Technical reviewer audits/reviews feedback detail.
 *
 * 1. Register (join) tech reviewer and log in, save credentials.
 * 2. Register HR recruiter and create a job posting.
 * 3. Register applicant and apply for job (producing applicationId).
 * 4. Tech reviewer creates feedback for application.
 * 5. Tech reviewer fetches feedback detail by feedbackId (should succeed, match
 *    all content).
 * 6. Try GET feedback with a random (nonexistent) feedbackId (should error).
 * 7. Register new tech reviewer, log in as them, and try to access other's
 *    feedback (should error/forbidden if authz enforced).
 * 8. Log in as applicant, try to access feedback (should error).
 */
export async function test_api_feedback_detail_view_by_tech_reviewer(
  connection: api.IConnection,
) {
  // 1. Register tech reviewer.
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphabets(10);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(techReviewer);

  // 2. HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphabets(10);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(hrRecruiter);

  // HR login for context safety (if needed)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });

  // 3. HR creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          location: RandomGenerator.paragraph({ sentences: 1 }),
          salary_range_min: 40000,
          salary_range_max: 80000,
          application_deadline: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_visible: true,
        },
      },
    );
  typia.assert(jobPosting);

  // 4. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphabets(10);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(applicant);

  // Applicant login for context safety (if needed)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });

  // 5. Applicant applies for job
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
          resume_id: undefined,
        },
      },
    );
  typia.assert(application);

  // 6. Tech reviewer login for proper context
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    },
  });

  // 7. Tech reviewer creates feedback
  const feedbackCreate =
    await api.functional.atsRecruitment.techReviewer.applications.feedback.create(
      connection,
      {
        applicationId: application.id,
        body: {
          feedback_body: RandomGenerator.paragraph({ sentences: 3 }),
          rating: 5,
          is_final_recommendation: true,
        },
      },
    );
  typia.assert(feedbackCreate);

  // 8. Tech reviewer fetches feedback detail (should succeed)
  const feedback =
    await api.functional.atsRecruitment.techReviewer.applications.feedback.at(
      connection,
      {
        applicationId: application.id,
        feedbackId: feedbackCreate.id,
      },
    );
  typia.assert(feedback);
  TestValidator.equals("feedback id matches", feedback.id, feedbackCreate.id);
  TestValidator.equals(
    "application id matches",
    feedback.application_id,
    application.id,
  );
  TestValidator.equals(
    "reviewer id matches",
    feedback.reviewer_id,
    techReviewer.id,
  );
  TestValidator.equals(
    "feedback body matches",
    feedback.feedback_body,
    feedbackCreate.feedback_body,
  );
  TestValidator.equals(
    "rating matches",
    feedback.rating,
    feedbackCreate.rating,
  );
  TestValidator.equals(
    "is_final_recommendation matches",
    feedback.is_final_recommendation,
    feedbackCreate.is_final_recommendation,
  );

  // 9. Try GET feedback with random non-existent feedbackId (should fail)
  await TestValidator.error("get non-existent feedback fails", async () => {
    await api.functional.atsRecruitment.techReviewer.applications.feedback.at(
      connection,
      {
        applicationId: application.id,
        feedbackId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 10. Register new tech reviewer, log in as them
  const otherReviewerEmail = typia.random<string & tags.Format<"email">>();
  const otherReviewerPassword = RandomGenerator.alphabets(10);
  const otherTechReviewer = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: otherReviewerEmail,
        password: otherReviewerPassword,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(otherTechReviewer);

  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: otherReviewerEmail,
      password: otherReviewerPassword,
    },
  });

  // 11. Unrelated tech reviewer tries to access feedback (should be forbidden)
  await TestValidator.error(
    "only feedback author can access feedback",
    async () => {
      await api.functional.atsRecruitment.techReviewer.applications.feedback.at(
        connection,
        {
          applicationId: application.id,
          feedbackId: feedbackCreate.id,
        },
      );
    },
  );

  // 12. Applicant tries to access feedback (should be forbidden)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  await TestValidator.error("applicant cannot access feedback", async () => {
    await api.functional.atsRecruitment.techReviewer.applications.feedback.at(
      connection,
      {
        applicationId: application.id,
        feedbackId: feedbackCreate.id,
      },
    );
  });
}
