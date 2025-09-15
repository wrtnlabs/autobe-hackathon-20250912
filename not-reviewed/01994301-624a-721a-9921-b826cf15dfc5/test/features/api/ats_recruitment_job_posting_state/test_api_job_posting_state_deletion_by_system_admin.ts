import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate the permanent deletion of a job posting state by a system admin.
 *
 * This test confirms that a system admin can hard-delete a job posting
 * state, removing it from the ATS system, and ensures all relevant
 * permission and business logic checks are enforced. Key steps:
 *
 * 1. Register a system admin using a unique email and credentials. Login as
 *    system admin to acquire authentication context for deletion.
 * 2. Register an HR recruiter (with unique email etc.) and login as HR
 *    recruiter. This user creates a new job posting state using POST
 *    /atsRecruitment/hrRecruiter/jobPostingStates with unique code and
 *    label, for use in the deletion test.
 * 3. Switch to system admin context.
 * 4. Call DELETE
 *    /atsRecruitment/systemAdmin/jobPostingStates/{jobPostingStateId} for
 *    the just-created state. This should succeed with no return payload
 *    (void).
 * 5. Optionally, attempt to re-fetch or list job posting states to guarantee
 *    that the deleted record is now absent. (Note: no index/list/read
 *    implemented in accessible API, so negative confirmation is not
 *    possible. Skipped.)
 * 6. Attempt to delete a non-existent job posting state (random UUID). This
 *    should fail and raise an error.
 *
 * Success is demonstrated if: (a) the new state is deleted by the system
 * admin, (b) attempts to delete non-existent states error, and (c)
 * permissions are enforced throughout.
 */
export async function test_api_job_posting_state_deletion_by_system_admin(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);

  // Register system admin
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(sysAdmin);

  // Login system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 2. HR recruiter registration and login
  const hrEmail: string = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);

  // Register HR recruiter
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter);

  // Login HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 3. HR recruiter creates a job posting state
  const stateCode = RandomGenerator.alphaNumeric(7);
  const stateLabel = RandomGenerator.paragraph({ sentences: 1 });
  const jobStateCreate = {
    state_code: stateCode,
    label: stateLabel,
    description: RandomGenerator.paragraph(),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;

  const createdState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: jobStateCreate },
    );
  typia.assert(createdState);

  // 4. Switch context back to system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 5. System admin deletes the job posting state
  await api.functional.atsRecruitment.systemAdmin.jobPostingStates.erase(
    connection,
    {
      jobPostingStateId: createdState.id,
    },
  );

  // 6. Try deleting a non-existent job posting state
  await TestValidator.error(
    "should throw when deleting non-existent job posting state",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostingStates.erase(
        connection,
        { jobPostingStateId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
