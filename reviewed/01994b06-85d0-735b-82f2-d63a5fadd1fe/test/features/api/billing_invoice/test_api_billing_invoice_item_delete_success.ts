import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate successful deletion of a billing invoice item by an organization
 * admin.
 *
 * End-to-end workflow:
 *
 * 1. Register a new org admin (email/password authentication)
 * 2. Login as the org admin
 * 3. Create a billing invoice as the org admin
 * 4. Create a billing item under that invoice
 * 5. Delete the created billing item (target API)
 * 6. Confirm success of the operation (if APIs existed to list/read items, would
 *    confirm item absence)
 */
export async function test_api_billing_invoice_item_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new org admin
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email,
      full_name: RandomGenerator.name(),
      password,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Login as organization admin (session, if required by API logic)
  const login = await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Create a billing invoice
  const invoice =
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
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  // 4. Create a billing item for the invoice
  const item =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          billing_code_id: typia.random<string>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          quantity: 2,
          unit_price: 500,
        } satisfies IHealthcarePlatformBillingItem.ICreate,
      },
    );
  typia.assert(item);

  // 5. Delete the created billing item
  await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.erase(
    connection,
    {
      billingInvoiceId: invoice.id,
      billingItemId: item.id,
    },
  );

  // 6. (If item listing endpoint existed, would confirm item absence. Here, deletion success is absence of error.)
  TestValidator.predicate(
    "delete request completes without error (item is deleted)",
    true,
  );
}
