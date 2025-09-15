import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system admin can retrieve pharmacy transaction detail after
 * successful authentication.
 *
 * Steps:
 *
 * 1. Register a new system admin with unique business email.
 * 2. Login as the system admin.
 * 3. (Precondition) Assume a pharmacy transaction exists; use a random UUID for
 *    demo.
 * 4. Use the pharmacy transaction ID to call the detail endpoint with admin's
 *    authenticated session.
 * 5. Assert the response is a valid pharmacy transaction record with correct
 *    fields returned.
 * 6. Check access works for valid role.
 * 7. Attempt with bogus UUID to validate error handling (not found).
 */
export async function test_api_pharmacy_transaction_detail_with_auth_success(
  connection: api.IConnection,
) {
  // Step 1: Register system admin
  const adminEmail = `admin+${RandomGenerator.alphabets(12)}@testcompany.com`;
  const fullName = RandomGenerator.name();
  const provider = "local";
  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: fullName,
      phone: undefined,
      provider,
      provider_key: adminEmail,
      password: "SuperSecret123!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "admin email matches input after registration",
    joinResult.email,
    adminEmail,
  );
  // Step 2: Login as system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider,
      provider_key: adminEmail,
      password: "SuperSecret123!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "admin ID after login matches registration",
    loginResult.id,
    joinResult.id,
  );
  // Step 3: Pharmacy transaction ID (simulate as random UUID)
  const pharmacyTransactionId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Retrieve pharmacy transaction detail
  const transaction =
    await api.functional.healthcarePlatform.systemAdmin.pharmacyTransactions.at(
      connection,
      {
        pharmacyTransactionId,
      },
    );
  typia.assert(transaction);
  TestValidator.equals(
    "Transaction ID of record matches input",
    transaction.id,
    pharmacyTransactionId,
  );
  TestValidator.predicate(
    "audit created_at present",
    typeof transaction.created_at === "string" && !!transaction.created_at,
  );
  TestValidator.predicate(
    "organization ID present",
    typeof transaction.healthcare_platform_organization_id === "string" &&
      !!transaction.healthcare_platform_organization_id,
  );
  // Step 5: Attempt with bogus UUID to validate error (should fail)
  const bogusId = "11111111-1111-1111-1111-000000000000" as string &
    tags.Format<"uuid">;
  await TestValidator.error(
    "Not found error for bogus pharmacy transaction ID",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.pharmacyTransactions.at(
        connection,
        {
          pharmacyTransactionId: bogusId,
        },
      );
    },
  );
}
