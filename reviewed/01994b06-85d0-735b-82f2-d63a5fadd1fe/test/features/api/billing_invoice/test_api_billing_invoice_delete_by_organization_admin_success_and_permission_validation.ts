import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates organization admin can delete their billing invoice, handles
 * double delete attempts, and enforces permission boundaries.
 *
 * 1. Register and login as organization admin.
 * 2. Create a new valid billing invoice.
 * 3. Perform DELETE as the admin, confirm success (no error, no content).
 * 4. Try DELETE again (should fail with 404 Not Found).
 * 5. Use an unauthenticated connection to attempt DELETE, expect 401/403
 *    error.
 */
export async function test_api_billing_invoice_delete_by_organization_admin_success_and_permission_validation(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "AdminSecret1234!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Login as admin
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminSecret1234!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 3. Create billing invoice
  const billingInvoiceCreate =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          // Synthetic, but valid data. Reuse admin organization_id as needed.
          organization_id: adminJoin.id satisfies string as string,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          invoice_number: RandomGenerator.alphaNumeric(12),
          status: "draft",
          total_amount: 1000,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(billingInvoiceCreate);
  const billingInvoiceId = billingInvoiceCreate.id;

  // 4. Successfully delete as admin
  await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.erase(
    connection,
    {
      billingInvoiceId,
    },
  );

  // 5. Double delete (should fail)
  await TestValidator.error(
    "deleting already deleted billing invoice fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.erase(
        connection,
        {
          billingInvoiceId,
        },
      );
    },
  );

  // 6. Unauthorized user tries to delete (expect 401/403)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot delete billing invoice",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.erase(
        unauthConn,
        {
          billingInvoiceId,
        },
      );
    },
  );
}
