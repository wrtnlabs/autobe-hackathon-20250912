import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPayment";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingPayment";

/**
 * Validate the searching and paginating of billing payment records for a
 * specific invoice as an organization admin.
 *
 * 1. Register and login as an organization admin.
 * 2. Create a billing invoice.
 * 3. Add multiple payments to the invoice (5 payments, with at least two distinct
 *    statuses and date ranges).
 * 4. Search payments by PATCH endpoint:
 *
 *    - Paginate with limit/page params.
 *    - Filter by status.
 *    - Filter by payment_date_range.
 * 5. Confirm returned payments all reference the correct invoice and respect
 *    requested pagination and filters.
 * 6. Try invalid queries: page out-of-bounds, status not existing,
 *    payment_date_range empty result, and non-existent invoice id.
 * 7. Confirm error or empty result as appropriate.
 */
export async function test_api_billing_payment_search_pagination_by_invoice(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        // phone is optional
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a billing invoice
  const invoiceBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(8),
    status: "sent",
    total_amount: 1000,
    currency: "USD",
    // optional fields omitted
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice: IHealthcarePlatformBillingInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceBody },
    );
  typia.assert(invoice);

  // 3. Add multiple payments (5) with two different statuses ("posted", "pending") and various payment_dates
  const paymentStatuses = ["posted", "pending"] as const;
  const baseDate = new Date();
  const paymentPayloads = ArrayUtil.repeat(5, (i) => {
    const status = paymentStatuses[i % paymentStatuses.length];
    return {
      invoice_id: invoice.id,
      amount: 200 + i * 100,
      currency: invoice.currency,
      payment_date: new Date(
        baseDate.getTime() + i * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status,
    } satisfies IHealthcarePlatformBillingPayment.ICreate;
  });
  const paymentRecords: IHealthcarePlatformBillingPayment[] = [];
  for (const paymentBody of paymentPayloads) {
    const payment =
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.create(
        connection,
        {
          billingInvoiceId: invoice.id,
          body: paymentBody,
        },
      );
    typia.assert(payment);
    paymentRecords.push(payment);
  }
  // 4a. Basic pagination test (limit 2, page 1)
  let result =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(result);
  TestValidator.equals("pagination - 2 payments page 1", result.data.length, 2);
  TestValidator.equals(
    "pagination metadata page current",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata page limit",
    result.pagination.limit,
    2,
  );
  // 4b. Pagination next page
  let nextResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          limit: 2,
          page: 2,
        },
      },
    );
  typia.assert(nextResult);
  TestValidator.equals(
    "pagination - next page",
    nextResult.pagination.current,
    2,
  );
  // 4c. Filter by status ("posted")
  let statusResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          status: ["posted"],
        },
      },
    );
  typia.assert(statusResult);
  TestValidator.predicate(
    "all returned have status posted",
    statusResult.data.every((x) => x.status === "posted"),
  );
  // 4d. Filter by payment_date_range
  const dateRange = [
    paymentRecords[2].payment_date,
    paymentRecords[4].payment_date,
  ] as [string & tags.Format<"date-time">, string & tags.Format<"date-time">];
  let dateResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          payment_date_range: dateRange,
        },
      },
    );
  typia.assert(dateResult);
  TestValidator.predicate(
    "all returned payment_date in range",
    dateResult.data.every(
      (p) => p.payment_date >= dateRange[0] && p.payment_date <= dateRange[1],
    ),
  );
  // 5. Confirm that all results correspond to this invoice
  TestValidator.predicate(
    "all results have invoice_id",
    result.data.every((p) => p.invoice_id === invoice.id),
  );
  // 6a. Out-of-bounds page
  let oobResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          page: 100,
          limit: 2,
        },
      },
    );
  typia.assert(oobResult);
  TestValidator.equals("pagination oob empty", oobResult.data.length, 0);
  // 6b. Filter returns empty result (status that does not exist)
  let emptyStatusResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          status: ["voided"],
        },
      },
    );
  typia.assert(emptyStatusResult);
  TestValidator.equals("no voided payments", emptyStatusResult.data.length, 0);
  // 6c. Non-existent invoice
  await TestValidator.error("non-existent invoice id", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.index(
      connection,
      {
        billingInvoiceId: typia.random<string & tags.Format<"uuid">>(),
        body: { limit: 1 },
      },
    );
  });
}
