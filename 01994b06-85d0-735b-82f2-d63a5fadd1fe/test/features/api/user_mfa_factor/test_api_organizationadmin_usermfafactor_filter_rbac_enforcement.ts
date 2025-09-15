import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserMfaFactor";

/**
 * Test RBAC enforcement and filter logic for MFA factor search (PATCH
 * /healthcarePlatform/organizationAdmin/userMfaFactors) as org admin.
 *
 * 1. Register and log in as org admin
 * 2. Create a MFA factor for self
 * 3. Search MFA factors by own user_id; check that result includes the created
 *    record
 * 4. Search for MFA factors with a user_id outside own org: confirm denial/empty
 * 5. Pagination: verify correct behavior for limit/page
 */
export async function test_api_organizationadmin_usermfafactor_filter_rbac_enforcement(
  connection: api.IConnection,
) {
  // 1. Register an organization admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinInput },
  );
  typia.assert(orgAdmin);

  // 2. Login is already implicit; can call again for session
  const loginOutput = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: joinInput.email,
        password: joinInput.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginOutput);

  // 3. Create MFA factor for the admin (acting as a user)
  const mfaInput = {
    user_id: orgAdmin.id,
    user_type: "orgadmin",
    factor_type: RandomGenerator.pick([
      "totp",
      "sms",
      "email",
      "webauthn",
      "backup",
    ] as const),
    factor_value: RandomGenerator.alphaNumeric(32),
    priority: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IHealthcarePlatformUserMfaFactor.ICreate;
  const mfa =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.create(
      connection,
      { body: mfaInput },
    );
  typia.assert(mfa);

  // 4. Search MFA factors by user_id (should see the created factor)
  const result1 =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.index(
      connection,
      {
        body: {
          user_id: orgAdmin.id,
        } satisfies IHealthcarePlatformUserMfaFactor.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.predicate(
    "search result includes created MFA factor",
    result1.data.some((f) => f.id === mfa.id),
  );

  // 5. RBAC: try searching with a random user_id not in org, should be empty
  const unknownUserId = typia.random<string & tags.Format<"uuid">>();
  const result2 =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.index(
      connection,
      {
        body: {
          user_id: unknownUserId,
        } satisfies IHealthcarePlatformUserMfaFactor.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "RBAC: query by foreign user_id yields no results",
    result2.data,
    [],
  );

  // 6. Pagination logic: add more MFA factors, test limit/page
  const mfaFactors = [mfa];
  for (let i = 0; i < 4; ++i) {
    const more =
      await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.create(
        connection,
        {
          body: {
            ...mfaInput,
            factor_type: RandomGenerator.pick([
              "totp",
              "sms",
              "email",
              "webauthn",
              "backup",
            ] as const),
            factor_value: RandomGenerator.alphaNumeric(32),
            priority: mfaInput.priority + i + 1,
          },
        },
      );
    typia.assert(more);
    mfaFactors.push(more);
  }
  // Page size 2, page 1
  const page1 =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.index(
      connection,
      {
        body: {
          user_id: orgAdmin.id,
          page: 1,
          limit: 2,
        } satisfies IHealthcarePlatformUserMfaFactor.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1: correct limit", page1.data.length, 2);
  // Page size 2, page 2
  const page2 =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.index(
      connection,
      {
        body: {
          user_id: orgAdmin.id,
          page: 2,
          limit: 2,
        } satisfies IHealthcarePlatformUserMfaFactor.IRequest,
      },
    );
  typia.assert(page2);
  // Over-limit page (no data)
  const pageOverflow =
    await api.functional.healthcarePlatform.organizationAdmin.userMfaFactors.index(
      connection,
      {
        body: {
          user_id: orgAdmin.id,
          page: 100,
          limit: 2,
        } satisfies IHealthcarePlatformUserMfaFactor.IRequest,
      },
    );
  typia.assert(pageOverflow);
  TestValidator.equals("overflow page: empty results", pageOverflow.data, []);
}
