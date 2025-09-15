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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicationFeedback";

/**
 * Scenario: HR recruiter feedback listing/retrieval workflow for job
 * application(s).
 *
 * This test verifies listing/retrieval of application feedback using the PATCH
 * and GET endpoints.
 *
 * - Register two HR recruiters (A and B) and one applicant.
 * - Recruiter A sets up job employment type, job posting state and creates a job
 *   posting.
 * - Applicant uploads a resume and applies to the posting.
 * - Validate: a) HR recruiter can successfully list feedback (PATCH index) for an
 *   application (should return empty list if none exists). b) Feedback listing
 *   with random/invalid applicationId (should error or be empty). c) Feedback
 *   detail retrieval with invalid IDs (should error).
 */
export async function test_api_application_feedback_patch_by_hr_recruiter_comprehensive(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter A and login
  const hrA_email = typia.random<string & tags.Format<"email">>();
  const hrA_password = RandomGenerator.alphaNumeric(12);
  const hrA: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrA_email,
        password: hrA_password,
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrA);

  // 2. Register HR recruiter B (for negative test) and login
  const hrB_email = typia.random<string & tags.Format<"email">>();
  const hrB_password = RandomGenerator.alphaNumeric(12);
  const hrB: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrB_email,
        password: hrB_password,
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrB);

  // 3. Register applicant and login
  const applicant_email = typia.random<string & tags.Format<"email">>();
  const applicant_password = RandomGenerator.alphaNumeric(12);
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicant_email,
        password: applicant_password,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 4. HR recruiter A login (to setup next steps)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrA_email,
      password: hrA_password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // 5. HR recruiter A creates job employment type
  const employmentType: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph(),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  // 6. HR recruiter A creates job posting state
  const postingState: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(8),
          label: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph(),
          is_active: true,
          sort_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // 7. HR recruiter A creates job posting
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrA.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 8. Applicant login
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicant_email,
      password: applicant_password,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  // 9. Applicant uploads resume
  const resume: IAtsRecruitmentResume =
    await api.functional.atsRecruitment.applicant.resumes.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        parsed_name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentResume.ICreate,
    });
  typia.assert(resume);

  // 10. Applicant applies to job
  const application: IAtsRecruitmentApplication =
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

  // 11. Login as HR recruiter A, list application feedback (should be empty at first)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrA_email,
      password: hrA_password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const feedbackRes: IPageIAtsRecruitmentApplicationFeedback =
    await api.functional.atsRecruitment.hrRecruiter.applications.feedback.index(
      connection,
      {
        applicationId: application.id,
        body: {
          application_id: application.id,
        },
      },
    );
  typia.assert(feedbackRes);
  TestValidator.equals(
    "feedback list is empty initially",
    feedbackRes.data.length,
    0,
  );

  // 12. Feedback list with invalid application ID (should be empty or error)
  await TestValidator.error(
    "feedback listing with invalid application ID should error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.index(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            application_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 13. Feedback detail with invalid IDs (should error)
  await TestValidator.error(
    "feedback detail GET with invalid IDs should error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.feedback.at(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
          feedbackId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
