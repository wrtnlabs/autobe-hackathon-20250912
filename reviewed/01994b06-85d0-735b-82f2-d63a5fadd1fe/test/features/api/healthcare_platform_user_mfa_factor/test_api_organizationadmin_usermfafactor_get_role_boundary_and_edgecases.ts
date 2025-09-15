import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";

/**
 * Test org-admin user MFA factor detail lookup with RBAC/edge/error coverage
 *
 * Steps:
 *
 * 1. Register/join as organization admin A and login
 * 2. Create MFA factor for admin A
 * 3. Fetch MFA factor by ID as A (should succeed)
 * 4. Register/join as organization admin B and login
 * 5. Try to fetch A's MFA factor as B (should error/deny)
 * 6. Try to fetch with unauthenticated connection (should error/deny)
 * 7. Try to fetch using random non-existent ID (should error/not found)
 */
export async function test_api_organizationadmin_usermfafactor_get_role_boundary_and_edgecases(
  connection: api.IConnection,
) {
  // 1. Create and register org admin A
  const orgA_email = typia.random<string & tags.Format<"email">>();
  const orgA_joined = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgA_email,
        full_name: RandomGenerator.name(),
        password: "TestPassword123!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgA_joined);

  // 2. Create MFA factor for org admin A
  const mfaA_input = {
    user_id: orgA_joined.id,
    user_type: "orgadmin",
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
  const mfaA =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.create(
      connection,
      {
        body: mfaA_input,
      },
    );
  typia.assert(mfaA);

  // 3. Fetch MFA factor by ID as A (success - all fields correct)
  const mfaA_fetched =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.at(
      connection,
      {
        userMfaFactorId: mfaA.id,
      },
    );
  typia.assert(mfaA_fetched);
  TestValidator.equals(
    "should return correct MFA factor data",
    mfaA_fetched.id,
    mfaA.id,
  );

  // 4. Register/join as organization admin B
  const orgB_email = typia.random<string & tags.Format<"email">>();
  const orgB_joined = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgB_email,
        full_name: RandomGenerator.name(),
        password: "AnotherTestPassword123!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgB_joined);

  // 5. Try to get A's MFA factor from B's session (RBAC fail)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgB_email,
      password: "AnotherTestPassword123!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "B is denied access to A's MFA factor",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.at(
        connection,
        {
          userMfaFactorId: mfaA.id,
        },
      );
    },
  );

  // 6. Try with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated user is denied MFA factor access",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.at(
        unauthConn,
        {
          userMfaFactorId: mfaA.id,
        },
      );
    },
  );

  // 7. Try to get non-existent MFA factor by random ID
  await TestValidator.error(
    "Lookup by random non-existent ID is not found/denied",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.at(
        connection,
        {
          userMfaFactorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
