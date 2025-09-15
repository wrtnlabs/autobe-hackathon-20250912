import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";

/**
 * Validate system admin GET MFA factor detail access and permission boundaries.
 *
 * 1. Create system admin (join), login
 * 2. Create MFA factor for that admin
 * 3. Retrieve MFA factor by ID, asserting field equality
 * 4. Try GET with nonexistent UUID, expecting error
 * 5. Create 2nd admin / login as 2nd admin, try GET as 2nd admin = error.
 */
export async function test_api_systemadmin_usermfafactor_get_success_and_permission(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminEmail = RandomGenerator.alphaNumeric(12) + "@business-corp.com";
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: adminEmail,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Create MFA factor for this system admin
  const mfaCreateBody = {
    user_id: adminAuth.id,
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
  const mfaFactor =
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.create(
      connection,
      { body: mfaCreateBody },
    );
  typia.assert(mfaFactor);

  // 3. Retrieve MFA factor by ID (should succeed)
  const getMfa =
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.at(
      connection,
      { userMfaFactorId: mfaFactor.id },
    );
  typia.assert(getMfa);
  TestValidator.equals(
    "retrieve: mfa factor matches create",
    getMfa.user_id,
    mfaCreateBody.user_id,
  );
  TestValidator.equals(
    "retrieve: mfa factor user_type",
    getMfa.user_type,
    mfaCreateBody.user_type,
  );
  TestValidator.equals(
    "retrieve: mfa factor factor_type",
    getMfa.factor_type,
    mfaCreateBody.factor_type,
  );
  TestValidator.equals(
    "retrieve: mfa factor value",
    getMfa.factor_value,
    mfaCreateBody.factor_value,
  );
  TestValidator.equals(
    "retrieve: mfa factor priority",
    getMfa.priority,
    mfaCreateBody.priority,
  );
  TestValidator.equals(
    "retrieve: mfa factor is_active",
    getMfa.is_active,
    mfaCreateBody.is_active,
  );
  TestValidator.equals("retrieve: mfa factor id", getMfa.id, mfaFactor.id);

  // 4. Try GET with fake/unused UUID (not in DB)
  await TestValidator.error("non-existent MFA UUID get must fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.at(
      connection,
      {
        userMfaFactorId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 5. Create second system admin, login
  const admin2Email = RandomGenerator.alphaNumeric(12) + "@business-corp.com";
  const admin2Password = RandomGenerator.alphaNumeric(16);
  const admin2JoinBody = {
    email: admin2Email,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: admin2Email,
    password: admin2Password,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin2Auth = await api.functional.auth.systemAdmin.join(connection, {
    body: admin2JoinBody,
  });
  typia.assert(admin2Auth);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: admin2Email,
      provider: "local",
      provider_key: admin2Email,
      password: admin2Password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 6. Try to get the 1st admin's MFA factor as 2nd admin (should error)
  await TestValidator.error(
    "RBAC: admin2 cannot get admin1's mfa factor",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.at(
        connection,
        {
          userMfaFactorId: mfaFactor.id,
        },
      );
    },
  );
}
