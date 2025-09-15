import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";

/**
 * Validates admin-privileged update of user authentication records.
 *
 * 1. Join as a system admin (collects superuser privileges)
 * 2. Create a user authentication record as admin using valid user, provider,
 *    provider_key
 * 3. Immediately update the provider_key using the admin role
 * 4. Confirm provider_key was changed and updated_at is newer than created_at
 * 5. Attempt to update a non-existent userAuthenticationId and ensure error is
 *    raised
 * 6. Attempt to update with invalid provider/provider_key values (validation
 *    error)
 */
export async function test_api_user_authentication_update_by_admin_role(
  connection: api.IConnection,
) {
  // 1. System admin signup
  const adminJoinInput = {
    email: RandomGenerator.name(1) + "@qa-domain.com",
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(14),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Create user authentication
  const userAuthCreateInput = {
    user_id: admin.id,
    user_type: "systemadmin",
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(14),
    password_hash: null,
  } satisfies IHealthcarePlatformUserAuthentication.ICreate;
  const origAuth: IHealthcarePlatformUserAuthentication =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
      connection,
      { body: userAuthCreateInput },
    );
  typia.assert(origAuth);

  // 3. Immediate update of provider_key + updated_at
  const updatedProviderKey = RandomGenerator.alphaNumeric(20);
  const updateInput = {
    provider_key: updatedProviderKey,
    updated_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformUserAuthentication.IUpdate;
  const updatedAuth: IHealthcarePlatformUserAuthentication =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.update(
      connection,
      { userAuthenticationId: origAuth.id, body: updateInput },
    );
  typia.assert(updatedAuth);
  TestValidator.notEquals(
    "provider_key changed",
    updatedAuth.provider_key,
    origAuth.provider_key,
  );
  TestValidator.equals(
    "provider_key updated correctly",
    updatedAuth.provider_key,
    updatedProviderKey,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedAuth.updated_at).getTime() >
      new Date(origAuth.updated_at).getTime(),
  );

  // 4. Error: update non-existent userAuthenticationId
  await TestValidator.error("update non-existent id should error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.update(
      connection,
      {
        userAuthenticationId: typia.random<string & tags.Format<"uuid">>(),
        body: updateInput,
      },
    );
  });

  // 5. Error: update with invalid provider (not allowed by schema)
  await TestValidator.error(
    "update with empty provider_key validation error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.update(
        connection,
        {
          userAuthenticationId: origAuth.id,
          body: {
            provider_key: "",
            updated_at: new Date().toISOString(),
          } satisfies IHealthcarePlatformUserAuthentication.IUpdate,
        },
      );
    },
  );
}
