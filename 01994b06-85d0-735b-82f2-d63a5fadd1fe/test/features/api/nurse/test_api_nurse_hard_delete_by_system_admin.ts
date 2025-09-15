import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates that a system admin can permanently (soft) delete a nurse record by
 * nurseId and deletion is idempotent and protected against invalid IDs.
 *
 * Steps:
 *
 * 1. Register a system admin (with unique business email).
 * 2. Login as the system admin to receive access token and context.
 * 3. Register a nurse user (using unique nurse email/license_number), recording
 *    the nurseId.
 * 4. As system admin, invoke nurse deletion endpoint for that nurseId.
 * 5. Attempt to delete again (should handle idempotency gracefully or return not
 *    found).
 * 6. Attempt to delete a truly random (non-existent) UUID (should yield a proper
 *    error, caught and validated via error check).
 * 7. (Note: GET/list endpoints for nurses are not in scope; only deletion and
 *    error contracts can be validated here).
 */
export async function test_api_nurse_hard_delete_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail =
    "admin_" + RandomGenerator.alphaNumeric(8) + "@enterprise-health.com";
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Login as system admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Register a nurse
  const nurseEmail =
    "nurse_" + RandomGenerator.alphaNumeric(8) + "@hospital.org";
  const nurseLicense = RandomGenerator.alphaNumeric(10);
  const nursePassword = RandomGenerator.alphaNumeric(10);
  const nurseJoin = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: nurseLicense,
      password: nursePassword,
      phone: RandomGenerator.mobile(),
      specialty: RandomGenerator.name(1),
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurseJoin);

  // 4. Delete nurse by nurseId
  await api.functional.healthcarePlatform.systemAdmin.nurses.erase(connection, {
    nurseId: nurseJoin.id,
  });
  // Idempotency: deleting again (should error or handle idempotency)
  await TestValidator.error(
    "re-deleting same nurse should error or handle idempotently",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.nurses.erase(
        connection,
        {
          nurseId: nurseJoin.id,
        },
      );
    },
  );
  // 5. Error: deleting a non-existent nurseId
  await TestValidator.error(
    "deleting unknown nurseId should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.nurses.erase(
        connection,
        {
          nurseId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
