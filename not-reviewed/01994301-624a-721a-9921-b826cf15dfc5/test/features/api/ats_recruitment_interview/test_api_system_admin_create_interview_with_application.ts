import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Complete end-to-end test for system administrator interview creation
 * workflow in the ATS.
 *
 * This test covers:
 *
 * 1. Registration of systemAdmin, HR recruiter, applicant, and tech reviewer.
 * 2. Authentication for all actors (role switching).
 * 3. HR recruiter creates a job posting.
 * 4. Applicant applies to the job posting to create an application.
 * 5. SystemAdmin creates a new interview associated with the application using
 *    POST /atsRecruitment/systemAdmin/interviews.
 * 6. Validates interview details in response.
 * 7. Error scenario: invalid applicationId, and
 *    unauthenticated/user-unauthorized creation attempts.
 */
export async function test_api_system_admin_create_interview_with_application(
  connection: api.IConnection,
) {
  // 1. Register system administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(systemAdmin);

  // 2. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
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

  // 4. Register tech reviewer
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techPassword = RandomGenerator.alphaNumeric(11);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techEmail,
      password: techPassword,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.paragraph(),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  // 5. HR recruiter login and create job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph(),
          salary_range_min: 50000,
          salary_range_max: 120000,
          application_deadline: new Date(
            Date.now() + 86400000 * 7,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 6. Applicant login and submit application
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
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

  // 7. System admin login and create interview for application
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  const interviewRequest = {
    ats_recruitment_application_id: application.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: RandomGenerator.pick([
      "first_phase",
      "tech_round",
      "hr",
      "final",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "pending",
      "completed",
      "cancelled",
    ] as const),
    notes: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: interviewRequest,
      },
    );
  typia.assert(interview);
  TestValidator.equals(
    "interview applicationId matches",
    interview.ats_recruitment_application_id,
    application.id,
  );
  TestValidator.equals(
    "interview title matches",
    interview.title,
    interviewRequest.title,
  );
  TestValidator.equals(
    "interview stage matches",
    interview.stage,
    interviewRequest.stage,
  );
  TestValidator.equals(
    "interview status matches",
    interview.status,
    interviewRequest.status,
  );
  TestValidator.equals(
    "interview notes matches",
    interview.notes,
    interviewRequest.notes,
  );

  // 8. Error: Attempt interview creation with invalid application id
  await TestValidator.error(
    "interview creation fails with invalid applicationId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.create(
        connection,
        {
          body: {
            ...interviewRequest,
            ats_recruitment_application_id: typia.random<
              string & tags.Format<"uuid">
            >(), // wrong id
          },
        },
      );
    },
  );

  // 9. Error: Attempt as unauthorized actor (applicant)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error("applicant cannot create interview", async () => {
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: interviewRequest,
      },
    );
  });

  // 10. Error: Attempt with non-existent application participants (use random UUID)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "interview creation fails with non-existent applicationId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.create(
        connection,
        {
          body: {
            ...interviewRequest,
            ats_recruitment_application_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );
}
