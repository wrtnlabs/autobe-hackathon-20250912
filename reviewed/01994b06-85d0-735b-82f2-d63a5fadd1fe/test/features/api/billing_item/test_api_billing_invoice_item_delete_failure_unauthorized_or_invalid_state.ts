import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate correct error response and non-modification for deletion attempts on
 * non-deletable/invalid billing items or without proper authorization.
 *
 * 1. Register and log in as organization admin
 * 2. Create an invoice and one billing item
 * 3. Delete the billing item (normal path, to ensure existence for subsequent
 *    tests)
 * 4. Attempt to delete the same billing item again (should error, already deleted,
 *    idempotency)
 * 5. Attempt to delete with invalid invoice/billing item IDs (random UUIDs)
 * 6. Attempt to delete as unauthenticated user (no login) – should error
 * 7. Create a new invoice/billing item, simulate "finalized" status on invoice,
 *    then try deleting billing item (should error – not deletable state)
 */
export async function test_api_billing_invoice_item_delete_failure_unauthorized_or_invalid_state(
  connection: api.IConnection,
) {
  // Step 1: Register and login as org admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminName: string = RandomGenerator.name();
  const adminPassword = "Test1234!";

  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminName,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);

  // Step 2: Create Billing Invoice
  const billingInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          invoice_number: RandomGenerator.alphabets(10),
          status: "draft",
          total_amount: 500,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(billingInvoice);

  // Step 3: Create Billing Item
  const billingItem =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: billingInvoice.id,
        body: {
          invoice_id: billingInvoice.id,
          billing_code_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          quantity: 1,
          unit_price: 200,
        } satisfies IHealthcarePlatformBillingItem.ICreate,
      },
    );
  typia.assert(billingItem);

  // Step 4: Delete Billing Item (First, should succeed)
  await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.erase(
    connection,
    {
      billingInvoiceId: billingInvoice.id,
      billingItemId: billingItem.id,
    },
  );

  // Step 5: Try deleting the same item again (should error: already deleted)
  await TestValidator.error(
    "Deleting already deleted billing item should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.erase(
        connection,
        {
          billingInvoiceId: billingInvoice.id,
          billingItemId: billingItem.id,
        },
      );
    },
  );

  // Step 6: Deletion with invalid invoice/item IDs
  await TestValidator.error(
    "Deleting with invalid billingItemId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.erase(
        connection,
        {
          billingInvoiceId: billingInvoice.id,
          billingItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.error(
    "Deleting with invalid billingInvoiceId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.erase(
        connection,
        {
          billingInvoiceId: typia.random<string & tags.Format<"uuid">>(),
          billingItemId: billingItem.id,
        },
      );
    },
  );

  // Step 7: Unauthorized (simulate unauthenticated) - new connection w/o login
  const newConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Deletion as unauthenticated org admin should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.erase(
        newConnection,
        {
          billingInvoiceId: billingInvoice.id,
          billingItemId: billingItem.id,
        },
      );
    },
  );

  // Step 8: Simulate finalized invoice, try deleting item (should error)
  // Create a new invoice and new item
  const billingInvoice2 =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          invoice_number: RandomGenerator.alphabets(10),
          status: "finalized",
          total_amount: 1000,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(billingInvoice2);
  const billingItem2 =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: billingInvoice2.id,
        body: {
          invoice_id: billingInvoice2.id,
          billing_code_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          quantity: 2,
          unit_price: 300,
        } satisfies IHealthcarePlatformBillingItem.ICreate,
      },
    );
  typia.assert(billingItem2);
  await TestValidator.error(
    "Deleting billing item on finalized invoice should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.erase(
        connection,
        {
          billingInvoiceId: billingInvoice2.id,
          billingItemId: billingItem2.id,
        },
      );
    },
  );
}
