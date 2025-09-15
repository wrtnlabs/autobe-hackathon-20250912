import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";

/**
 * Validates creation of user authentication records as a system admin, focusing
 * on business error scenarios such as rejection of duplicate provider_key for
 * the same user and provider.
 *
 * - Registers and authenticates a system administrator as dependency.
 * - Successfully creates an authentication credential for that admin user.
 * - Attempts to create another authentication with same user_id, user_type,
 *   provider, provider_key and expects it to fail (duplicate).
 * - Skips unimplementable type error scenarios (missing required fields) as those
 *   cannot be expressed in compilable TypeScript per system rules.
 */
export async function test_api_user_authentication_creation_missing_fields_and_duplicate_provider(
  connection: api.IConnection,
) {
  // 1. Register and login system admin (dependency)
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: adminJoin });
  typia.assert(admin);

  // Prepare common body for authentication creation
  const userAuthBody = {
    user_id: admin.id,
    user_type: "systemadmin",
    provider: "local",
    provider_key: "sysadminkey1",
    password_hash: RandomGenerator.alphaNumeric(20),
  } satisfies IHealthcarePlatformUserAuthentication.ICreate;

  // 2. Create valid authentication
  const created =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
      connection,
      { body: userAuthBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "created authentication provider_key matches",
    created.provider_key,
    userAuthBody.provider_key,
  );
  TestValidator.equals(
    "created authentication user_id matches",
    created.user_id,
    admin.id,
  );

  // 3. Attempt duplicate provider_key for same user+provider
  await TestValidator.error(
    "duplicate provider_key for same user+provider",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
        connection,
        { body: userAuthBody },
      );
    },
  );
}
