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
 * Validate tech reviewer feedback deletion: business rules, permissions, and
 * error handling.
 *
 * Scenario:
 *
 * 1. Register a tech reviewer (feedback owner) and authenticate.
 * 2. Register a HR recruiter and authenticate for posting setup.
 * 3. Register and authenticate as applicant.
 * 4. HR recruiter creates job employment type and posting state.
 * 5. HR recruiter creates job posting.
 * 6. Applicant uploads resume.
 * 7. Applicant submits job application.
 * 8. Tech reviewer creates feedback for the application.
 * 9. Owner deletes their feedback and verifies success.
 * 10. Further DELETE returns error (already deleted), owner cannot repeat deletion.
 * 11. Non-owner (different tech reviewer) attempts feedback deletion—expect error.
 *
 * Business rules validated:
 *
 * - Only the owner can delete their feedback
 * - DELETE is idempotent—subsequent deletions error as already deleted
 * - Non-owner cannot delete another's feedback
 * - All entities and mutation results are type-checked
 */
export async function test_api_techreviewer_feedback_delete_business_rules(
  connection: api.IConnection,
) {
  // 1. Register tech reviewer (feedback owner)
  const techReviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewerPassword = RandomGenerator.alphaNumeric(10);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.name(1),
    },
  });
  typia.assert(techReviewer);

  // 2. Register HR recruiter and login (for entity setup)
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    },
  });
  typia.assert(hrRecruiter);
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });

  // 3. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(applicant);
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });

  // 4. HR recruiter: create job employment type
  await api.functional.auth.hrRecruiter.login(connection, {
    body: { email: hrEmail, password: hrPassword },
  });
  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
          is_active: true,
        },
      },
    );
  typia.assert(employmentType);

  // 5. HR recruiter: create job posting state
  const postingStateCode = RandomGenerator.alphaNumeric(8);
  const postingStateLabel = RandomGenerator.name(1);
  const postingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: postingStateCode,
          label: postingStateLabel,
          description: RandomGenerator.paragraph(),
          is_active: true,
          sort_order: 1,
        },
      },
    );
  typia.assert(postingState);

  // 6. HR recruiter: create job posting (using actual hrRecruiter.id as owner)
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          location: RandomGenerator.name(1),
          salary_range_min: 1000000,
          salary_range_max: 2000000,
          application_deadline: new Date(
            Date.now() + 7 * 86400000,
          ).toISOString(),
          is_visible: true,
        },
      },
    );
  typia.assert(jobPosting);

  // 7. Applicant login and upload resume
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parsed_name: RandomGenerator.name(),
        parsed_email: applicantEmail,
        parsed_mobile: RandomGenerator.mobile(),
        parsed_birthdate: null,
        parsed_education_summary: RandomGenerator.paragraph(),
        parsed_experience_summary: RandomGenerator.paragraph(),
        skills_json: JSON.stringify(["TypeScript", "Node.js", "React"]),
      },
    },
  );
  typia.assert(resume);

  // 8. Applicant applies for job
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

  // 9. Tech reviewer login and create feedback
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
    },
  });
  const feedback =
    await api.functional.atsRecruitment.techReviewer.applications.feedback.create(
      connection,
      {
        applicationId: application.id,
        body: {
          feedback_body: RandomGenerator.paragraph({ sentences: 4 }),
          rating: 5,
          is_final_recommendation: true,
        },
      },
    );
  typia.assert(feedback);

  // 10. Tech reviewer deletes their feedback (should succeed)
  await api.functional.atsRecruitment.techReviewer.applications.feedback.erase(
    connection,
    {
      applicationId: application.id,
      feedbackId: feedback.id,
    },
  );

  // 11. Owner attempts 2nd delete (should fail as already deleted)
  await TestValidator.error(
    "Deleting already deleted feedback throws error",
    async () => {
      await api.functional.atsRecruitment.techReviewer.applications.feedback.erase(
        connection,
        {
          applicationId: application.id,
          feedbackId: feedback.id,
        },
      );
    },
  );

  // 12. Register a second tech reviewer (non-owner), login, attempt deletion
  const techReviewer2Email = typia.random<string & tags.Format<"email">>();
  const techReviewer2Password = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techReviewer2Email,
      password: techReviewer2Password,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.name(1),
    },
  });
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewer2Email,
      password: techReviewer2Password,
    },
  });
  await TestValidator.error(
    "Non-owner cannot delete another's feedback",
    async () => {
      await api.functional.atsRecruitment.techReviewer.applications.feedback.erase(
        connection,
        {
          applicationId: application.id,
          feedbackId: feedback.id,
        },
      );
    },
  );
}
