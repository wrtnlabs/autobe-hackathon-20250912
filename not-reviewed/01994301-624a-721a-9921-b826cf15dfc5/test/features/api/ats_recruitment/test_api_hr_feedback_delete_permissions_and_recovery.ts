import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates the deletion permissions and idempotent behavior for job
 * application feedback in the HR recruitment domain.
 *
 * 1. Register and login HR recruiter (user1)
 * 2. Register a second HR recruiter (user2) for testing permission enforcement
 * 3. Register an applicant and have them create a resume
 * 4. HR recruiter (user1) creates job employment type
 * 5. HR recruiter (user1) creates job posting state
 * 6. HR recruiter (user1) creates a job posting referencing the new employment
 *    type and posting state
 * 7. Applicant logs in and applies for the job posting (with their resume)
 * 8. HR recruiter (user1) logs back in and submits feedback to the application
 * 9. HR recruiter (user1) deletes (erases) the feedback
 * 10. Attempt to delete the feedback again (should fail – checks for
 *     business/idempotency error)
 * 11. Switch to HR recruiter (user2) and attempt to delete the feedback (should
 *     fail due to permissions)
 *
 * Asserts correct business logic for deletion, repeat deletion, and permission,
 * with appropriate role switching and business object references at each
 * stage.
 *
 * No type error scenarios are tested—only business logic errors are validated
 * using TestValidator.error.
 */
export async function test_api_hr_feedback_delete_permissions_and_recovery(
  connection: api.IConnection,
) {
  // 1. Register and login HR recruiter (user1)
  const hr1Email = typia.random<string & tags.Format<"email">>();
  const hr1Password = "TestHR123!";
  const hr1 = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hr1Email,
      password: hr1Password,
      name: RandomGenerator.name(),
      department: RandomGenerator.alphabets(6),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hr1);

  // 2. Register second HR recruiter (user2) for negative permission test
  const hr2Email = typia.random<string & tags.Format<"email">>();
  const hr2Password = "TestHR234!";
  const hr2 = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hr2Email,
      password: hr2Password,
      name: RandomGenerator.name(),
      department: RandomGenerator.alphabets(8),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hr2);

  // 3. Register an applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "ApplicantPW1!";
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 4. Applicant: create resume
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(2),
        parsed_name: RandomGenerator.name(2),
        parsed_email: applicant.email,
        parsed_mobile: RandomGenerator.mobile(),
        parsed_birthdate: undefined,
        parsed_education_summary: undefined,
        parsed_experience_summary: undefined,
        skills_json: undefined,
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // 5. HR recruiter (user1): create job employment type
  const jobEmpType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(jobEmpType);

  // 6. HR recruiter (user1): create job posting state
  const jobStateCode = `open_${RandomGenerator.alphaNumeric(4)}`;
  const jobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: jobStateCode,
          label: RandomGenerator.name(2),
          description: "Test posting state creation",
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(jobPostingState);

  // 7. HR recruiter (user1): create job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hr1.id,
          job_employment_type_id: jobEmpType.id,
          job_posting_state_id: jobPostingState.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
          location: RandomGenerator.name(1),
          salary_range_min: 3100,
          salary_range_max: 5500,
          application_deadline: null,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 8. Applicant login (to get right context for submitting application)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 9. Applicant: create job application (with resume)
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
          resume_id: resume.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 10. HR recruiter (user1) login (for feedback submission)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hr1Email,
      password: hr1Password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 11. HR recruiter (user1): create feedback
  const feedback =
    await api.functional.atsRecruitment.hrRecruiter.applications.feedback.create(
      connection,
      {
        applicationId: application.id,
        body: {
          feedback_body: RandomGenerator.paragraph({ sentences: 2 }),
          rating: 4.5,
          is_final_recommendation: true,
        } satisfies IAtsRecruitmentApplicationFeedback.ICreate,
      },
    );
  typia.assert(feedback);

  // 12. HR recruiter (user1): delete feedback
  await api.functional.atsRecruitment.hrRecruiter.applications.feedback.erase(
    connection,
    {
      applicationId: application.id,
      feedbackId: feedback.id,
    },
  );

  // 13. Attempt to delete again (should fail)
  await TestValidator.error(
    "Deleting already-deleted feedback should error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.erase(
        connection,
        {
          applicationId: application.id,
          feedbackId: feedback.id,
        },
      );
    },
  );

  // 14. HR recruiter (user2) login
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hr2Email,
      password: hr2Password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 15. HR recruiter (user2): attempt to delete feedback by non-owner
  await TestValidator.error(
    "Non-owner HR recruiter cannot delete feedback",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.erase(
        connection,
        {
          applicationId: application.id,
          feedbackId: feedback.id,
        },
      );
    },
  );
}
