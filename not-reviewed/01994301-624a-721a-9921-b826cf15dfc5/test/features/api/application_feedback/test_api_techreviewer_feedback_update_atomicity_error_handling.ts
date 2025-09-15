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
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates atomic update and error handling for technical reviewer
 * feedback update.
 *
 * Covers:
 *
 * 1. HR recruiter, applicant, and tech reviewer registration/authentication
 * 2. Creation of job employment type/posting state, HR creates job posting
 * 3. Applicant uploads resume, applies to job
 * 4. Tech reviewer creates initial feedback for application
 * 5. Tech reviewer successfully updates feedback via PUT and verifies response
 * 6. Negative: unrelated tech reviewer cannot update the feedback (should
 *    fail)
 * 7. Negative: update attempt with an empty body (should fail business
 *    validation)
 */
export async function test_api_techreviewer_feedback_update_atomicity_error_handling(
  connection: api.IConnection,
) {
  // --- Preparation: Create actors & authenticate as tech reviewer ---
  const techReviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewerPass = RandomGenerator.alphaNumeric(12);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPass,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  const unrelatedReviewerEmail = typia.random<string & tags.Format<"email">>();
  const unrelatedReviewerPass = RandomGenerator.alphaNumeric(12);
  const unrelatedTechReviewer = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: unrelatedReviewerEmail,
        password: unrelatedReviewerPass,
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    },
  );
  typia.assert(unrelatedTechReviewer);

  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPass = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPass,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPass = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPass,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // --- HR creates job employment type and job posting state ---
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPass,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  const jobEmploymentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: "Full-time",
          description: "Standard FT job",
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(jobEmploymentType);

  const jobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: "open",
          label: "Open",
          description: "Accepting applicants",
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(jobPostingState);

  // --- HR creates a job posting ---
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: jobEmploymentType.id,
          job_posting_state_id: jobPostingState.id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 2000,
          salary_range_max: 5000,
          application_deadline: new Date(
            Date.now() + 30 * 24 * 3600 * 1000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // --- Applicant uploads a resume and applies for job ---
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPass,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parsed_name: applicant.name,
        parsed_email: applicant.email,
        parsed_mobile: applicant.phone ?? RandomGenerator.mobile(),
        skills_json: '["TypeScript","Node.js"]',
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

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

  // --- Tech reviewer creates initial feedback entry ---
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPass,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  const initialFeedbackBody = RandomGenerator.paragraph({ sentences: 5 });
  const initialFeedback =
    await api.functional.atsRecruitment.techReviewer.applications.feedback.create(
      connection,
      {
        applicationId: application.id,
        body: {
          feedback_body: initialFeedbackBody,
          rating: 3.5,
          is_final_recommendation: false,
        } satisfies IAtsRecruitmentApplicationFeedback.ICreate,
      },
    );
  typia.assert(initialFeedback);

  // --- SUCCESS: Reviewer updates feedback ---
  const updateBody = {
    feedback_body: RandomGenerator.paragraph({ sentences: 4 }),
    rating: 4.5,
    is_final_recommendation: true,
  } satisfies IAtsRecruitmentApplicationFeedback.IUpdate;
  const updatedFeedback =
    await api.functional.atsRecruitment.techReviewer.applications.feedback.update(
      connection,
      {
        applicationId: application.id,
        feedbackId: initialFeedback.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFeedback);
  TestValidator.equals(
    "feedback body updated",
    updatedFeedback.feedback_body,
    updateBody.feedback_body,
  );
  TestValidator.equals(
    "rating updated",
    updatedFeedback.rating,
    updateBody.rating,
  );
  TestValidator.equals(
    "is_final_recommendation updated",
    updatedFeedback.is_final_recommendation,
    updateBody.is_final_recommendation,
  );

  // --- FAIL: Unrelated reviewer cannot update feedback ---
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: unrelatedReviewerEmail,
      password: unrelatedReviewerPass,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  await TestValidator.error("unrelated reviewer update forbidden", async () => {
    await api.functional.atsRecruitment.techReviewer.applications.feedback.update(
      connection,
      {
        applicationId: application.id,
        feedbackId: initialFeedback.id,
        body: {
          feedback_body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentApplicationFeedback.IUpdate,
      },
    );
  });

  // --- FAIL: Attempt update with empty body (invalid business logic) ---
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPass,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  await TestValidator.error("empty feedback update body rejected", async () => {
    await api.functional.atsRecruitment.techReviewer.applications.feedback.update(
      connection,
      {
        applicationId: application.id,
        feedbackId: initialFeedback.id,
        body: {} satisfies IAtsRecruitmentApplicationFeedback.IUpdate,
      },
    );
  });
}
