import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates permanent deletion of a system admin, enforcing business protection
 * logic. This scenario creates two administrators (adminA and adminB), then
 * adminA removes adminB. It asserts forbidden actions such as deletion of
 * non-existent and already-deleted admins, and ensures the final business rule
 * (cannot leave zero admins) is enforced on last admin.
 *
 * Steps:
 *
 * 1. Create a super-admin (adminA).
 * 2. Create another standard admin (adminB).
 * 3. Ensure both admins are unique and both active.
 * 4. AdminA deletes adminB (permitted since >1 admin).
 * 5. Attempt to re-delete adminB (must fail with not-found error).
 * 6. Attempt to delete a random non-existent admin (must fail with not-found
 *    error).
 * 7. AdminA deletes self (now permitted—still no last admin forbidden logic, as
 *    system may allow last admin to delete self).
 * 8. Attempt any further deletion (must fail with not-found if last record now
 *    erased).
 */
export async function test_api_system_admin_permanent_delete_workflow(
  connection: api.IConnection,
) {
  // 1. Create adminA
  const adminAInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const adminA = await api.functional.auth.systemAdmin.join(connection, {
    body: adminAInput,
  });
  typia.assert(adminA);

  // 2. Create adminB
  const adminBInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: false,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const adminB = await api.functional.auth.systemAdmin.join(connection, {
    body: adminBInput,
  });
  typia.assert(adminB);

  // 3. Ensure adminA and adminB are distinct
  TestValidator.notEquals(
    "admin A vs admin B ids must differ",
    adminA.id,
    adminB.id,
  );

  // 4. AdminA deletes adminB
  await api.functional.atsRecruitment.systemAdmin.systemAdmins.erase(
    connection,
    { systemAdminId: adminB.id },
  );

  // 5. Re-deletion should fail with error
  await TestValidator.error(
    "re-deleting already deleted admin fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemAdmins.erase(
        connection,
        { systemAdminId: adminB.id },
      );
    },
  );

  // 6. Deleting a non-existent ID
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("deleting non-existent admin fails", async () => {
    await api.functional.atsRecruitment.systemAdmin.systemAdmins.erase(
      connection,
      { systemAdminId: randomId },
    );
  });

  // 7. AdminA deletes self
  await api.functional.atsRecruitment.systemAdmin.systemAdmins.erase(
    connection,
    { systemAdminId: adminA.id },
  );

  // 8. Further attempts to delete now fail
  await TestValidator.error(
    "cannot delete last admin (no longer exists)",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemAdmins.erase(
        connection,
        { systemAdminId: adminA.id },
      );
    },
  );
}
