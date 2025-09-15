import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";

/**
 * Validate updating an MFA factor for an organization admin user.
 *
 * This test covers:
 *
 * 1. Register an organization admin (join)
 * 2. Authenticate as the admin (login)
 * 3. Create a new user MFA factor (e.g., TOTP)
 * 4. Update that MFA factor with changed fields (enabled/priority/value/type)
 * 5. Assert that update is persisted and user linkage is maintained
 * 6. Validate error handling for updating with a bad id (not found), unauthorized
 *    access, and locked/system-protected factors.
 */
export async function test_api_user_mfa_factor_update_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Authenticate (redundant, triggers token - login test)
  const loginResp = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: joinInput.email,
        password: joinInput.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResp);

  // 3. Create an MFA factor
  const mfaCreate = {
    user_id: admin.id,
    user_type: "orgadmin",
    factor_type: RandomGenerator.pick([
      "totp",
      "sms",
      "email",
      "backup",
    ] as const),
    factor_value: RandomGenerator.alphaNumeric(24),
    priority: 0,
    is_active: true,
  } satisfies IHealthcarePlatformUserMfaFactor.ICreate;
  const mfa =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.create(
      connection,
      {
        body: mfaCreate,
      },
    );
  typia.assert(mfa);

  // 4. Update the MFA factor (change fields: factor_type, value, priority, is_active, updated_at)
  const updateInput = {
    factor_type: RandomGenerator.pick([
      "totp",
      "sms",
      "email",
      "backup",
    ] as const),
    factor_value: RandomGenerator.alphaNumeric(32),
    priority: 1,
    is_active: false,
    updated_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformUserMfaFactor.IUpdate;
  const mfaUpdated =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.update(
      connection,
      {
        userMfaFactorId: mfa.id,
        body: updateInput,
      },
    );
  typia.assert(mfaUpdated);

  // 5. Assert updated fields
  TestValidator.equals(
    "factor_type updated",
    mfaUpdated.factor_type,
    updateInput.factor_type,
  );
  TestValidator.equals(
    "factor_value updated",
    mfaUpdated.factor_value,
    updateInput.factor_value,
  );
  TestValidator.equals(
    "priority updated",
    mfaUpdated.priority,
    updateInput.priority,
  );
  TestValidator.equals(
    "is_active updated",
    mfaUpdated.is_active,
    updateInput.is_active,
  );
  TestValidator.equals(
    "user_id linkage maintained",
    mfaUpdated.user_id,
    mfa.user_id,
  );

  // 6-1. Error: bad ID (not found)
  await TestValidator.error(
    "update with bad userMfaFactorId fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.update(
        connection,
        {
          userMfaFactorId: typia.random<string & tags.Format<"uuid">>(),
          body: updateInput,
        },
      );
    },
  );

  // 6-2. Error: Unauthenticated - use a fresh (unauth) connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update MFA factor as unauthenticated fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.update(
        unauthConn,
        {
          userMfaFactorId: mfa.id,
          body: updateInput,
        },
      );
    },
  );

  // 6-3. Business: Impossible to test locked/system-protected in this isolated generic test (API/DTO doesn't expose this flag), so omitted.
}
