import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";

/**
 * E2E test for successful deletion of an organization admin user's MFA
 * factor.
 *
 * This test ensures correct end-to-end support for removing an MFA factor
 * by an admin:
 *
 * 1. Register a new organization admin (random unique data)
 * 2. Log in as this admin (initialize session)
 * 3. Add an MFA factor for the admin's user record (totp)
 * 4. Delete the MFA factor using the correct DELETE API and id
 * 5. Validate proper response (success/void, no errors)
 *
 * Edge/error cases (such as deleting a non-existent or someone else's
 * factor) are not covered here.
 */
export async function test_api_delete_organization_admin_user_mfa_factor_success_case(
  connection: api.IConnection,
) {
  // 1. Register an organization admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinResult = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email,
        full_name: RandomGenerator.name(),
        password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(joinResult);

  // 2. Log in as the organization admin (ensures session/token updated)
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email,
        password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResult);
  TestValidator.equals(
    "admin ID must match after login",
    loginResult.id,
    joinResult.id,
  );

  // 3. Create an MFA factor using the admin's user id
  const mfaCreate =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.create(
      connection,
      {
        body: {
          user_id: loginResult.id,
          user_type: "orgadmin",
          factor_type: "totp",
          factor_value: RandomGenerator.alphaNumeric(20),
          priority: 0,
          is_active: true,
        } satisfies IHealthcarePlatformUserMfaFactor.ICreate,
      },
    );
  typia.assert(mfaCreate);
  TestValidator.equals(
    "admin id for created MFA factor",
    mfaCreate.user_id,
    loginResult.id,
  );

  // 4. Delete the MFA factor
  const deleteResult =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.erase(
      connection,
      {
        userMfaFactorId: mfaCreate.id,
      },
    );
  // API returns void (204 or similar)
  TestValidator.equals(
    "MFA factor delete returns void",
    deleteResult,
    undefined,
  );
}
