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
 * E2E test function for updating HR recruiter application feedback (both
 * success and failure cases) in the ATS platform.
 *
 * This test simulates the complete workflow for updating job application
 * feedback as an HR recruiter, as well as negative cases such as invalid
 * data and non-owner access.
 *
 * Steps:
 *
 * 1. Register HR recruiter and authenticate.
 * 2. Register applicant and authenticate.
 * 3. Create job posting dependencies: employment type, posting state.
 * 4. HR recruiter creates a job posting.
 * 5. Applicant logs in, creates a resume, and submits an application to the
 *    job posting.
 * 6. HR recruiter logs back in and creates feedback for the application.
 * 7. Recruiter updates the feedback (feedback_body and rating) via the
 *    endpoint under test — expect success and verify persistency.
 * 8. Negative test: Try to update with invalid data (empty string for
 *    feedback_body) and expect error.
 * 9. Negative test: Attempt feedback update as a different recruiter
 *    (non-owner) and expect error.
 * 10. Negative test: Attempt to update a non-existent feedbackId — expect
 *     error.
 * 11. Validate that proper errors are returned for all failure scenarios.
 */
export async function test_api_hr_feedback_update_success_and_failure(
  connection: api.IConnection,
) {
  // 1. HR Recruiter registration and authentication
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(10);
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.pick(["HR", "Tech", "Sales"] as const),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter);

  // 2. Applicant registration and authentication
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 3. Create employment type and posting state
  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: "Full-Time",
          description: "Full-time permanent employment",
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  const postingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: "open",
          label: "Open",
          description: "Open for application",
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // 4. HR recruiter creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          location: RandomGenerator.pick([
            "Seoul",
            "Remote",
            "Pangyo",
          ] as const),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 5. Applicant logs in and creates a resume
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // 6. Applicant submits an application to the job posting
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

  // 7. HR recruiter logs back in and creates feedback
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const feedback =
    await api.functional.atsRecruitment.hrRecruiter.applications.feedback.create(
      connection,
      {
        applicationId: application.id,
        body: {
          feedback_body: RandomGenerator.paragraph({ sentences: 4 }),
          rating: 4,
          is_final_recommendation: false,
        } satisfies IAtsRecruitmentApplicationFeedback.ICreate,
      },
    );
  typia.assert(feedback);

  // 8. SUCCESS: HR recruiter updates feedback (feedback_body, rating)
  const updatedBody = {
    feedback_body: RandomGenerator.paragraph({ sentences: 2 }),
    rating: 5,
    is_final_recommendation: true,
  } satisfies IAtsRecruitmentApplicationFeedback.IUpdate;
  const updated =
    await api.functional.atsRecruitment.hrRecruiter.applications.feedback.update(
      connection,
      {
        applicationId: application.id,
        feedbackId: feedback.id,
        body: updatedBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated feedback id matches", updated.id, feedback.id);
  TestValidator.equals(
    "updated application id matches",
    updated.application_id,
    application.id,
  );
  TestValidator.equals(
    "feedback body updated",
    updated.feedback_body,
    updatedBody.feedback_body,
  );
  TestValidator.equals("rating updated", updated.rating, updatedBody.rating);
  TestValidator.equals(
    "is_final_recommendation updated",
    updated.is_final_recommendation,
    updatedBody.is_final_recommendation,
  );

  // 9. FAILURE: Try to update with invalid data (empty string for feedback_body)
  await TestValidator.error(
    "should fail on empty feedback_body (bad request)",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.update(
        connection,
        {
          applicationId: application.id,
          feedbackId: feedback.id,
          body: {
            feedback_body: "",
            rating: 5,
            is_final_recommendation: true,
          } satisfies IAtsRecruitmentApplicationFeedback.IUpdate,
        },
      );
    },
  );

  // 10. FAILURE: Attempt feedback update as a different recruiter (non-owner)
  const otherRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const otherRecruiterPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: otherRecruiterEmail,
      password: otherRecruiterPassword,
      name: RandomGenerator.name(),
      department: "IR", // arbitrary
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: otherRecruiterEmail,
      password: otherRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "only the creator can update feedback (authorization failure)",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.update(
        connection,
        {
          applicationId: application.id,
          feedbackId: feedback.id,
          body: {
            feedback_body: RandomGenerator.paragraph({ sentences: 1 }),
            rating: 1,
          } satisfies IAtsRecruitmentApplicationFeedback.IUpdate,
        },
      );
    },
  );

  // 11. FAILURE: Attempt to update a non-existent feedbackId
  const nonExistentFeedbackId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail updating non-existent feedbackId",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.update(
        connection,
        {
          applicationId: application.id,
          feedbackId: nonExistentFeedbackId,
          body: {
            feedback_body: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IAtsRecruitmentApplicationFeedback.IUpdate,
        },
      );
    },
  );
}
