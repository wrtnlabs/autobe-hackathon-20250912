import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";

/**
 * Validate user credential deletion for healthcare platform system
 * administrator.
 *
 * This test scenario verifies that system admins can successfully delete
 * (archive) user credential records, and tests forbidden/error scenarios for
 * redundant and non-permissioned deletes.
 *
 * Steps:
 *
 * 1. Register and login sysadmin1.
 * 2. Create a user credential for sysadmin1 (using their user id).
 * 3. Successfully delete that credential.
 * 4. Attempt to delete it again (should fail as already deleted).
 * 5. Attempt to delete a random non-existent credential (should fail with error).
 * 6. Register and login sysadmin2 (different account).
 * 7. As sysadmin2, attempt to delete sysadmin1's credential (should fail as
 *    forbidden).
 */
export async function test_api_delete_user_credential_success_and_forbidden(
  connection: api.IConnection,
) {
  // 1. Register system admin #1
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(12);
  const admin1Join: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: admin1Email,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: admin1Email,
        password: admin1Password,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(admin1Join);

  // 2. Login admin1 for credential operations
  const admin1Login: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: admin1Email,
        provider: "local",
        provider_key: admin1Email,
        password: admin1Password,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(admin1Login);

  // 3. Create credential for admin1
  const credentialCreate = {
    user_id: admin1Login.id,
    user_type: "systemadmin",
    credential_type: "password",
    credential_hash: RandomGenerator.alphaNumeric(32),
    created_at: new Date().toISOString(),
    archived_at: new Date(Date.now() + 5 * 1000).toISOString(),
  } satisfies IHealthcarePlatformUserCredential.ICreate;
  const userCredential: IHealthcarePlatformUserCredential =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.create(
      connection,
      { body: credentialCreate },
    );
  typia.assert(userCredential);
  TestValidator.equals(
    "user_id matches admin1",
    userCredential.user_id,
    admin1Login.id,
  );

  // 4. Delete credential (should succeed)
  await api.functional.healthcarePlatform.systemAdmin.userCredentials.erase(
    connection,
    {
      userCredentialId: userCredential.id,
    },
  );

  // 5. Attempt to delete again (should error)
  await TestValidator.error(
    "deleting already deleted credential should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.erase(
        connection,
        {
          userCredentialId: userCredential.id,
        },
      );
    },
  );

  // 6. Attempt to delete random non-existent credential (should error)
  await TestValidator.error(
    "deleting non-existent credential should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.erase(
        connection,
        {
          userCredentialId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Register and login a second system admin (sysadmin2)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const admin2Join: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: admin2Email,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: admin2Email,
        password: admin2Password,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(admin2Join);

  const admin2Login: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: admin2Email,
        provider: "local",
        provider_key: admin2Email,
        password: admin2Password,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(admin2Login);

  // 8. As admin2, attempt to delete admin1's credential (should be forbidden/error)
  await TestValidator.error(
    "cross-admin credential deletion is forbidden",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.erase(
        connection,
        {
          userCredentialId: userCredential.id,
        },
      );
    },
  );
}
