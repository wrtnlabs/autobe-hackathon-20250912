import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin creates billing adjustments for invoices/items,
 * verifying linkage, audit, and error cases.
 *
 * 1. Register and login as an organization admin (random, unique email).
 * 2. Create a patient and organization context – simulated, as invoice/org
 *    reference requires valid UUIDs.
 *
 *    - For this e2e, simulate patient_id and organization_id as random UUID
 *         strings (representing real entities).
 * 3. Create a billing invoice as the admin, referencing simulated org/patient,
 *    use unique invoice_number and basic details.
 * 4. Create a billing item via billingItems.create, referencing the invoice.
 * 5. Create a billing adjustment via billingAdjustments.create for the invoice
 *    (invoice-level) and for the billing item (item-level).
 *
 *    - Use random adjustment_type (e.g., 'insurance', 'correction', 'charity'),
 *         random amounts (positive/negative/non-zero), and rational
 *         description.
 *    - Reference invoice_id for invoice-level, item_id for item-level
 *         adjustments as per DTO contract.
 * 6. Validate each create returns an IHealthcarePlatformBillingAdjustment, all
 *    fields populated, and correct linkage.
 * 7. Try error cases: a) amount = 0 (violates non-zero business rule) b)
 *    missing item_id/invoice_id (should validate one is required) c)
 *    negative amount with type requiring positive (business validation,
 *    e.g. write-off must be negative) d) attempted creation as
 *    unauthenticated user (clear headers, expect rejection)
 * 8. If possible, assert audit logs created (or note that observation would be
 *    via audit log API, not available here).
 */
export async function test_api_billing_adjustment_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as org admin
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdminName: string = RandomGenerator.name();
  const joinResp = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminName,
        password: "Password123!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(joinResp);
  TestValidator.equals("admin email matches", joinResp.email, orgAdminEmail);

  // 2. Create dummy org and patient UUIDs
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const patientId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create billing invoice
  const invoiceNumber: string = RandomGenerator.alphaNumeric(12);
  const createInvoiceBody = {
    organization_id: organizationId,
    patient_id: patientId,
    invoice_number: invoiceNumber,
    status: "draft",
    currency: "USD",
    total_amount: 500,
    description: "Test invoice for adjustment E2E",
    due_date: new Date(Date.now() + 10 * 86400 * 1000).toISOString(),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: createInvoiceBody },
    );
  typia.assert(invoice);
  TestValidator.equals(
    "invoice_number matches",
    invoice.invoice_number,
    invoiceNumber,
  );

  // 4. Create a billing item under invoice
  const billingCodeId: string = typia.random<string & tags.Format<"uuid">>();
  const createItemBody = {
    invoice_id: invoice.id,
    billing_code_id: billingCodeId,
    description: "CT procedure (test)",
    quantity: 1,
    unit_price: 400,
  } satisfies IHealthcarePlatformBillingItem.ICreate;
  const item =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: createItemBody,
      },
    );
  typia.assert(item);
  TestValidator.equals("item invoice_id matches", item.invoice_id, invoice.id);

  // 5. Adjustment (invoice-level)
  const adjTypeInvoiceLevel = RandomGenerator.pick([
    "correction",
    "insurance",
    "charity",
  ]) as string;
  const adjAmountInvoiceLevel = 100;
  const adjustmentInvoiceLevelBody = {
    invoice_id: invoice.id,
    adjustment_type: adjTypeInvoiceLevel,
    description: "Manual test billing adjust (inv-level)",
    amount: adjAmountInvoiceLevel,
  } satisfies IHealthcarePlatformBillingAdjustment.ICreate;
  const adjustmentInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: adjustmentInvoiceLevelBody,
      },
    );
  typia.assert(adjustmentInvoice);
  TestValidator.equals(
    "adjustment at invoice level references invoice",
    adjustmentInvoice.invoice_id,
    invoice.id,
  );
  TestValidator.equals(
    "adjustment_type matches",
    adjustmentInvoice.adjustment_type,
    adjTypeInvoiceLevel,
  );

  // 6. Adjustment (item-level)
  const adjTypeItemLevel = RandomGenerator.pick(["discount", "write-off"]);
  const adjAmountItemLevel = -50;
  const adjustmentItemLevelBody = {
    item_id: item.id,
    adjustment_type: adjTypeItemLevel,
    description: "Manual test item adjustment",
    amount: adjAmountItemLevel,
  } satisfies IHealthcarePlatformBillingAdjustment.ICreate;
  const adjustmentItem =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: adjustmentItemLevelBody,
      },
    );
  typia.assert(adjustmentItem);
  TestValidator.equals(
    "adjustment at item-level references item",
    adjustmentItem.item_id,
    item.id,
  );
  TestValidator.equals(
    "type matches",
    adjustmentItem.adjustment_type,
    adjTypeItemLevel,
  );
  TestValidator.equals(
    "amount matches",
    adjustmentItem.amount,
    adjAmountItemLevel,
  );

  // 7. Validation: missing invoice_id/item_id (invalid, neither present)
  const badMissingBothBody = {
    adjustment_type: "correction",
    description: "Should fail: missing refs",
    amount: 25,
  } satisfies IHealthcarePlatformBillingAdjustment.ICreate;
  await TestValidator.error(
    "fails when neither invoice_id/item_id is given",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.create(
        connection,
        {
          billingInvoiceId: invoice.id,
          body: badMissingBothBody,
        },
      );
    },
  );

  // 8. Validation: amount = 0 (business rule: non-zero)
  const badAmountZeroBody = {
    invoice_id: invoice.id,
    adjustment_type: "insurance",
    description: "Should fail (zero amount)",
    amount: 0,
  } satisfies IHealthcarePlatformBillingAdjustment.ICreate;
  await TestValidator.error("fails when amount is zero", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: badAmountZeroBody,
      },
    );
  });

  // 9. Validation: try adjustment as unauthenticated user (token removed)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthorizedAdjBody = {
    invoice_id: invoice.id,
    adjustment_type: "correction",
    description: "Unauthorized adjustment",
    amount: 10,
  } satisfies IHealthcarePlatformBillingAdjustment.ICreate;
  await TestValidator.error(
    "fails for adjustment when not logged in",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.create(
        unauthConn,
        {
          billingInvoiceId: invoice.id,
          body: unauthorizedAdjBody,
        },
      );
    },
  );
}
