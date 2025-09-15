import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test business workflow for HR recruiter soft-deleting a job application.
 * Covers: registration/logins, posting/application creation, successful
 * soft-delete, deletion errors (twice and unauthorized/nonexistent), and actor
 * isolation.
 *
 * 1. HR recruiter registers and logs in
 * 2. Applicant registers and logs in
 * 3. Recruiter creates a job posting
 * 4. Applicant applies to the created job posting
 * 5. HR recruiter performs successful erase of the application
 * 6. Repeat erase fails as not found
 * 7. Recruiter attempts erase on a random non-existent application (handled error)
 * 8. Applicant attempts to erase the application (should be unauthorized/error)
 */
export async function test_api_application_hr_recruiter_delete_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. HR recruiter registration & login
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(10);
  const recruiterJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterJoin);

  // 2. Applicant registration & login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantJoin = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantJoin);

  // 3. HR recruiter logs in (role context switch)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 4. Recruiter creates a job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiterJoin.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph({ sentences: 3 }),
          salary_range_min: 3000,
          salary_range_max: 10000,
          application_deadline: new Date(
            Date.now() + 7 * 86400 * 1000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 5. Applicant logs in (role switch)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 6. Applicant creates a job application
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

  // 7. HR recruiter logs back in (role switch)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 8. Recruiter erases the application (success)
  await api.functional.atsRecruitment.hrRecruiter.applications.erase(
    connection,
    {
      applicationId: application.id,
    },
  );

  // 9. Recruiter attempts erase again (should fail)
  await TestValidator.error("re-erase should fail as not found", async () => {
    await api.functional.atsRecruitment.hrRecruiter.applications.erase(
      connection,
      {
        applicationId: application.id,
      },
    );
  });

  // 10. Recruiter tries to erase a non-existent application
  await TestValidator.error(
    "deleting a random non-existent application should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.erase(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 11. Applicant login (role context to unauthorized actor)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  // 12. Applicant attempts to erase the application (should not be allowed)
  await TestValidator.error(
    "applicant cannot erase application — unauthorized",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.erase(
        connection,
        {
          applicationId: application.id,
        },
      );
    },
  );
}
