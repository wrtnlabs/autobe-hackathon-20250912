import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate the ability of an organization admin to delete
 * (soft-delete/archive) a billing adjustment on an invoice.
 *
 * Preconditions: The organization admin user must be created (joined),
 * authenticated (login), and must have created a billing invoice and a
 * billing adjustment for the invoice. The test will also need a secondary
 * admin from a different organization (for permission error case).
 *
 * Steps:
 *
 * 1. Register and authenticate an organization admin (Admin A)
 * 2. Create a billing invoice as Admin A
 * 3. Create a billing adjustment for the invoice as Admin A
 * 4. Delete (soft-delete) the adjustment as Admin A (expect success)
 * 5. Try to delete the same adjustment again (expect error)
 * 6. Register a different admin (Admin B), create another invoice as Admin B
 * 7. As Admin B, attempt to delete Admin A's adjustment (expect permission
 *    error)
 * 8. Attempt deletion without authentication (expect unauthorized error)
 */
export async function test_api_billing_adjustment_deletion_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an organization admin
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminAEmail,
        full_name: RandomGenerator.name(),
        password: "Password123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminAJoin);

  // 2. Create a billing invoice as Admin A
  const invoiceCreate = {
    organization_id: adminAJoin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(12),
    status: "draft",
    total_amount: 12345,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: invoiceCreate,
      },
    );
  typia.assert(invoice);

  // 3. Create a billing adjustment
  const adjustmentCreate = {
    invoice_id: invoice.id,
    adjustment_type: "correction",
    description: RandomGenerator.paragraph(),
    amount: 100,
  } satisfies IHealthcarePlatformBillingAdjustment.ICreate;
  const adjustment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: adjustmentCreate,
      },
    );
  typia.assert(adjustment);

  // 4. Delete the billing adjustment (should succeed)
  await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.erase(
    connection,
    {
      billingInvoiceId: invoice.id,
      billingAdjustmentId: adjustment.id,
    },
  );
  // No return value, but soft-deletion assumed

  // 5. Try to delete again (should fail with not found or similar error)
  await TestValidator.error(
    "deleting already deleted adjustment fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.erase(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingAdjustmentId: adjustment.id,
        },
      );
    },
  );

  // 6. Register a different admin (Admin B) and login as them
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminBEmail,
        full_name: RandomGenerator.name(),
        password: "AnotherPassword456!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminBJoin);

  // Create an invoice under Admin B to avoid org mixup
  const invoiceBCreate = {
    organization_id: adminBJoin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(12),
    status: "draft",
    total_amount: 54321,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoiceB =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: invoiceBCreate,
      },
    );
  typia.assert(invoiceB);

  // Now login as Admin B
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminBEmail,
      password: "AnotherPassword456!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 7. As Admin B, try to delete Admin A's adjustment (should fail with forbidden)
  await TestValidator.error(
    "admin from another org cannot delete adjustment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.erase(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingAdjustmentId: adjustment.id,
        },
      );
    },
  );

  // 8. Attempt unauthenticated deletion (logout by clearing connection headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated org admin cannot delete adjustment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.erase(
        unauthConn,
        {
          billingInvoiceId: invoice.id,
          billingAdjustmentId: adjustment.id,
        },
      );
    },
  );
}
