import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Update a system administrator's email address and test business uniqueness
 * logic.
 *
 * 1. Register two distinct systemAdmin accounts (A and B)
 * 2. Log in as admin A
 * 3. Update admin A's email to a new valid address
 * 4. Assert response shows correct update and audit fields have changed
 * 5. Attempt to update A's email to B's current email – expect error
 */
export async function test_api_system_admin_update_email_successful(
  connection: api.IConnection,
) {
  // 1. Register admin A
  const adminA_join = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const adminA = await api.functional.auth.systemAdmin.join(connection, {
    body: adminA_join,
  });
  typia.assert(adminA);

  // 2. Register admin B (for duplicate email scenario)
  const adminB_join = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const adminB = await api.functional.auth.systemAdmin.join(connection, {
    body: adminB_join,
  });
  typia.assert(adminB);

  // 3. Log in as admin A to set up authenticated context
  const loginA = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminA.external_admin_id,
      email: adminA.email,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(loginA);

  // 4. Update admin A's email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const before_updated_at = adminA.updated_at;
  const updateRes =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.update(
      connection,
      {
        systemAdminId: adminA.id,
        body: {
          email: newEmail,
        } satisfies IStoryfieldAiSystemAdmin.IUpdate,
      },
    );
  typia.assert(updateRes);
  TestValidator.equals("adminA id remains unchanged", updateRes.id, adminA.id);
  TestValidator.equals("adminA updated email", updateRes.email, newEmail);
  TestValidator.notEquals(
    "updated_at changes after update",
    updateRes.updated_at,
    before_updated_at,
  );

  // 5. Attempt to update with duplicate email – should fail
  await TestValidator.error(
    "should fail for duplicate admin email",
    async () =>
      await api.functional.storyfieldAi.systemAdmin.systemAdmins.update(
        connection,
        {
          systemAdminId: adminA.id,
          body: {
            email: adminB.email,
          } satisfies IStoryfieldAiSystemAdmin.IUpdate,
        },
      ),
  );
}
