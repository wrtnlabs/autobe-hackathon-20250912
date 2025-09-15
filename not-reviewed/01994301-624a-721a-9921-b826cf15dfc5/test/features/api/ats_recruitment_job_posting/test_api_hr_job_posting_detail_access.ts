import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test for HR recruiter fetching job posting details by ID
 * including setup steps and error handling.
 *
 * 1. Register and login a system admin for entity setup.
 * 2. System admin creates a posting state (active, labeled 'Open').
 * 3. System admin creates a job employment type (active, 'Full-Time').
 * 4. Register and login an HR recruiter.
 * 5. HR recruiter creates a job posting using created state and employment
 *    type.
 * 6. HR recruiter retrieves the job posting by returned ID and verifies
 *    matching details.
 * 7. Attempt to fetch a non-existent job posting (with random UUID) and expect
 *    error.
 */
export async function test_api_hr_job_posting_detail_access(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    },
  });
  typia.assert(systemAdmin);

  // 2. Login as system admin (to ensure context in case tokens change on login)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // 3. Create job posting state
  const postingStateName = RandomGenerator.name(1);
  const jobPostingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(8),
          label: postingStateName,
          is_active: true,
          sort_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(jobPostingState);

  // 4. Create job employment type
  const employmentTypeName = RandomGenerator.name(1);
  const employmentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: employmentTypeName,
          is_active: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(employmentType);

  // 5. Register HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
    },
  });
  typia.assert(recruiter);

  // 6. Login as HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    },
  });

  // 7. Create job posting using above IDs
  const createBody = {
    hr_recruiter_id: recruiter.id,
    job_employment_type_id: employmentType.id,
    job_posting_state_id: jobPostingState.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    salary_range_min: 40000,
    salary_range_max: 70000,
    application_deadline: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 60,
    ).toISOString(),
    is_visible: true,
  };
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      { body: createBody },
    );
  typia.assert(jobPosting);

  // 8. Fetch job posting by ID as HR recruiter and check details
  const fetched =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.at(connection, {
      jobPostingId: jobPosting.id,
    });
  typia.assert(fetched);
  TestValidator.equals(
    "hr_recruiter_id matches",
    fetched.hr_recruiter_id,
    recruiter.id,
  );
  TestValidator.equals(
    "job_employment_type_id matches",
    fetched.job_employment_type_id,
    employmentType.id,
  );
  TestValidator.equals(
    "job_posting_state_id matches",
    fetched.job_posting_state_id,
    jobPostingState.id,
  );
  TestValidator.equals("title matches", fetched.title, createBody.title);
  TestValidator.equals(
    "description matches",
    fetched.description,
    createBody.description,
  );
  TestValidator.equals(
    "location matches",
    fetched.location,
    createBody.location,
  );
  TestValidator.equals(
    "salary_range_min matches",
    fetched.salary_range_min,
    createBody.salary_range_min,
  );
  TestValidator.equals(
    "salary_range_max matches",
    fetched.salary_range_max,
    createBody.salary_range_max,
  );
  TestValidator.equals(
    "application_deadline matches",
    fetched.application_deadline,
    createBody.application_deadline,
  );
  TestValidator.equals(
    "is_visible matches",
    fetched.is_visible,
    createBody.is_visible,
  );

  // 9. Negative case: attempt to fetch posting with non-existent ID
  await TestValidator.error("error on unknown jobPostingId", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.at(connection, {
      jobPostingId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
