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
 * Organization admin updates a billing adjustment on an invoice.
 *
 * Steps:
 *
 * 1. Register & login as org admin A.
 * 2. Create a second unrelated admin B for permission tests.
 * 3. Create a patient/org/invoice, then a billing item.
 * 4. Create an initial billing adjustment for the invoice (record ID).
 * 5. Update the adjustment using the update endpoint (change amount/reason/type).
 * 6. Assert the fields are updated as expected on the response.
 * 7. Attempt update as unrelated admin B — should error due to RBAC.
 * 8. Try update with invalid payload — should fail business validation.
 * 9. Try updating a non-existent adjustment ID — should fail not found.
 */
export async function test_api_billing_adjustment_update_by_organization_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and login as org admin A
  const adminA_join: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "Password!12345",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminA_join);
  const adminA_email = adminA_join.email;

  // Step 2: Register unrelated admin B
  const adminB_join: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "AdminBpassword!22",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminB_join);
  const adminB_email = adminB_join.email;

  // Step 3: (admin A) Create an invoice (simulate patient/org context)
  const invoice: IHealthcarePlatformBillingInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          invoice_number: RandomGenerator.alphaNumeric(10),
          status: "draft",
          total_amount: 1000,
          currency: "USD",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  // Step 4: Create a billing item for this invoice
  const billing_item: IHealthcarePlatformBillingItem =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          billing_code_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          quantity: 1,
          unit_price: 1000,
        } satisfies IHealthcarePlatformBillingItem.ICreate,
      },
    );
  typia.assert(billing_item);

  // Step 5: Create a billing adjustment for the invoice (not the item, to test invoice-level adjustment)
  const adjustment_orig: IHealthcarePlatformBillingAdjustment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          adjustment_type: "error_correction",
          description: "Initial adjustment reason",
          amount: -100,
        } satisfies IHealthcarePlatformBillingAdjustment.ICreate,
      },
    );
  typia.assert(adjustment_orig);

  // Step 6: Update the adjustment details (change type/amount/reason)
  const updateBody = {
    amount: -200,
    description: "Corrected adjustment with more discount",
    adjustment_type: "charity",
  } satisfies IHealthcarePlatformBillingAdjustment.IUpdate;
  const adjustment_updated: IHealthcarePlatformBillingAdjustment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.update(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingAdjustmentId: adjustment_orig.id,
        body: updateBody,
      },
    );
  typia.assert(adjustment_updated);
  TestValidator.equals(
    "adjustment amount is updated",
    adjustment_updated.amount,
    updateBody.amount,
  );
  TestValidator.equals(
    "adjustment description is updated",
    adjustment_updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "adjustment type is updated",
    adjustment_updated.adjustment_type,
    updateBody.adjustment_type,
  );

  // Step 7: Attempt update as unrelated admin B (RBAC error expected)
  // - Re-login as admin B
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminB_email,
      password: "AdminBpassword!22",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "unrelated admin cannot update adjustment due to RBAC",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingAdjustmentId: adjustment_orig.id,
          body: updateBody,
        },
      );
    },
  );

  // Step 8: Re-login as admin A for remaining tests
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminA_email,
      password: "Password!12345",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Step 9: Invalid payload (e.g. missing all fields on update)
  await TestValidator.error(
    "update fails with invalid (empty) payload",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingAdjustmentId: adjustment_orig.id,
          body: {} satisfies IHealthcarePlatformBillingAdjustment.IUpdate,
        },
      );
    },
  );

  // Step 10: Attempt update to non-existent adjustment (should fail)
  await TestValidator.error(
    "updating non-existent adjustment ID fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingAdjustmentId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
