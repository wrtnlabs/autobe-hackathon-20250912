import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end test for department head updating a billing invoice item.
 *
 * Steps:
 *
 * 1. Register and authenticate department head
 * 2. Register and authenticate organization admin
 * 3. Organization admin creates billing invoice
 * 4. Department head creates a billing item for the invoice
 * 5. Department head updates the billing item (e.g., quantity, description)
 * 6. Validate the API response and ensure fields were updated
 *
 * The test will switch authentication context as needed using only the
 * official auth/login APIs. DTOs:
 *
 * - IHealthcarePlatformOrganizationAdmin.IJoin,
 *   IHealthcarePlatformOrganizationAdmin.ILogin,
 *   IHealthcarePlatformOrganizationAdmin.IAuthorized
 * - IHealthcarePlatformDepartmentHead.IJoinRequest,
 *   IHealthcarePlatformDepartmentHead.ILoginRequest,
 *   IHealthcarePlatformDepartmentHead.IAuthorized
 * - IHealthcarePlatformBillingInvoice.ICreate,
 *   IHealthcarePlatformBillingInvoice
 * - IHealthcarePlatformBillingItem.ICreate, IHealthcarePlatformBillingItem,
 *   IHealthcarePlatformBillingItem.IUpdate
 */
export async function test_api_billing_invoice_item_update_by_department_head_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const deptHeadFullName = RandomGenerator.name();
  await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadEmail,
      full_name: deptHeadFullName,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  const deptHeadAuth = await api.functional.auth.departmentHead.login(
    connection,
    {
      body: {
        email: deptHeadEmail,
        password: deptHeadPassword,
      } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
    },
  );
  typia.assert(deptHeadAuth);

  // 2. Register and authenticate organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminFullName = RandomGenerator.name();
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdminEmail,
      full_name: orgAdminFullName,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  const orgAdminAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminAuth);

  // 3. Organization admin creates billing invoice
  const invoiceCreate = {
    organization_id: orgAdminAuth.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: 10000,
    currency: "USD",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceCreate },
    );
  typia.assert(invoice);

  // 4. Department head login and create billing item
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  const billingItemCreate = {
    invoice_id: invoice.id,
    billing_code_id: typia.random<string & tags.Format<"uuid">>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    quantity: typia.random<number & tags.Type<"int32">>(),
    unit_price: 500,
  } satisfies IHealthcarePlatformBillingItem.ICreate;
  const billingItem =
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: billingItemCreate,
      },
    );
  typia.assert(billingItem);

  // 5. Department head updates the billing item
  const updateData = {
    description: RandomGenerator.paragraph({ sentences: 3 }),
    quantity: billingItem.quantity + 1,
    unit_price: billingItem.unit_price + 50,
    total_amount: (billingItem.quantity + 1) * (billingItem.unit_price + 50),
  } satisfies IHealthcarePlatformBillingItem.IUpdate;
  const updatedItem =
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.update(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingItemId: billingItem.id,
        body: updateData,
      },
    );
  typia.assert(updatedItem);

  // 6. Validate the update
  TestValidator.equals(
    "updated description",
    updatedItem.description,
    updateData.description,
  );
  TestValidator.equals(
    "updated quantity",
    updatedItem.quantity,
    updateData.quantity,
  );
  TestValidator.equals(
    "updated unit price",
    updatedItem.unit_price,
    updateData.unit_price,
  );
  TestValidator.equals(
    "updated total amount",
    updatedItem.total_amount,
    updateData.total_amount,
  );
}
