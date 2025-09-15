import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";

/**
 * Validates end-to-end workflow for registering an MFA factor for an
 * organization admin.
 *
 * 1. Register an organization admin account
 * 2. Login as the org admin
 * 3. Register a new MFA factor for this admin (factor_type 'totp', priority 0,
 *    is_active true, etc).
 * 4. Validate proper linkage in response, type assertion, and uniqueness
 *    enforcement on duplicate attempt.
 * 5. Attempt creation without authentication (expect error).
 */
export async function test_api_user_mfa_factor_creation_for_organization_admin(
  connection: api.IConnection,
) {
  // 1. Create organization admin and log in to get tokens
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const full_name = RandomGenerator.name();
  const phone = RandomGenerator.mobile();

  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email,
      full_name,
      phone,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(admin);

  // Login (token should still be set, but repeat to assert login flow)
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email,
        password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);
  TestValidator.equals(
    "organization admin id matches",
    adminLogin.id,
    admin.id,
  );

  // 2. Register MFA factor (TOTP)
  const mfaBody = {
    user_id: admin.id,
    user_type: "orgadmin",
    factor_type: "totp",
    factor_value: RandomGenerator.alphaNumeric(32),
    priority: 0,
    is_active: true,
  } satisfies IHealthcarePlatformUserMfaFactor.ICreate;

  const mfa =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.create(
      connection,
      {
        body: mfaBody,
      },
    );
  typia.assert(mfa);
  TestValidator.equals("MFA user_id matches admin id", mfa.user_id, admin.id);
  TestValidator.equals("MFA factor_type is totp", mfa.factor_type, "totp");
  TestValidator.equals("MFA is_active is true", mfa.is_active, true);
  TestValidator.equals("MFA priority is 0", mfa.priority, 0);
  TestValidator.equals("MFA user_type is orgadmin", mfa.user_type, "orgadmin");

  // 3. Attempt duplicate MFA (should fail; uniqueness enforcement)
  await TestValidator.error("duplicate MFA factor creation fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.create(
      connection,
      {
        body: mfaBody,
      },
    );
  });

  // 4. Attempt creation without authentication (unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "MFA creation without authentication fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.create(
        unauthConn,
        {
          body: mfaBody,
        },
      );
    },
  );
}
