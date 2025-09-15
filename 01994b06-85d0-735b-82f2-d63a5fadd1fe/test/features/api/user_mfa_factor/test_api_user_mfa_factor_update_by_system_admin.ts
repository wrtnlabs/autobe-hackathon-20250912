import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";

/**
 * E2E scenario for updating a system admin's MFA factor. Covers successful
 * update and error cases.
 *
 * 1. Register new system admin with local provider (email, name, password)
 * 2. Login as system admin
 * 3. Register new MFA factor (e.g. TOTP) for self
 * 4. Update MFA factor fields with valid data
 * 5. Verify only mutable fields (priority, is_active, factor_value) change, others
 *    are immutable
 * 6. Error: Try to update non-existent MFA factor (random UUID)
 * 7. Error: Try update without authentication (empty headers)
 * 8. Error: Update with invalid values (negative priority, empty factor_value for
 *    totp) triggers business violation
 */
export async function test_api_user_mfa_factor_update_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register new system admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(6),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login (should refresh session with updated token)
  const loginResp = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinBody.email,
      provider: joinBody.provider,
      provider_key: joinBody.provider_key,
      password: joinBody.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResp);

  // 3. Register new MFA factor
  const mfaCreateBody = {
    user_id: admin.id,
    user_type: "systemadmin",
    factor_type: RandomGenerator.pick([
      "totp",
      "email",
      "sms",
      "backup",
      "webauthn",
    ] as const),
    factor_value: RandomGenerator.alphaNumeric(8),
    priority: 0,
    is_active: true,
  } satisfies IHealthcarePlatformUserMfaFactor.ICreate;
  const mfa =
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.create(
      connection,
      { body: mfaCreateBody },
    );
  typia.assert(mfa);

  // 4. Update MFA factor's is_active flag and priority
  const updatedFields = {
    is_active: !mfa.is_active,
    priority: mfa.priority + 1,
    factor_value: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformUserMfaFactor.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.update(
      connection,
      {
        userMfaFactorId: mfa.id,
        body: updatedFields,
      },
    );
  typia.assert(updated);
  TestValidator.equals("id must not change", mfa.id, updated.id);
  TestValidator.notEquals(
    "updated_at must change after update",
    updated.updated_at,
    mfa.updated_at,
  );
  TestValidator.equals("user_id must not change", mfa.user_id, updated.user_id);
  TestValidator.equals(
    "factor_type persists unless changed",
    mfa.factor_type,
    updated.factor_type,
  );
  TestValidator.equals(
    "mutated status",
    updated.is_active,
    updatedFields.is_active,
  );
  TestValidator.equals(
    "mutated priority",
    updated.priority,
    updatedFields.priority,
  );
  TestValidator.equals(
    "mutated factor_value",
    updated.factor_value,
    updatedFields.factor_value,
  );

  // 5. Error: Update non-existent record
  await TestValidator.error("update non-existent MFA factor", async () => {
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.update(
      connection,
      {
        userMfaFactorId: typia.random<string & tags.Format<"uuid">>(),
        body: updatedFields,
      },
    );
  });

  // 6. Error: Update with no authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("update with no authentication fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.update(
      unauthConn,
      {
        userMfaFactorId: mfa.id,
        body: updatedFields,
      },
    );
  });

  // 7. Error: Business violation (priority negative)
  await TestValidator.error("update with negative priority fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.update(
      connection,
      {
        userMfaFactorId: mfa.id,
        body: { priority: -1 },
      },
    );
  });

  // 8. Error: Business violation (empty factor_value for totp)
  if (mfa.factor_type === "totp") {
    await TestValidator.error(
      "update with empty TOTP secret fails",
      async () => {
        await api.functional.healthcarePlatform.systemAdmin.userMfaFactors.update(
          connection,
          {
            userMfaFactorId: mfa.id,
            body: { factor_value: "" },
          },
        );
      },
    );
  }
}
