import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E: Test system admin's multi-tenant billing invoice access, RBAC, error
 * handling.
 *
 * 1. Register a global platform/system admin (POST /auth/systemAdmin/join)
 * 2. Log in as the system admin (POST /auth/systemAdmin/login)
 * 3. Generate a fake billing invoice to simulate an existing record (using
 *    typia.random), extract its ID
 * 4. Simulate positive case: Retrieve billing invoice as the system admin (GET
 *    /healthcarePlatform/systemAdmin/billingInvoices/{billingInvoiceId}),
 *    assert full property visibility and type correctness
 * 5. Simulate negative case: Try to fetch a billing invoice with an invalid
 *    UUID, assert correct error (not found or denied)
 * 6. Simulate unauthorized access: Try retrieving the invoice using a
 *    connection with empty headers (no token), expect error
 */
export async function test_api_system_admin_billing_invoice_detail_e2e_access(
  connection: api.IConnection,
) {
  // 1. Register a global system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);

  // 2. Log in as the system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. Generate a fake billing invoice (simulate existing invoice)
  const invoice = typia.random<IHealthcarePlatformBillingInvoice>();
  typia.assert(invoice);

  // 4. Positive Case: Retrieve as system admin
  const loaded =
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.at(
      connection,
      {
        billingInvoiceId: invoice.id,
      },
    );
  typia.assert(loaded);
  // RBAC: System admin can see all invoices (should see the invoice just by ID)
  TestValidator.equals(
    "system admin sees all top-level invoice properties",
    loaded.id,
    invoice.id,
  );
  // Audit: Organizational, patient, and financial data must be visible
  TestValidator.equals(
    "organization_id matches",
    loaded.organization_id,
    invoice.organization_id,
  );
  TestValidator.equals(
    "patient_id matches",
    loaded.patient_id,
    invoice.patient_id,
  );
  TestValidator.equals(
    "total_amount matches",
    loaded.total_amount,
    invoice.total_amount,
  );
  TestValidator.equals("status matches", loaded.status, invoice.status);
  TestValidator.equals(
    "created_at matches",
    loaded.created_at,
    invoice.created_at,
  );

  // 5. Negative Case: Non-existent invoice
  let nonExistentId: string & tags.Format<"uuid">;
  do {
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  } while (nonExistentId === invoice.id);
  await TestValidator.error(
    "fetching non-existent billing invoice returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingInvoices.at(
        connection,
        {
          billingInvoiceId: nonExistentId,
        },
      );
    },
  );

  // 6. Negative Case: Unauthorized (no authentication)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingInvoices.at(
        unauthConn,
        {
          billingInvoiceId: invoice.id,
        },
      );
    },
  );
}
