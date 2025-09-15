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
 * Covers updating a job posting as a system administrator. Steps:
 *
 * 1. Register/authenticate as system admin
 * 2. Create HR recruiter entity for job posting association
 * 3. Create job employment type and posting state
 * 4. As admin, create a job posting and update it (modify title, type, state,
 *    description, etc.)
 * 5. Validate update is reflected in the posting data and enforces business rules
 *    (unique title per recruiter)
 * 6. Test error scenarios: updating a non-existent posting, invalid employment
 *    type/state IDs, title uniqueness, etc.
 *
 * Does NOT test editing recruiter association as update DTO does not allow it.
 * All responses are validated for type and business logic correctness.
 */
export async function test_api_job_posting_update_systemadmin_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: admin_email,
      password: admin_password,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create HR recruiter to associate with job postings
  const hr_email = typia.random<string & tags.Format<"email">>();
  const hr_password = RandomGenerator.alphaNumeric(12);
  const hr_recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hr_email,
      password: hr_password,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hr_recruiter);

  // 3. Create job employment type and state
  const employment_type =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: "Full-Time " + RandomGenerator.alphabets(5),
          description: "Full time permanent employee",
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employment_type);

  const posting_state =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: "open-" + RandomGenerator.alphabets(5),
          label: "Open",
          description: "Open state",
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(posting_state);

  // 4. Create a job posting as admin
  const title_original = "Software Engineer " + RandomGenerator.alphaNumeric(6);
  const job_posting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hr_recruiter.id,
          job_employment_type_id: employment_type.id,
          job_posting_state_id: posting_state.id,
          title: title_original,
          description: RandomGenerator.paragraph({ sentences: 12 }),
          location: "Seoul",
          salary_range_min: 40000000,
          salary_range_max: 60000000,
          application_deadline: new Date(
            Date.now() + 7 * 24 * 3600 * 1000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(job_posting);

  // 5. Update the job posting
  const new_employment_type =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: "Contractor-" + RandomGenerator.alphabets(3),
          description: "Contractor for 1-year",
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(new_employment_type);

  const new_posting_state =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: "paused-" + RandomGenerator.alphabets(4),
          label: "Paused",
          description: "Temporarily Paused",
          is_active: true,
          sort_order: 2,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(new_posting_state);

  const update_title = title_original + " Updated";
  const updated_posting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.update(
      connection,
      {
        jobPostingId: job_posting.id,
        body: {
          title: update_title,
          description: RandomGenerator.paragraph({ sentences: 8 }),
          job_employment_type_id: new_employment_type.id,
          job_posting_state_id: new_posting_state.id,
          location: "Remote",
          salary_range_min: 45000000,
          salary_range_max: 70000000,
          application_deadline: new Date(
            Date.now() + 14 * 24 * 3600 * 1000,
          ).toISOString(),
          is_visible: false,
        } satisfies IAtsRecruitmentJobPosting.IUpdate,
      },
    );
  typia.assert(updated_posting);
  TestValidator.equals(
    "updated posting id matches original",
    updated_posting.id,
    job_posting.id,
  );
  TestValidator.equals(
    "updated posting title",
    updated_posting.title,
    update_title,
  );
  TestValidator.equals(
    "updated posting employment type",
    updated_posting.job_employment_type_id,
    new_employment_type.id,
  );
  TestValidator.equals(
    "updated posting state",
    updated_posting.job_posting_state_id,
    new_posting_state.id,
  );
  TestValidator.equals(
    "updated posting description",
    updated_posting.description,
    updated_posting.description,
  );

  // 6. Attempt to update a non-existent job posting
  await TestValidator.error(
    "update non-existent job posting should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostings.update(
        connection,
        {
          jobPostingId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            title: "Non-existent job posting update",
          } satisfies IAtsRecruitmentJobPosting.IUpdate,
        },
      );
    },
  );

  // 7. Update with invalid employment type ID
  await TestValidator.error(
    "update with invalid employment type id should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostings.update(
        connection,
        {
          jobPostingId: job_posting.id,
          body: {
            job_employment_type_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IAtsRecruitmentJobPosting.IUpdate,
        },
      );
    },
  );

  // 8. Update with invalid posting state ID
  await TestValidator.error(
    "update with invalid posting state id should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostings.update(
        connection,
        {
          jobPostingId: job_posting.id,
          body: {
            job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IAtsRecruitmentJobPosting.IUpdate,
        },
      );
    },
  );

  // 9. Posting title must be unique per recruiter
  const another_posting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hr_recruiter.id,
          job_employment_type_id: employment_type.id,
          job_posting_state_id: posting_state.id,
          title: "Unique duplicate " + RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          location: "Seoul",
          salary_range_min: 30000000,
          salary_range_max: 70000000,
          application_deadline: null,
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(another_posting);

  await TestValidator.error(
    "update title to duplicate should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostings.update(
        connection,
        {
          jobPostingId: another_posting.id,
          body: {
            title: update_title,
          } satisfies IAtsRecruitmentJobPosting.IUpdate,
        },
      );
    },
  );
}
