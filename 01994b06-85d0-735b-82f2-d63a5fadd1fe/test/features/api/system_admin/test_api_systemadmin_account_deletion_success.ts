import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test successful deletion of a healthcare platform system admin account by
 * another system admin (not self-deletion).
 *
 * 1. Register primary (acting) system admin using
 *    api.functional.auth.systemAdmin.join.
 * 2. Authenticate as the primary system admin using
 *    api.functional.auth.systemAdmin.login (if needed).
 * 3. Register a second system admin (to be deleted) using
 *    api.functional.auth.systemAdmin.join.
 * 4. DELETE the second account using
 *    api.functional.healthcarePlatform.systemAdmin.systemadmins.erase.
 * 5. Attempt to DELETE the same admin again (expect error) to confirm it is
 *    deleted.
 * 6. Attempt to DELETE self as primary admin (expect error for self-deletion).
 */
export async function test_api_systemadmin_account_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register first (acting) system admin
  const primaryEmail =
    RandomGenerator.alphaNumeric(12) + "@enterprise-corp.com";
  const primaryPassword = RandomGenerator.alphaNumeric(16);
  const primaryJoin = {
    email: primaryEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: primaryEmail,
    password: primaryPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const primaryAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: primaryJoin,
    });
  typia.assert(primaryAdmin);

  // 2. Authenticate as the first system admin (no-op, as join sets token, but included for clarity)
  const authResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: primaryEmail,
      provider: "local",
      provider_key: primaryEmail,
      password: primaryPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(authResult);

  // 3. Register a second system admin
  const secondaryEmail =
    RandomGenerator.alphaNumeric(8) + "@enterprise-corp.com";
  const secondaryPassword = RandomGenerator.alphaNumeric(16);
  const secondaryJoin = {
    email: secondaryEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: secondaryEmail,
    password: secondaryPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const secondaryAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: secondaryJoin,
    });
  typia.assert(secondaryAdmin);

  // 4. Delete the second system admin (as the first admin)
  await api.functional.healthcarePlatform.systemAdmin.systemadmins.erase(
    connection,
    { systemAdminId: secondaryAdmin.id },
  );

  // 5. Try deleting the same ID again - should error
  await TestValidator.error(
    "deleting already deleted system admin should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.systemadmins.erase(
        connection,
        { systemAdminId: secondaryAdmin.id },
      );
    },
  );

  // 6. Attempt to self-delete (should NOT be allowed)
  await TestValidator.error(
    "system admin cannot delete themselves",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.systemadmins.erase(
        connection,
        { systemAdminId: primaryAdmin.id },
      );
    },
  );
}
