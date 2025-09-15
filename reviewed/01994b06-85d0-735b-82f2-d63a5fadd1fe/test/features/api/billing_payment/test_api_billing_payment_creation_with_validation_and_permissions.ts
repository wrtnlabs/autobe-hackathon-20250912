import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPayment";
import type { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate creation of a healthcare billing payment against an invoice, with
 * full permissions and proper input. Also test error conditions: permission
 * error, bad payment method, and invoice state errors.
 *
 * 1. Create admin (join)
 * 2. Login as admin
 * 3. Create a billing invoice
 * 4. Create a payment method
 * 5. Success: Create payment with all required fields (happy path)
 * 6. Fail: payment with invalid payment_method_id (not belonging to org)
 * 7. Fail: try as unauthenticated (no token) and expect permission denied
 * 8. Fail: try to create for non-existent invoice -> expect error
 * 9. (Audit log validation described but not implemented due to API scope)
 */
export async function test_api_billing_payment_creation_with_validation_and_permissions(
  connection: api.IConnection,
) {
  // 1. Create organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: "passw0rd!@#",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const adminId = adminJoin.id;
  const adminToken: IAuthorizationToken = adminJoin.token;

  // 2. Login as admin (token resets, but we just joined above)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "passw0rd!@#",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create a billing invoice
  const invoiceBody = {
    organization_id: adminId, // Use adminId as organization for test (may replace in real scenario)
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: 400,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceBody },
    );
  typia.assert(invoice);

  // 4. Create a payment method for this org
  const paymentMethodBody = {
    organization_id: invoice.organization_id,
    method_type: "credit_card",
    provider_name: "Visa",
    is_active: true,
  } satisfies IHealthcarePlatformBillingPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 5. SUCCESS: create a payment with all required fields
  const paymentBody = {
    invoice_id: invoice.id,
    payee_id: typia.random<string & tags.Format<"uuid">>(),
    payment_method_id: paymentMethod.id,
    amount: 400,
    currency: invoice.currency,
    payment_date: new Date().toISOString(),
    status: "posted",
  } satisfies IHealthcarePlatformBillingPayment.ICreate;
  const payment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: paymentBody,
      },
    );
  typia.assert(payment);
  TestValidator.equals(
    "payment linked to invoice",
    payment.invoice_id,
    invoice.id,
  );
  TestValidator.equals("payment status posted", payment.status, "posted");
  TestValidator.equals(
    "payment amount matches",
    payment.amount,
    paymentBody.amount,
  );

  // 6. FAIL: payment with invalid payment_method_id (UUID not owned by org)
  await TestValidator.error("invalid payment_method_id fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          ...paymentBody,
          payment_method_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHealthcarePlatformBillingPayment.ICreate,
      },
    );
  });

  // 7. FAIL: as unauthenticated (no token in connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("permission denied if not admin", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.create(
      unauthConn,
      {
        billingInvoiceId: invoice.id,
        body: paymentBody,
      },
    );
  });

  // 8. FAIL: payment for non-existent invoice (random uuid)
  await TestValidator.error("error: non-existent invoice", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.create(
      connection,
      {
        billingInvoiceId: typia.random<string & tags.Format<"uuid">>(),
        body: paymentBody,
      },
    );
  });

  // (9) (Audit log validation: not implemented - out of scope)
}
