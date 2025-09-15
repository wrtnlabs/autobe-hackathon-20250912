import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate successful soft deletion and permission enforcement for billing
 * invoice deletion.
 *
 * 1. Register and authenticate a system admin (superuser)
 * 2. System admin creates a billing invoice
 * 3. System admin deletes the billing invoice
 * 4. Attempting to re-delete deleted invoice returns an error (since no GET
 *    endpoint is provided)
 * 5. Deletion as unauthenticated user is denied
 * 6. Deletion of a random non-existent invoice returns error
 */
export async function test_api_billing_invoice_delete_by_system_admin_success_and_permission_validation(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysadminEmail = RandomGenerator.name(1) + "@enterprise-corp.com";
  const sysadminBody = {
    email: sysadminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: sysadminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysadminBody,
  });
  typia.assert(sysadmin);

  // 2. System admin creates a billing invoice
  const billBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(12),
    status: "draft",
    total_amount: 1000,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.create(
      connection,
      { body: billBody },
    );
  typia.assert(invoice);

  // 3. System admin deletes the invoice
  await api.functional.healthcarePlatform.systemAdmin.billingInvoices.erase(
    connection,
    { billingInvoiceId: invoice.id },
  );

  // 4. Attempting to re-delete deleted invoice returns error (simulates not found; GET not available)
  await TestValidator.error("re-delete deleted invoice fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.erase(
      connection,
      { billingInvoiceId: invoice.id },
    );
  });

  // 5. Try deleting as unauthenticated connection (no Authorization header)
  const anonConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated user denied delete", async () => {
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.erase(
      anonConn,
      { billingInvoiceId: invoice.id },
    );
  });

  // 6. Try deleting random non-existent invoice
  await TestValidator.error("delete nonexistent invoice fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.erase(
      connection,
      { billingInvoiceId: typia.random<string & tags.Format<"uuid">>() },
    );
  });
}
