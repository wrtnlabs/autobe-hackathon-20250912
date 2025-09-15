import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPayment";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate admin billing payment details view and access control.
 *
 * 1. Register (join) a new organization admin
 * 2. Login as organization admin
 * 3. Create a billing invoice
 * 4. Create a billing payment under this invoice
 * 5. Successfully retrieve billing payment details as admin, asserting all fields
 * 6. Try to retrieve payment with non-existent invoice/payment IDs (expect error)
 * 7. Try from unauthenticated context (non-admin, expect access denied/error)
 * 8. (Edge) Try cross-organization: if logically feasible, try to fetch payment
 *    with mismatched invoice/payment (expect error/404)
 */
export async function test_api_billing_payment_details_for_admin_view(
  connection: api.IConnection,
) {
  // 1. OrganizationAdmin join (register new unique admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "StrongP@ssw0rd",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const joinAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoinBody },
  );
  typia.assert(joinAdmin);

  // 2. OrganizationAdmin login (refresh session)
  const loginOutput = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "StrongP@ssw0rd",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginOutput);

  // 3. Create a billing invoice as the joined admin
  const invoiceCreateBody = {
    organization_id: joinAdmin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: 150.5,
    currency: "USD",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;

  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceCreateBody },
    );
  typia.assert(invoice);

  // 4. Create a billing payment under that invoice
  const paymentCreateBody = {
    invoice_id: invoice.id,
    amount: 150.5,
    currency: "USD",
    payment_date: new Date().toISOString(),
    status: "posted",
  } satisfies IHealthcarePlatformBillingPayment.ICreate;

  const payment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: paymentCreateBody,
      },
    );
  typia.assert(payment);

  // 5. Success case: retrieve payment details as admin
  const fetched =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.at(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingPaymentId: payment.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("payment fetched matches created", fetched, payment);

  // 6. Failure: non-existent invoiceId/paymentId
  const randomInvoiceId = typia.random<string & tags.Format<"uuid">>();
  const randomPaymentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent id returns error", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.at(
      connection,
      {
        billingInvoiceId: randomInvoiceId,
        billingPaymentId: randomPaymentId,
      },
    );
  });

  // 7. Failure: Unauthenticated access attempt (empty connection.headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.at(
      unauthConn,
      {
        billingInvoiceId: invoice.id,
        billingPaymentId: payment.id,
      },
    );
  });

  // 8. Edge: mismatched payment/invoice IDs (payment exists, but not under this invoice)
  // Create a second invoice and try to use first payment's id
  const invoice2Create = {
    organization_id: joinAdmin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: 50,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice2 =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoice2Create },
    );
  typia.assert(invoice2);
  await TestValidator.error(
    "mismatched invoice/payment returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.at(
        connection,
        {
          billingInvoiceId: invoice2.id,
          billingPaymentId: payment.id,
        },
      );
    },
  );
}
