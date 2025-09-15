import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";

/**
 * End-to-end test for registering an MFA factor for a system admin.
 *
 * 1. Admin joins (registers) with a unique business email and local provider,
 *    providing compliant full name and password; typia asserts output.
 * 2. Admin logs in with correct credentials, asserting authentication and non-null
 *    token returned.
 * 3. Creates a TOTP MFA factor attached to own account: user_id is authorized.id,
 *    user_type is 'systemadmin', pick one of ["totp", "sms"] for factor_type,
 *    random factor_value, priority=0, is_active=true. Assert the API's response
 *    user_id, user_type, and factor_type equal the request, response passes
 *    typia.assert, is_active matches, priority matches.
 * 4. [Failure] Using a connection with empty headers (unauthenticated), POST
 *    should be rejected.
 * 5. [Failure] Repeat same body as (3) to check duplicate
 *    (factor_type+factor_value uniqueness by user): assert business logic
 *    error.
 * 6. [Failure] Try creating factor with empty factor_value, expect error. No type
 *    errors are tested—instead business rule errors.
 */
export async function test_api_user_mfa_factor_creation_for_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string =
    RandomGenerator.name(2).replace(/\s+/g, ".") + "@company.com";
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminFullName: string = RandomGenerator.name(2);
  const joinRes: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(joinRes);
  TestValidator.equals("registered email matches", joinRes.email, adminEmail);
  TestValidator.equals(
    "registered full name matches",
    joinRes.full_name,
    adminFullName,
  );
  // 2. Login as admin
  const loginRes: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(loginRes);
  TestValidator.equals("login email matches", loginRes.email, adminEmail);
  // 3. Create a new MFA factor for self (system admin)
  const factorType = RandomGenerator.pick(["totp", "sms"] as const);
  const factorValue = RandomGenerator.alphaNumeric(32);
  const mfaReq = {
    user_id: loginRes.id,
    user_type: "systemadmin",
    factor_type: factorType,
    factor_value: factorValue,
    priority: 0,
    is_active: true,
  } satisfies IHealthcarePlatformUserMfaFactor.ICreate;
  const mfaFactor: IHealthcarePlatformUserMfaFactor =
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.create(
      connection,
      { body: mfaReq },
    );
  typia.assert(mfaFactor);
  TestValidator.equals(
    "MFA user_id matches request",
    mfaFactor.user_id,
    loginRes.id,
  );
  TestValidator.equals(
    "MFA user_type matches request",
    mfaFactor.user_type,
    "systemadmin",
  );
  TestValidator.equals(
    "MFA factor_type matches request",
    mfaFactor.factor_type,
    factorType,
  );
  TestValidator.equals(
    "MFA value matches request",
    mfaFactor.factor_value,
    factorValue,
  );
  TestValidator.equals("MFA priority matches request", mfaFactor.priority, 0);
  TestValidator.equals(
    "MFA is_active matches request",
    mfaFactor.is_active,
    true,
  );
  // 4. [Error] Create with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated MFA factor creation should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.create(
        unauthConn,
        { body: mfaReq },
      );
    },
  );
  // 5. [Error] Duplicate MFA factor
  await TestValidator.error(
    "duplicate MFA factor for same type+value+user should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.create(
        connection,
        { body: mfaReq },
      );
    },
  );
  // 6. [Error] Create with empty factor_value (business logic)
  const badReq = { ...mfaReq, factor_value: "" };
  await TestValidator.error(
    "MFA factor creation with empty factor_value fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.create(
        connection,
        { body: badReq },
      );
    },
  );
}
