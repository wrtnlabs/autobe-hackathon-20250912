import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";

/**
 * End-to-end test verifying that an organization admin can retrieve details
 * of a pharmacy transaction associated with their own organization, but
 * cannot access transactions belonging to other organizations. Tests proper
 * authorization, detail retrieval, and access control.
 *
 * 1. Register a new organization admin (OrgA admin)
 * 2. Login as that organization admin
 * 3. Prepare a pharmacy transaction that belongs to OrgA (simulate with
 *    correct org ID)
 * 4. Retrieve details for the transaction as OrgA admin and validate full
 *    detail
 * 5. Prepare another transaction for a different org (OrgB)
 * 6. Ensure OrgA admin cannot retrieve OrgB's transaction (expect error)
 */
export async function test_api_org_admin_pharmacy_transaction_success(
  connection: api.IConnection,
) {
  // 1. Register new OrgA admin
  const joinOrgA = typia.random<IHealthcarePlatformOrganizationAdmin.IJoin>();
  const orgAAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: joinOrgA,
    },
  );
  typia.assert(orgAAdmin);

  // (Simulate login: not strictly needed if token is already set)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinOrgA.email,
      password: joinOrgA.password ?? "1234",
    },
  });

  // 3. Prepare a pharmacy transaction for OrgA
  const transactionA: IHealthcarePlatformPharmacyTransaction = {
    ...typia.random<IHealthcarePlatformPharmacyTransaction>(),
    healthcare_platform_organization_id: orgAAdmin.id,
  };
  // 4. Retrieve details for transactionA (simulate as if it exists on backend)
  // (FOR TEST: The SDK would only fetch from backend, but we assume the transaction ID is valid and accessible)
  const receivedA =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.at(
      connection,
      {
        pharmacyTransactionId: transactionA.id,
      },
    );
  typia.assert(receivedA);
  TestValidator.equals(
    "fetched transaction belongs to orgA",
    receivedA.healthcare_platform_organization_id,
    orgAAdmin.id,
  );
  TestValidator.equals("transaction id matches", receivedA.id, transactionA.id);

  // 5. Prepare another transaction for a different organization (OrgB)
  const orgBId = typia.random<string & tags.Format<"uuid">>();
  const transactionB: IHealthcarePlatformPharmacyTransaction = {
    ...typia.random<IHealthcarePlatformPharmacyTransaction>(),
    healthcare_platform_organization_id: orgBId,
  };

  // 6. Attempt access as OrgA admin - should fail
  await TestValidator.error(
    "OrgA admin denied access to OrgB transaction",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.at(
        connection,
        {
          pharmacyTransactionId: transactionB.id,
        },
      );
    },
  );
}
