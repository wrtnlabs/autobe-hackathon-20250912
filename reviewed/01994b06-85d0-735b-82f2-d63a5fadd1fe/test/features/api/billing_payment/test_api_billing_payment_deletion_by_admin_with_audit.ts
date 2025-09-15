import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPayment";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test: Deletion of billing payment from invoice by admin, covering
 * success, repeat, permission, and not found cases.
 *
 * 1. Register first organization admin (AdminA) and obtain token
 * 2. Create a patient and organization UUIDs for invoice linkage
 * 3. Create invoice as AdminA
 * 4. Create payment for that invoice as AdminA
 * 5. Successfully delete the payment (basic case)
 * 6. Attempt to delete the same payment again – expect error
 * 7. Register a second organization admin (AdminB), login as AdminB
 * 8. Attempt to delete a payment in AdminA's invoice as AdminB – expect
 *    permission error
 * 9. Attempt to delete a non-existent paymentId from the invoice – expect
 *    error
 * 10. [Note: If audit/compliance log retrieval API existed, verify audit entry;
 *     omitted as no API is provided.]
 */
export async function test_api_billing_payment_deletion_by_admin_with_audit(
  connection: api.IConnection,
) {
  // 1. Register AdminA
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminAEmail,
        full_name: RandomGenerator.name(),
        password: "abcABC123!!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminAJoin);

  // 2. Login as AdminA (redundant after join, but explicit)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminAEmail,
      password: "abcABC123!!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create invoice as AdminA
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const patient_id = typia.random<string & tags.Format<"uuid">>();
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id,
          patient_id,
          invoice_number: RandomGenerator.alphaNumeric(8),
          status: "draft",
          total_amount: 500,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  // 4. Create payment for invoice
  const payment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          amount: 300,
          currency: "USD",
          payment_date: new Date().toISOString(),
          status: "posted",
        } satisfies IHealthcarePlatformBillingPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 5. Successful delete payment
  await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.erase(
    connection,
    {
      billingInvoiceId: invoice.id,
      billingPaymentId: payment.id,
    },
  );

  // 6. Attempt to delete the payment again: should error
  await TestValidator.error(
    "deleting same payment again should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.erase(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingPaymentId: payment.id,
        },
      );
    },
  );

  // 7. Register AdminB for unauthorized scenario
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminBEmail,
        full_name: RandomGenerator.name(),
        password: "abcABC123!!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminBJoin);

  // 8. Attempt to delete payment as AdminB (should error if permissions enforced)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminBEmail,
      password: "abcABC123!!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "adminB cannot delete payment in AdminA's invoice",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.erase(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingPaymentId: payment.id,
        },
      );
    },
  );

  // 9. Deletion of nonexistent paymentId
  const fakePaymentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("deletion of nonexistent payment id", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.erase(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingPaymentId: fakePaymentId,
      },
    );
  });
}
