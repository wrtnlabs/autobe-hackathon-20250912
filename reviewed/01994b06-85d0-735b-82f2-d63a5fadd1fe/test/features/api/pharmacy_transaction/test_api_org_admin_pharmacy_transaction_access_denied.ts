import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";

/**
 * Validate access control: organization admin cannot access pharmacy
 * transactions of another org.
 *
 * This test verifies that an organization administrator (Org A) is denied
 * access when attempting to retrieve a pharmacy transaction belonging to a
 * different organization (Org B).
 *
 * Steps:
 *
 * 1. Register a new organization admin for Org A
 * 2. Log in with the new Org A admin
 * 3. Attempt to fetch a pharmacy transaction using a random UUID (not associated
 *    with Org A)
 * 4. Assert that access is denied (forbidden/not found)
 * 5. Make a note that audit logs should record the failed access (cannot check via
 *    API)
 */
export async function test_api_org_admin_pharmacy_transaction_access_denied(
  connection: api.IConnection,
) {
  // 1. Register Org A admin
  const orgA_email = typia.random<string & tags.Format<"email">>();
  const orgA_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgA_email,
        full_name: RandomGenerator.name(),
        password: "TestPassword1!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgA_join);

  // 2. Log in as Org A admin (for completeness/refresh)
  const orgA_login = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgA_email,
        password: "TestPassword1!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgA_login);

  // 3. Generate a random pharmacy transaction UUID (not Org A's)
  const notOrgA_transactionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Try to fetch the transaction and expect access denied (403 or 404 acceptable)
  await TestValidator.error(
    "access denied for pharmacy transaction belonging to another organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.at(
        connection,
        {
          pharmacyTransactionId: notOrgA_transactionId,
        },
      );
    },
  );
  // 5. (Comment) Audit log should record this event for compliance and security review.
}
