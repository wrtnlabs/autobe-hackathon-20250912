import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingPaymentPlan";

/**
 * Covers retrieval of all payment plans for a specific invoice. Join/login as
 * organization admin, create an invoice, create a payment plan for the invoice,
 * then use the patch payment plan list endpoint to fetch all plans for that
 * billingInvoiceId. Validate returned list contains the created plan and verify
 * pagination, sorting, and filtering behaviors if supported.
 */
export async function test_api_billing_payment_plan_list_success(
  connection: api.IConnection,
) {
  // 1. Join/register as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: "test1234",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Login as organization admin (refresh token, validates login endpoint works)
  const loggedIn: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: "test1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    });
  typia.assert(loggedIn);

  // 3. Create a billing invoice
  const invoice: IHealthcarePlatformBillingInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          invoice_number: RandomGenerator.alphaNumeric(10),
          status: "draft",
          total_amount: 50000,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  // 4. Create a payment plan for that invoice
  const planBody = {
    invoice_id: invoice.id,
    plan_type: RandomGenerator.pick([
      "self-pay",
      "insurance",
      "deferral",
      "promissory",
    ] as const),
    terms_description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    total_amount: invoice.total_amount,
    start_date: new Date().toISOString(),
    end_date: null,
  } satisfies IHealthcarePlatformBillingPaymentPlan.ICreate;
  const createdPlan: IHealthcarePlatformBillingPaymentPlan =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: planBody,
      },
    );
  typia.assert(createdPlan);

  // 5. Retrieve payment plan list (patch list endpoint) for that invoice with no filter (should at least contain our plan)
  const listPage =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformBillingPaymentPlan.IRequest,
      },
    );
  typia.assert(listPage);
  TestValidator.predicate(
    "created plan present in plan list",
    listPage.data.some((pl) => pl.id === createdPlan.id),
  );

  // 6. Validate pagination works: request page size 1 and check only one record returned (in trivial case, it's our only plan)
  const pageSize1 =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          page: 1,
          limit: 1,
        } satisfies IHealthcarePlatformBillingPaymentPlan.IRequest,
      },
    );
  typia.assert(pageSize1);
  TestValidator.equals(
    "should return one record for page size 1",
    pageSize1.data.length,
    1,
  );

  // 7. Validate filtering: filter by status 'active' (should contain our plan)
  const filterStatus =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          status: "active",
        } satisfies IHealthcarePlatformBillingPaymentPlan.IRequest,
      },
    );
  typia.assert(filterStatus);
  TestValidator.predicate(
    "created plan present in filtered plan list (status)",
    filterStatus.data.some((pl) => pl.id === createdPlan.id),
  );

  // 8. Validate sorting by start_date ascending/descending - should not error even if only one plan
  const sortedAsc =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          sort: "start_date",
          order: "asc",
        } satisfies IHealthcarePlatformBillingPaymentPlan.IRequest,
      },
    );
  typia.assert(sortedAsc);
  // Just check our plan is included
  TestValidator.predicate(
    "created plan present in sorted asc plan list",
    sortedAsc.data.some((pl) => pl.id === createdPlan.id),
  );

  const sortedDesc =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          sort: "start_date",
          order: "desc",
        } satisfies IHealthcarePlatformBillingPaymentPlan.IRequest,
      },
    );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "created plan present in sorted desc plan list",
    sortedDesc.data.some((pl) => pl.id === createdPlan.id),
  );
}
