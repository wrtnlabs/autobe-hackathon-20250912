import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";

/**
 * Validates successful deletion of a system admin's user MFA factor.
 *
 * 1. Register a system admin user via POST /auth/systemAdmin/join.
 * 2. Log in as that admin to establish authenticated context.
 * 3. Create a new MFA factor for the admin using POST
 *    /healthcarePlatform/systemAdmin/userMfaFactors.
 * 4. Delete the created MFA factor using DELETE
 *    /healthcarePlatform/systemAdmin/userMfaFactors/{userMfaFactorId}.
 *
 * Validation:
 *
 * - The operation should succeed (no thrown error, void return).
 * - The deleted MFA factor should no longer exist (could not check by listing
 *   since no index/get endpoint is given).
 * - Deletion action does not break ability to log in again with fallback
 *   methods (cannot simulate MFA at this API layer as per provided APIs, so
 *   only basic login repeat can be tested for regression).
 * - Attempting to delete the same MFA factor again should result in an error.
 * - Auth and permissions are handled by obtaining an admin JWT via login/join
 *   steps.
 */
export async function test_api_delete_system_admin_user_mfa_factor_success_case(
  connection: api.IConnection,
) {
  // Step 1: Register a new system admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // Step 2: Log in as that admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinInput.email,
      provider: "local",
      provider_key: joinInput.email,
      password: joinInput.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Create a new MFA factor for the admin
  const mfaInput = {
    user_id: admin.id,
    user_type: "systemadmin",
    factor_type: RandomGenerator.pick([
      "totp",
      "sms",
      "email",
      "webauthn",
      "backup",
    ] as const),
    factor_value: RandomGenerator.alphaNumeric(32),
    priority: 0,
    is_active: true,
  } satisfies IHealthcarePlatformUserMfaFactor.ICreate;
  const factor =
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.create(
      connection,
      {
        body: mfaInput,
      },
    );
  typia.assert(factor);

  // Step 4: Delete the created MFA factor (should succeed, no return)
  await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.erase(
    connection,
    {
      userMfaFactorId: factor.id,
    },
  );

  // Attempt to delete again - should produce an error
  await TestValidator.error(
    "Deleting the same MFA factor again must fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.erase(
        connection,
        { userMfaFactorId: factor.id },
      );
    },
  );

  // Regression: Admin can still login again
  const loginAgain = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinInput.email,
      provider: "local",
      provider_key: joinInput.email,
      password: joinInput.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginAgain);
  TestValidator.equals(
    "Admin re-login after MFA deletion succeeds",
    loginAgain.id,
    admin.id,
  );
}
