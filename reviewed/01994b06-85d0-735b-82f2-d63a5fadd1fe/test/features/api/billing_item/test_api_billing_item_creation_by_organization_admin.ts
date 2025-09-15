import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin billing item creation E2E scenario.
 *
 * - Onboard a new org admin and login to set context.
 * - Create a billing code (active=true).
 * - Create a billing invoice (organization, patient required).
 * - POST a valid billing item specifying valid billing_code_id and invoice_id
 *   under the invoice.
 *
 *   - Validate response: returned billing item links to invoice and billing code,
 *       and is persisted.
 * - Attempt to add a billing item with a duplicate billing_code_id under the same
 *   invoice—expect error.
 * - Use a wrong/non-existent invoice_id or billing_code_id (generate a random
 *   UUID not present in system)—expect error.
 * - Attempt to associate this billing item with an invoice from a different
 *   organization—expect error.
 * - Set billing code to inactive, attempt to use—expect error.
 */
export async function test_api_billing_item_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Onboard organization admin and login
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = RandomGenerator.alphaNumeric(12);
  const admin_fullname = RandomGenerator.name();
  const admin_joined = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin_email,
        password: admin_password,
        full_name: admin_fullname,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin_joined);

  // Login (token is set on connection automatically)
  const admin_logged_in = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: admin_email,
        password: admin_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(admin_logged_in);

  // 2. Create a billing code
  const billing_code_body = {
    code: RandomGenerator.alphaNumeric(6),
    code_system: RandomGenerator.alphabets(4).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    active: true,
  } satisfies IHealthcarePlatformBillingCode.ICreate;
  const billing_code =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      {
        body: billing_code_body,
      },
    );
  typia.assert(billing_code);

  // 3. Create a billing invoice
  const invoice_body = {
    organization_id: admin_joined.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: Math.floor(Math.random() * 10000) + 100,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: invoice_body,
      },
    );
  typia.assert(invoice);

  // 4. Create a billing item (main case)
  const billing_item_body = {
    invoice_id: invoice.id,
    billing_code_id: billing_code.id,
    description: billing_code.name,
    quantity: 3,
    unit_price: 120,
  } satisfies IHealthcarePlatformBillingItem.ICreate;
  const billing_item =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: billing_item_body,
      },
    );
  typia.assert(billing_item);
  TestValidator.equals(
    "billing item should be linked to correct invoice",
    billing_item.invoice_id,
    invoice.id,
  );
  TestValidator.equals(
    "billing item should be linked to correct billing code",
    billing_item.billing_code_id,
    billing_code.id,
  );
  TestValidator.equals(
    "billing item total_amount calculation",
    billing_item.total_amount,
    billing_item.quantity * billing_item.unit_price,
  );

  // 5. Duplicate billing code under same invoice
  await TestValidator.error(
    "Duplicate billing code in same invoice should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
        connection,
        {
          billingInvoiceId: invoice.id,
          body: billing_item_body,
        },
      );
    },
  );

  // 6. Use wrong/nonexistent invoice_id
  const fake_invoice_id = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Nonexistent invoice_id should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: fake_invoice_id,
        body: billing_item_body,
      },
    );
  });

  // 7. Use wrong/nonexistent billing_code_id
  const fake_billing_code_id = typia.random<string & tags.Format<"uuid">>();
  const body_invalid_billing_code = {
    ...billing_item_body,
    billing_code_id: fake_billing_code_id,
  };
  await TestValidator.error(
    "Nonexistent billing_code_id should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
        connection,
        {
          billingInvoiceId: invoice.id,
          body: body_invalid_billing_code,
        },
      );
    },
  );

  // 8. Attempt to use invoice from a different organization—create a second admin/invoice
  const admin2_email = typia.random<string & tags.Format<"email">>();
  const admin2_password = RandomGenerator.alphaNumeric(12);
  const admin2_joined = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin2_email,
        password: admin2_password,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  const invoice2_body = {
    organization_id: admin2_joined.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: Math.floor(Math.random() * 5000) + 50,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice2 =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: invoice2_body,
      },
    );
  // Try posting an item for invoice2 from admin1 session
  await TestValidator.error(
    "Cannot add billing item to invoice of another organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
        connection,
        {
          billingInvoiceId: invoice2.id,
          body: { ...billing_item_body, invoice_id: invoice2.id },
        },
      );
    },
  );

  // 9. Set billing code inactive and attempt to use it
  // No update endpoint given, so simulate by creating a new code with active=false
  const billing_code_inactive =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      {
        body: {
          ...billing_code_body,
          code: RandomGenerator.alphaNumeric(7),
          active: false,
        },
      },
    );
  typia.assert(billing_code_inactive);
  const body_with_inactive_code = {
    ...billing_item_body,
    billing_code_id: billing_code_inactive.id,
  };
  await TestValidator.error(
    "Inactive billing_code should not be allowed for new billing item",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
        connection,
        {
          billingInvoiceId: invoice.id,
          body: body_with_inactive_code,
        },
      );
    },
  );
}
