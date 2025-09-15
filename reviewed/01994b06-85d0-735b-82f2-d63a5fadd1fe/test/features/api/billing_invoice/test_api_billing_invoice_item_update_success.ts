import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for successfully updating a billing invoice item as an
 * organization admin.
 *
 * 1. Register a new organization admin.
 * 2. Login as the organization admin to obtain an authenticated context.
 * 3. Create a billing invoice with random details.
 * 4. Add a billing item to the invoice with random details.
 * 5. Perform an update on that billing item (change description, quantity, and
 *    unit_price).
 * 6. Validate that the updated billing item object reflects the updated fields
 *    and is type-correct.
 * 7. (If possible with available APIs, reload/check the invoice or item for
 *    persistence, otherwise assert the returned object.)
 */
export async function test_api_billing_invoice_item_update_success(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login (not strictly necessary: join sets auth, but include for robustness)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminSession = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: adminLoginBody },
  );
  typia.assert(adminSession);

  // 3. Create billing invoice
  const invoiceBody = {
    organization_id: admin.id, // use admin's id as organization for test context
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 4. Create billing item for the invoice
  const billingItemBody = {
    invoice_id: invoice.id,
    billing_code_id: typia.random<string & tags.Format<"uuid">>(),
    description: RandomGenerator.paragraph({ sentences: 1 }),
    quantity: 10,
    unit_price: 100,
  } satisfies IHealthcarePlatformBillingItem.ICreate;
  const billingItem =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      { billingInvoiceId: invoice.id, body: billingItemBody },
    );
  typia.assert(billingItem);

  // 5. Update billing item fields
  const newDescription = RandomGenerator.paragraph({ sentences: 1 });
  const newQuantity = 20;
  const newUnitPrice = 150;
  const updateBody = {
    description: newDescription,
    quantity: newQuantity,
    unit_price: newUnitPrice,
    total_amount: newQuantity * newUnitPrice,
  } satisfies IHealthcarePlatformBillingItem.IUpdate;
  const updatedItem =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.update(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingItemId: billingItem.id as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updatedItem);
  // Check update is reflected
  TestValidator.equals(
    "updated billing item description",
    updatedItem.description,
    newDescription,
  );
  TestValidator.equals(
    "updated billing item quantity",
    updatedItem.quantity,
    newQuantity,
  );
  TestValidator.equals(
    "updated billing item unit price",
    updatedItem.unit_price,
    newUnitPrice,
  );
  TestValidator.equals(
    "updated billing item total_amount",
    updatedItem.total_amount,
    newQuantity * newUnitPrice,
  );

  // Optionally: (if there were an audit log or reload API, check it here)
}
