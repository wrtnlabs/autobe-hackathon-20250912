import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate the creation of job posting states by the system admin, enforcing
 * all business rules and error states.
 *
 * 1. Create and authenticate as a system admin.
 * 2. Successfully create a new job posting state with a unique state_code, label,
 *    is_active, sort_order, and optional description.
 * 3. Attempt to re-create with duplicate state_code to trigger uniqueness error.
 * 4. Attempt to create as unauthenticated user (should fail).
 * 5. Create with only required fields supplied (description omitted), verify it is
 *    null/undefined in response.
 */
export async function test_api_system_admin_job_posting_state_creation_with_validation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as system admin
  const sysAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword: string = RandomGenerator.alphaNumeric(12);
  const sysAdminReq = {
    email: sysAdminEmail,
    password: sysAdminPassword,
    name: RandomGenerator.name(2),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const sysAdminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminReq,
  });
  typia.assert(sysAdminAuth);
  TestValidator.equals(
    "system admin email matches",
    sysAdminAuth.email,
    sysAdminReq.email,
  );
  TestValidator.predicate(
    "system admin is active",
    sysAdminAuth.is_active === true,
  );

  // 2. Successfully create a job posting state
  const uniqueStateCode = RandomGenerator.alphaNumeric(10);
  const createReq = {
    state_code: uniqueStateCode,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
    sort_order: 10,
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const created =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      { body: createReq },
    );
  typia.assert(created);
  TestValidator.equals(
    "returned state_code matches input",
    created.state_code,
    createReq.state_code,
  );
  TestValidator.equals(
    "returned label matches input",
    created.label,
    createReq.label,
  );
  TestValidator.equals(
    "returned description matches input",
    created.description,
    createReq.description,
  );
  TestValidator.equals(
    "returned is_active matches input",
    created.is_active,
    createReq.is_active,
  );
  TestValidator.equals(
    "returned sort_order matches input",
    created.sort_order,
    createReq.sort_order,
  );

  // 3. Duplicate state_code triggers uniqueness violation (business error)
  await TestValidator.error(
    "duplicate state_code creation should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
        connection,
        { body: createReq },
      );
    },
  );

  // 4. Attempt as unauthenticated user (connection with headers: {})
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated create blocked", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      unauthConn,
      { body: createReq },
    );
  });

  // 5. Required fields only, optional description omitted
  const minimalReq = {
    state_code: RandomGenerator.alphaNumeric(10),
    label: RandomGenerator.paragraph({ sentences: 1 }),
    is_active: false,
    sort_order: 999,
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const minimalCreated =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      { body: minimalReq },
    );
  typia.assert(minimalCreated);
  TestValidator.equals(
    "description defaults to null/undefined",
    minimalCreated.description,
    null,
  );
}
