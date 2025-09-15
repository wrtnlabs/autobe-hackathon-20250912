import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates HR recruiter job posting update including permitted and forbidden
 * flows.
 *
 * 1. Register/join as HR recruiter
 * 2. Create job employment type (type1) & job posting state (state1)
 * 3. Create a job posting bound to those type IDs
 * 4. Update job posting's title/description & migrate to new employment type/state
 * 5. Success: updated fields are changed, others unmodified
 * 6. Failure: try update with random UUID → error
 * 7. Failure: try update with mismatched employment/state ID (invalid—simulate by
 *    using random UUID or by creating/inactivating if allowed) → error
 * 8. Failure: try update unauthenticated (simulate by removing token, expect
 *    error)
 */
export async function test_api_job_posting_update_hrrecruiter_success_and_failure(
  connection: api.IConnection,
) {
  // Step 1: Register as an HR recruiter
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, { body: joinBody });
  typia.assert(recruiter);

  // Step 2: Create valid employment type and posting state
  const empTypeBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const empType: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      { body: empTypeBody },
    );
  typia.assert(empType);

  const stateBody = {
    state_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const state: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: stateBody },
    );
  typia.assert(state);

  // Step 3: Create initial job posting
  const postingBody = {
    hr_recruiter_id: recruiter.id,
    job_employment_type_id: empType.id,
    job_posting_state_id: state.id,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    salary_range_min: 1000,
    salary_range_max: 5000,
    application_deadline: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;
  const posting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      { body: postingBody },
    );
  typia.assert(posting);

  // Step 4: Create new employment type and state for the update
  const newEmpTypeBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const newEmpType: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      { body: newEmpTypeBody },
    );
  typia.assert(newEmpType);

  const newStateBody = {
    state_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const newState: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: newStateBody },
    );
  typia.assert(newState);

  // Step 5: Update the job posting
  const updateBody = {
    job_employment_type_id: newEmpType.id,
    job_posting_state_id: newState.id,
    title: RandomGenerator.name(4),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    salary_range_min: 2000,
    salary_range_max: 6000,
    application_deadline: new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    is_visible: false,
  } satisfies IAtsRecruitmentJobPosting.IUpdate;
  const updated: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.update(
      connection,
      {
        jobPostingId: posting.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // Validate modifications
  TestValidator.equals("title updated", updated.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "job_employment_type_id updated",
    updated.job_employment_type_id,
    newEmpType.id,
  );
  TestValidator.equals(
    "job_posting_state_id updated",
    updated.job_posting_state_id,
    newState.id,
  );
  TestValidator.equals("is_visible updated", updated.is_visible, false);
  TestValidator.equals(
    "location updated",
    updated.location,
    updateBody.location,
  );
  TestValidator.equals(
    "salary_range_min updated",
    updated.salary_range_min,
    2000,
  );
  TestValidator.equals(
    "salary_range_max updated",
    updated.salary_range_max,
    6000,
  );
  TestValidator.equals(
    "application_deadline updated",
    updated.application_deadline,
    updateBody.application_deadline,
  );
  TestValidator.equals("jobPostingId unchanged", updated.id, posting.id);
  TestValidator.equals(
    "hr_recruiter_id unchanged",
    updated.hr_recruiter_id,
    posting.hr_recruiter_id,
  );

  // Step 6: Failure - invalid jobPostingId (random UUID)
  await TestValidator.error(
    "update fails for non-existent job posting ID",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.update(
        connection,
        {
          jobPostingId: typia.random<string & tags.Format<"uuid">>() as string &
            tags.Format<"uuid">,
          body: updateBody,
        },
      );
    },
  );

  // Step 7: Failure - mismatched employment/state IDs (random UUIDs)
  await TestValidator.error(
    "update fails for non-existent employment type",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.update(
        connection,
        {
          jobPostingId: posting.id,
          body: {
            ...updateBody,
            job_employment_type_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );
  await TestValidator.error(
    "update fails for non-existent posting state",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.update(
        connection,
        {
          jobPostingId: posting.id,
          body: {
            ...updateBody,
            job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // Step 8: Failure - unauthenticated (simulate with new connection w/o token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "updating a posting unauthenticated should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.update(
        unauthConn,
        {
          jobPostingId: posting.id,
          body: updateBody,
        },
      );
    },
  );
}
