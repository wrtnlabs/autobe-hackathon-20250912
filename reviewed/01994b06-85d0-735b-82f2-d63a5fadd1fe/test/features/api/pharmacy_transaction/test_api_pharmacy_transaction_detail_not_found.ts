import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate 404 (not found) handling for non-existent pharmacy transaction
 * retrieval by system admin.
 *
 * 1. Register system admin for authorization.
 * 2. Authenticate/login as the system admin.
 * 3. Attempt to access a fake/non-existent transaction (random UUID).
 * 4. Assert a not found error is returned.
 * 5. (Bonus) If possible, provide direction for confirming audit log registration
 *    (cannot be directly checked at this API layer).
 */
export async function test_api_pharmacy_transaction_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail =
    `${RandomGenerator.alphaNumeric(10)}@enterprise-corp.com` as string &
      tags.Format<"email">;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminFullName = RandomGenerator.name(2);
  const provider = "local";

  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      provider,
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinResult);

  // 2. Login as system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider,
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. Attempt to retrieve a non-existent pharmacy transaction
  const fakePharmacyTransactionId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "non-existent pharmacy transaction retrieval should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.pharmacyTransactions.at(
        connection,
        {
          pharmacyTransactionId: fakePharmacyTransactionId,
        },
      );
    },
  );
  // 4. (Bonus) Audit log step: cannot be directly checked via this interface; verification of audit trail would require elevated monitoring or indirect admin access.
}
