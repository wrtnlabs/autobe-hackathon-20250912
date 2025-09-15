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
 * Validate system admin can fetch detailed job posting by ID after creating all
 * dependencies.
 *
 * 1. Register and login as system admin
 * 2. Create posting state as admin
 * 3. Create employment type as admin
 * 4. Register HR recruiter
 * 5. Create a job posting referencing all above
 * 6. Fetch job posting by ID as admin and validate all fields
 * 7. Attempt to get a non-existent posting and check error handling
 */
export async function test_api_admin_job_posting_detail_access(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassw0rd!";
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. System admin login (to ensure session is set)
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create job posting state
  const postingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: `open_${RandomGenerator.alphaNumeric(4)}`,
          label: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_active: true,
          sort_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // 4. Create job employment type
  const employmentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  // 5. Register HR recruiter
  const hrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrRecruiterEmail,
      password: "RecruiterPass!1",
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 6. Create job posting
  const jobPostBody = {
    hr_recruiter_id: hrRecruiter.id,
    job_employment_type_id: employmentType.id,
    job_posting_state_id: postingState.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    salary_range_min: 50000,
    salary_range_max: 100000,
    application_deadline: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 14,
    ).toISOString(),
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;

  const jobPost =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: jobPostBody,
      },
    );
  typia.assert(jobPost);

  // 7. Fetch job posting by ID
  const fetched =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.at(connection, {
      jobPostingId: jobPost.id,
    });
  typia.assert(fetched);

  // 8. Field-level validations
  TestValidator.equals("job posting id matches", fetched.id, jobPost.id);
  TestValidator.equals(
    "recruiter id matches",
    fetched.hr_recruiter_id,
    hrRecruiter.id,
  );
  TestValidator.equals(
    "employment type matches",
    fetched.job_employment_type_id,
    employmentType.id,
  );
  TestValidator.equals(
    "posting state matches",
    fetched.job_posting_state_id,
    postingState.id,
  );
  TestValidator.equals("title matches", fetched.title, jobPostBody.title);
  TestValidator.equals(
    "description matches",
    fetched.description,
    jobPostBody.description,
  );
  TestValidator.equals(
    "location matches",
    fetched.location,
    jobPostBody.location,
  );
  TestValidator.equals(
    "salary min",
    fetched.salary_range_min,
    jobPostBody.salary_range_min,
  );
  TestValidator.equals(
    "salary max",
    fetched.salary_range_max,
    jobPostBody.salary_range_max,
  );
  TestValidator.equals(
    "application deadline",
    fetched.application_deadline,
    jobPostBody.application_deadline,
  );
  TestValidator.equals(
    "is_visible matches",
    fetched.is_visible,
    jobPostBody.is_visible,
  );
  TestValidator.equals(
    "deleted_at is null (not deleted)",
    fetched.deleted_at,
    null,
  );

  // 9. Negative test: fetch posting with random ID for error handling
  await TestValidator.error("fetching non-existent posting fails", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobPostings.at(connection, {
      jobPostingId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
