import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Test retrieval and access control for system administrator detail view.
 *
 * This scenario validates the following business objectives:
 *
 * 1. System admin registration and authorized login
 * 2. System admin can read their own detailed info
 * 3. System admin can read other system admins' details (cross-admin access)
 * 4. Error is thrown when fetching details for a non-existent or deleted admin
 *
 * Stepwise process:
 *
 * 1. Register and login Admin A
 * 2. Register and login Admin B
 * 3. As Admin A, fetch own data and verify fields
 * 4. As Admin A, fetch Admin B's data (cross-access) and verify fields
 * 5. As Admin A, fetch non-existent admin by random UUID - expect error
 */
export async function test_api_system_admin_account_detail_view(
  connection: api.IConnection,
) {
  // 1. Register Admin A
  const externalAdminIdA = RandomGenerator.alphaNumeric(16);
  const emailA = RandomGenerator.name(1) + "@company.com";
  const adminA = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: externalAdminIdA,
      email: emailA,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(adminA);

  // Admin A tokens implicitly set

  // 2. Register Admin B
  const externalAdminIdB = RandomGenerator.alphaNumeric(16);
  const emailB = RandomGenerator.name(1) + "@company.com";
  const adminB = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: externalAdminIdB,
      email: emailB,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(adminB);

  // 3. As Admin A, ensure session by logging in
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: externalAdminIdA,
      email: emailA,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });

  // 4. As Admin A, get account detail for self
  const adminSelf =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.at(connection, {
      systemAdminId: adminA.id,
    });
  typia.assert(adminSelf);
  TestValidator.equals("self account id matches", adminSelf.id, adminA.id);
  TestValidator.equals(
    "self external_admin_id matches",
    adminSelf.external_admin_id,
    externalAdminIdA,
  );
  TestValidator.equals("self email matches", adminSelf.email, emailA);
  TestValidator.equals(
    "self actor_type is systemAdmin",
    adminSelf.actor_type,
    "systemAdmin",
  );
  TestValidator.equals("self deleted_at is null", adminSelf.deleted_at, null);

  // 5. As Admin A, get account detail for Admin B (cross-admin view)
  const adminBCross =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.at(connection, {
      systemAdminId: adminB.id,
    });
  typia.assert(adminBCross);
  TestValidator.equals("cross admin id matches", adminBCross.id, adminB.id);
  TestValidator.equals(
    "cross admin actor_type is systemAdmin",
    adminBCross.actor_type,
    "systemAdmin",
  );
  TestValidator.equals(
    "cross admin deleted_at is null",
    adminBCross.deleted_at,
    null,
  );

  // 6. As Admin A, get detail for random non-existent admin, expect error
  await TestValidator.error(
    "fetching non-existent admin should throw",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemAdmins.at(
        connection,
        {
          systemAdminId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
