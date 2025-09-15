import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin billing item retrieval by invoice/item.
 *
 * This test ensures that an organization admin can retrieve details of a
 * billing item under one of their invoices, only when authorized.
 *
 * Steps:
 *
 * 1. Register a new organization admin (join)
 * 2. Login as the organization admin (session)
 * 3. Create a billing invoice for the admin's organization
 * 4. Create a billing item for this invoice
 * 5. Retrieve the billing item and validate details match
 * 6. [Edge] Try to retrieve a non-existing or unauthorized item and validate error
 *    handling
 */
export async function test_api_billing_item_retrieval_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and join as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminResp = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminResp);

  // 2. Login as organization admin
  const loginResp = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResp);

  // 3. Create billing invoice for the organization
  const invoiceCreateReq = {
    organization_id: adminResp.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    description: RandomGenerator.paragraph(),
    total_amount: 5000,
    currency: "USD",
    due_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceCreateReq },
    );
  typia.assert(invoice);

  // 4. Create billing item for invoice
  const billingItemCreateReq = {
    invoice_id: invoice.id,
    billing_code_id: typia.random<string & tags.Format<"uuid">>(),
    description: RandomGenerator.paragraph(),
    quantity: 3,
    unit_price: 1000,
  } satisfies IHealthcarePlatformBillingItem.ICreate;
  const billingItem =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: billingItemCreateReq,
      },
    );
  typia.assert(billingItem);

  // 5. Retrieve billing item by admin
  const retrieved =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.at(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingItemId: billingItem.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved billing item id matches",
    retrieved.id,
    billingItem.id,
  );
  TestValidator.equals(
    "retrieved invoice_id matches",
    retrieved.invoice_id,
    invoice.id,
  );
  TestValidator.equals(
    "retrieved description matches",
    retrieved.description,
    billingItemCreateReq.description,
  );
  TestValidator.equals(
    "retrieved unit_price matches",
    retrieved.unit_price,
    billingItemCreateReq.unit_price,
  );
  TestValidator.equals(
    "retrieved quantity matches",
    retrieved.quantity,
    billingItemCreateReq.quantity,
  );
  TestValidator.equals(
    "retrieved billing_code_id matches",
    retrieved.billing_code_id,
    billingItemCreateReq.billing_code_id,
  );
  TestValidator.equals(
    "retrieved total_amount matches calculation",
    retrieved.total_amount,
    billingItemCreateReq.unit_price * billingItemCreateReq.quantity,
  );

  // 6. Edge: Attempt to retrieve with random (invalid) IDs
  await TestValidator.error(
    "retrieval with invalid invoiceId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.at(
        connection,
        {
          billingInvoiceId: typia.random<string & tags.Format<"uuid">>(),
          billingItemId: billingItem.id,
        },
      );
    },
  );
  await TestValidator.error(
    "retrieval with invalid billingItemId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.at(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
