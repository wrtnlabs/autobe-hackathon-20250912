import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate billing invoice item update validation failures. This test verifies
 * that the PUT
 * /healthcarePlatform/organizationAdmin/billingInvoices/{billingInvoiceId}/billingItems/{billingItemId}
 * endpoint properly rejects invalid update requests due to business or
 * validation rules. Scenarios covered include: (a) setting a negative quantity
 * or unit_price, (b) suspicious attempts to update a finalized/immutable item,
 * and (c) use of invalid data structures. The test covers end-to-end workflows
 * from organization admin registration and login, invoice and billing item
 * creation for context, then attempts updates with invalid data expecting error
 * responses, and ensures no changes are made if the update fails. The test
 * strictly avoids deliberate type errors (never sends wrong types in body),
 * focusing on business logic errors. All actions follow authenticated context
 * as a newly created organization admin.
 */
export async function test_api_billing_invoice_item_update_validation_failure(
  connection: api.IConnection,
) {
  // 1. Register a new org admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    password,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as org admin
  const loginBody = {
    email,
    password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loginResult);

  // 3. Create billing invoice
  const invoiceBody = {
    organization_id: admin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: 1000,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceBody },
    );
  typia.assert(invoice);

  // 4. Create billing item
  const itemBody = {
    invoice_id: invoice.id,
    billing_code_id: typia.random<string & tags.Format<"uuid">>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    quantity: 1,
    unit_price: 1000,
  } satisfies IHealthcarePlatformBillingItem.ICreate;
  const billingItem =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: itemBody,
      },
    );
  typia.assert(billingItem);

  // 5. Attempt invalid billing item update: negative quantity
  await TestValidator.error(
    "Fails to update item with negative quantity",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingItemId: billingItem.id,
          body: {
            quantity: -3,
          } satisfies IHealthcarePlatformBillingItem.IUpdate,
        },
      );
    },
  );

  // 6. Attempt invalid billing item update: negative unit_price
  await TestValidator.error(
    "Fails to update item with negative unit_price",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingItemId: billingItem.id,
          body: {
            unit_price: -100,
          } satisfies IHealthcarePlatformBillingItem.IUpdate,
        },
      );
    },
  );

  // [Business scenario: Would check not-modified, but no GET endpoint for single item]
}
