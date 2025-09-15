import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate that an organization admin can retrieve billing adjustment
 * details for an invoice within their own organization, and enforce RBAC
 * and audit controls.
 *
 * 1. Register OrgAdmin A and login (get JWT)
 * 2. Register OrgAdmin B and login (get JWT)
 * 3. OrgAdmin A issues a new billing invoice for a test patient/organization
 * 4. OrgAdmin A adds a billing adjustment to that invoice
 * 5. OrgAdmin A retrieves the billing adjustment details via GET, checks that
 *    all fields (id, invoice_id, type, description, amount, timestamp)
 *    match the creation
 * 6. OrgAdmin B attempts to retrieve OrgAdmin A's billing adjustment via GET
 *    on the same endpoint - should fail for RBAC
 * 7. Successfully retrieves using OrgAdmin A for another permitted adjustment
 * 8. Attempt to retrieve nonexistent adjustment for valid invoice (using a
 *    random UUID) - should get 404
 */
export async function test_api_billing_adjustment_organization_admin_detail_access_and_rbac(
  connection: api.IConnection,
) {
  // 1. Register OrgAdmin A
  const adminA_email = typia.random<string & tags.Format<"email">>();
  const adminA_password = RandomGenerator.alphaNumeric(12);
  const adminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminA_email,
        full_name: RandomGenerator.name(),
        password: adminA_password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminA);

  // 2. Register OrgAdmin B
  const adminB_email = typia.random<string & tags.Format<"email">>();
  const adminB_password = RandomGenerator.alphaNumeric(12);
  const adminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminB_email,
        full_name: RandomGenerator.name(),
        password: adminB_password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminB);

  // Login as OrgAdmin A
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminA_email,
      password: adminA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. OrgAdmin A creates the test billing invoice (patient/org are random uuids)
  const organization_id = typia.assert(adminA.id) satisfies string as string;
  const patient_id = typia.random<string & tags.Format<"uuid">>();
  const billing_invoice_create = {
    organization_id,
    patient_id,
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: RandomGenerator.pick([
      "draft",
      "sent",
      "paid",
      "overdue",
      "canceled",
    ] as const),
    total_amount: 100 + Math.floor(Math.random() * 10000),
    currency: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const billing_invoice: IHealthcarePlatformBillingInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: billing_invoice_create },
    );
  typia.assert(billing_invoice);

  // 4. OrgAdmin A adds billing adjustment to the invoice
  const billing_adjustment_create = {
    invoice_id: billing_invoice.id,
    adjustment_type: "charity",
    description: "Charity adjustment for test scenario",
    amount: -50, // Negative for discount
  } satisfies IHealthcarePlatformBillingAdjustment.ICreate;
  const billing_adjustment: IHealthcarePlatformBillingAdjustment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.create(
      connection,
      { billingInvoiceId: billing_invoice.id, body: billing_adjustment_create },
    );
  typia.assert(billing_adjustment);

  // 5. OrgAdmin A retrieves the adjustment via GET (success case)
  const adjustment_fetched =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.at(
      connection,
      {
        billingInvoiceId: billing_invoice.id,
        billingAdjustmentId: billing_adjustment.id,
      },
    );
  typia.assert(adjustment_fetched);
  TestValidator.equals(
    "adjustment.id matches",
    adjustment_fetched.id,
    billing_adjustment.id,
  );
  TestValidator.equals(
    "adjustment.invoice_id matches",
    adjustment_fetched.invoice_id,
    billing_invoice.id,
  );
  TestValidator.equals(
    "adjustment.amount matches",
    adjustment_fetched.amount,
    billing_adjustment.amount,
  );
  TestValidator.equals(
    "adjustment.adjustment_type matches",
    adjustment_fetched.adjustment_type,
    billing_adjustment.adjustment_type,
  );
  TestValidator.equals(
    "adjustment.description matches",
    adjustment_fetched.description,
    billing_adjustment.description,
  );
  TestValidator.predicate(
    "adjustment.created_at is valid string",
    typeof adjustment_fetched.created_at === "string",
  );

  // 6. OrgAdmin B attempts to fetch adjustment for OrgAdmin A's invoice (should error)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminB_email,
      password: adminB_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "OrgAdmin B cannot access adjustment belonging to OrgAdmin A's invoice",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.at(
        connection,
        {
          billingInvoiceId: billing_invoice.id,
          billingAdjustmentId: billing_adjustment.id,
        },
      );
    },
  );

  // 7. OrgAdmin A retrieves own adjustment again to confirm RBAC is scoped properly
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminA_email,
      password: adminA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const adjustment_refetched =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.at(
      connection,
      {
        billingInvoiceId: billing_invoice.id,
        billingAdjustmentId: billing_adjustment.id,
      },
    );
  typia.assert(adjustment_refetched);
  TestValidator.equals(
    "OrgAdmin A can re-fetch adjustment",
    adjustment_refetched.id,
    billing_adjustment.id,
  );

  // 8. Attempt to fetch nonexistent adjustment (should get error/404)
  const randomFakeAdjustmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Fetching nonexistent adjustment returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.at(
        connection,
        {
          billingInvoiceId: billing_invoice.id,
          billingAdjustmentId: randomFakeAdjustmentId,
        },
      );
    },
  );
}
