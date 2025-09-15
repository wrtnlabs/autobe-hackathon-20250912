import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";

/**
 * Validate that organization admins can create user authentication records for
 * users in their organization, enforcing uniqueness by provider+provider_key.
 * Test also verifies conflict detection for duplicate provider/key creation
 * attempts.
 *
 * Steps:
 *
 * 1. Join and authenticate as an org admin
 * 2. Generate user_id (uuid) and provider/provider_key
 * 3. Create a user authentication record (happy path, expect success)
 * 4. Attempt to create another with same provider/provider_key (expect error)
 */
export async function test_api_org_user_authentication_creation_success_and_conflict(
  connection: api.IConnection,
) {
  // 1. Join as org admin
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphabets(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const adminUserId = adminJoin.id;

  // 2. Prepare test user_id (simulate, e.g., test another user onboarding)
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const userType = "organizationadmin";
  const provider = "local";
  const providerKey = RandomGenerator.alphaNumeric(12);
  const passwordHash: string = RandomGenerator.alphaNumeric(24); // Simulate hashed password for the test

  // 3. Create authentication record (happy path)
  const authInput = {
    user_id: userId,
    user_type: userType,
    provider: provider,
    provider_key: providerKey,
    password_hash: passwordHash,
  } satisfies IHealthcarePlatformUserAuthentication.ICreate;

  const createdAuth =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.create(
      connection,
      {
        body: authInput,
      },
    );
  typia.assert(createdAuth);

  TestValidator.equals(
    "authentication user_id matches input",
    createdAuth.user_id,
    userId,
  );
  TestValidator.equals(
    "authentication provider matches input",
    createdAuth.provider,
    provider,
  );
  TestValidator.equals(
    "authentication provider_key matches input",
    createdAuth.provider_key,
    providerKey,
  );
  TestValidator.equals(
    "authentication user_type matches input",
    createdAuth.user_type,
    userType,
  );
  TestValidator.equals(
    "authentication password_hash matches input",
    createdAuth.password_hash,
    passwordHash,
  );

  // 4. Attempt duplicate creation (expect error)
  await TestValidator.error(
    "duplicate provider+key creation must error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.create(
        connection,
        {
          body: authInput,
        },
      );
    },
  );
}
