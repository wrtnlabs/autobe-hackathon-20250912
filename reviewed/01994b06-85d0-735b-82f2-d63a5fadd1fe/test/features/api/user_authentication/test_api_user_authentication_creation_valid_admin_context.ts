import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";

/**
 * Validates creation of user authentication entries in the healthcare
 * platform.
 *
 * This test verifies that a system admin after joining can create a user
 * authentication record for a given user id and user type with a valid
 * provider and provider_key. It covers both the success path and multiple
 * edge/business error cases.
 *
 * Steps:
 *
 * 1. Join as a system admin (platform registration)
 * 2. Create a user authentication record for that admin using valid details
 *    (provider: "local", provider_key: admin email, user_type:
 *    "systemadmin")
 * 3. Validate the created record matches the input and is returned correctly
 * 4. Attempt to create another user authentication record with a duplicate
 *    (provider,provider_key,user_type,user_id) -- must get error (duplicate
 *    constraint)
 * 5. Try with a non-existent user_id -- must be rejected
 * 6. Try with an unsupported provider value such as "invalidProvider" -- must
 *    get error
 */
export async function test_api_user_authentication_creation_valid_admin_context(
  connection: api.IConnection,
) {
  // 1. Join as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin: IHealthcarePlatformSystemAdmin.IJoin = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  };
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: adminJoin });
  typia.assert(admin);

  // 2. Create authentication record for the admin
  const authBody = {
    user_id: admin.id,
    user_type: "systemadmin",
    provider: "local",
    provider_key: admin.email,
  } satisfies IHealthcarePlatformUserAuthentication.ICreate;
  const auth =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
      connection,
      { body: authBody },
    );
  typia.assert(auth);
  TestValidator.equals(
    "created authentication record user_id matches",
    auth.user_id,
    admin.id,
  );
  TestValidator.equals(
    "created authentication provider matches",
    auth.provider,
    "local",
  );
  TestValidator.equals(
    "created authentication provider_key matches",
    auth.provider_key,
    admin.email,
  );
  TestValidator.equals(
    "created authentication user_type matches",
    auth.user_type,
    "systemadmin",
  );

  // 3. Duplicate creation attempt (identical provider/provider_key/user_type/user_id)
  await TestValidator.error(
    "should not create duplicate authentication record",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
        connection,
        { body: authBody },
      );
    },
  );

  // 4. Create with non-existent user_id
  const nonExistentUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should not create auth record for non-existent user_id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
        connection,
        {
          body: {
            ...authBody,
            user_id: nonExistentUserId,
          } satisfies IHealthcarePlatformUserAuthentication.ICreate,
        },
      );
    },
  );

  // 5. Invalid provider value
  await TestValidator.error(
    "should reject unsupported provider value",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
        connection,
        {
          body: {
            ...authBody,
            provider: "invalidProvider",
          } satisfies IHealthcarePlatformUserAuthentication.ICreate,
        },
      );
    },
  );
}
