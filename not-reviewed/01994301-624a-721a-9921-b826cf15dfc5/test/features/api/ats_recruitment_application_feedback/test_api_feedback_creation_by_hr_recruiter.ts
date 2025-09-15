import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates the workflow where an HR recruiter provides feedback on a
 * candidate's application.
 *
 * 1. Register an HR recruiter account and login.
 * 2. Register an applicant and login as the applicant.
 * 3. HR recruiter creates a job posting (employing random, but valid, UUIDs for
 *    job_employment_type_id and job_posting_state_id).
 * 4. Applicant applies for the job posting, producing an applicationId.
 * 5. HR recruiter logs back in to submit feedback for the application.
 * 6. Successfully created feedback must be linked to the correct application and
 *    reviewer.
 * 7. Attempting to submit duplicate feedback by the same reviewer must fail.
 * 8. Attempting to create feedback unauthenticated must fail.
 * 9. Attempting to create feedback for an invalid applicationId must fail.
 */
export async function test_api_feedback_creation_by_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const hrEmail: string = typia.random<string & tags.Format<"email">>();
  const hrPassword: string = RandomGenerator.alphaNumeric(12);
  const hrJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrJoin);

  // HR login (to refresh token)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 2. Register applicant
  const applicantEmail: string = typia.random<string & tags.Format<"email">>();
  const applicantPassword: string = RandomGenerator.alphaNumeric(12);
  const applicantJoin = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantJoin);

  // Applicant login
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 3. HR recruiter login again to create job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  const jobPostingCreate =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrJoin.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph({ sentences: 1 }),
          salary_range_min: 30000,
          salary_range_max: 50000,
          application_deadline: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPostingCreate);

  // 4. Switch to applicant and apply for the job
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  const applicationCreate =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPostingCreate.id,
          resume_id: null,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(applicationCreate);

  // 5. Switch back to HR recruiter and submit feedback
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  const feedbackBody = {
    feedback_body: RandomGenerator.paragraph({ sentences: 4 }),
    rating: 4.5,
    is_final_recommendation: true,
  } satisfies IAtsRecruitmentApplicationFeedback.ICreate;

  const feedback =
    await api.functional.atsRecruitment.hrRecruiter.applications.feedback.create(
      connection,
      {
        applicationId: applicationCreate.id,
        body: feedbackBody,
      },
    );
  typia.assert(feedback);
  // Should be linked to correct application and reviewer
  TestValidator.equals(
    "feedback application_id matches",
    feedback.application_id,
    applicationCreate.id,
  );
  TestValidator.equals(
    "feedback reviewer_id matches",
    feedback.reviewer_id,
    hrJoin.id,
  );
  TestValidator.equals(
    "feedback body matches",
    feedback.feedback_body,
    feedbackBody.feedback_body,
  );
  TestValidator.equals(
    "feedback rating matches",
    feedback.rating,
    feedbackBody.rating,
  );
  TestValidator.equals(
    "is_final_recommendation matches",
    feedback.is_final_recommendation,
    feedbackBody.is_final_recommendation,
  );

  // 6. Attempt to submit duplicate feedback (should fail)
  await TestValidator.error(
    "duplicate feedback submission rejected",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.create(
        connection,
        {
          applicationId: applicationCreate.id,
          body: feedbackBody,
        },
      );
    },
  );

  // 7. Attempt to submit feedback unauthenticated (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated feedback submission rejected",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.create(
        unauthConn,
        {
          applicationId: applicationCreate.id,
          body: feedbackBody,
        },
      );
    },
  );

  // 8. Attempt to submit feedback for invalid applicationId (should fail)
  await TestValidator.error(
    "feedback for invalid applicationId rejected",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.create(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
          body: feedbackBody,
        },
      );
    },
  );
}
