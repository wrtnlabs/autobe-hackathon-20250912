import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that a system admin can update job posting state properties
 * correctly, and receives errors on invalid input.
 *
 * The flow:
 *
 * 1. Register system admin and login.
 * 2. Register HR recruiter and login.
 * 3. HR recruiter creates an initial job posting state.
 * 4. System admin logs in and updates the posting state (label, description,
 *    is_active, sort_order).
 * 5. Verify the update is reflected.
 * 6. Attempt and assert invalid updates fail: duplicate state_code, required
 *    fields missing, deactivation errors.
 */
export async function test_api_job_posting_state_update_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Register HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(10);
  const recruiterJoinBody = {
    email: recruiterEmail,
    password: recruiterPassword,
    name: RandomGenerator.name(),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: recruiterJoinBody,
  });
  typia.assert(recruiter);

  // 3. Login as recruiter and create job posting state
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const createStateBody = {
    state_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const jobState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: createStateBody },
    );
  typia.assert(jobState);

  // 4. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  // Prepare update
  const updateBody = {
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: false,
    sort_order: jobState.sort_order + 1,
  } satisfies IAtsRecruitmentJobPostingState.IUpdate;
  const updated =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.update(
      connection,
      {
        jobPostingStateId: jobState.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("label updated", updated.label, updateBody.label);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "is_active updated",
    updated.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "sort_order updated",
    updated.sort_order,
    updateBody.sort_order,
  );

  // 5. Invalid update: duplicate state_code
  // Make another state for conflict
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const duplicateStateBody = {
    state_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const jobState2 =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: duplicateStateBody },
    );
  typia.assert(jobState2);
  // Switch back to admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "cannot update state_code to duplicate",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostingStates.update(
        connection,
        {
          jobPostingStateId: jobState.id,
          body: {
            state_code: jobState2.state_code,
          } satisfies IAtsRecruitmentJobPostingState.IUpdate,
        },
      );
    },
  );

  // 6. Invalid business logic: try to deactivate already deactivated state
  await TestValidator.error(
    "cannot deactivate already deactivated",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostingStates.update(
        connection,
        {
          jobPostingStateId: jobState.id,
          body: {
            is_active: false,
          } satisfies IAtsRecruitmentJobPostingState.IUpdate,
        },
      );
    },
  );
}
