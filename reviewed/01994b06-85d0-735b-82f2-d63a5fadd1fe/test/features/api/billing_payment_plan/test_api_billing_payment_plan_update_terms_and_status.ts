import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate updating a billing payment plan's terms and status
 *
 * 1. Register an organization admin and authenticate the session
 * 2. Create a billing invoice belonging to the admin's organization
 * 3. Create a billing payment plan for the invoice
 * 4. Update the payment plan via PUT, changing status, terms_description,
 *    total_amount, schedule, etc.
 * 5. Confirm valid updates are reflected in the response: assert all updated
 *    fields
 * 6. Attempt forbidden status transition (cancelled → active), and validate that
 *    the API responds with business errors
 * 7. Attempt empty update and validate appropriate business error is returned
 */
export async function test_api_billing_payment_plan_update_terms_and_status(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphabets(8),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Create a billing invoice
  const invoiceBody = {
    organization_id: admin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(12),
    status: "draft",
    total_amount: 1000,
    currency: "USD",
    description: RandomGenerator.paragraph(),
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceBody },
    );
  typia.assert(invoice);

  // 3. Create a billing payment plan
  const planCreateBody = {
    invoice_id: invoice.id,
    plan_type: "self-pay",
    terms_description: "Initial terms - monthly installments",
    status: "active",
    total_amount: 1000,
    start_date: new Date(Date.now()).toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformBillingPaymentPlan.ICreate;
  const plan =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: planCreateBody,
      },
    );
  typia.assert(plan);

  // Save old updated_at for timestamp test
  const prevUpdatedAt = plan.updated_at;

  // 4. Update plan's status, amount, terms_description
  const updateBody = {
    status: "cancelled",
    terms_description: "Plan was cancelled at request of patient.",
    total_amount: 950,
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformBillingPaymentPlan.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.update(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingPaymentPlanId: typia.assert<string & tags.Format<"uuid">>(
          plan.id,
        ),
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("status should be updated", updated.status, "cancelled");
  TestValidator.equals(
    "terms_description updated",
    updated.terms_description,
    "Plan was cancelled at request of patient.",
  );
  TestValidator.equals("total_amount updated", updated.total_amount, 950);
  TestValidator.notEquals(
    "updated_at should change",
    updated.updated_at,
    prevUpdatedAt,
  );

  // 5. Attempt forbidden status transition: from cancelled to active (should error)
  await TestValidator.error(
    "cannot transition cancelled to active",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingPaymentPlanId: typia.assert<string & tags.Format<"uuid">>(
            plan.id,
          ),
          body: { status: "active" },
        },
      );
    },
  );

  // 6. Attempt to update no fields (should be idempotent or error as per business logic)
  await TestValidator.error("should error on empty update", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.update(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingPaymentPlanId: typia.assert<string & tags.Format<"uuid">>(
          plan.id,
        ),
        body: {} as IHealthcarePlatformBillingPaymentPlan.IUpdate,
      },
    );
  });
}
