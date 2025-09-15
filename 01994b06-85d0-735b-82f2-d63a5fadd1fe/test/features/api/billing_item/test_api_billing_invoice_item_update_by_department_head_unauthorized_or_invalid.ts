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
 * Negative billing item update scenarios for department head role:
 *
 * - Attempt to update a billing item with invalid payload (such as negative
 *   quantity or unit_price).
 * - Attempt to update a billing item on an invoice where the user is unauthorized
 *   or invoice/item doesn't belong to them.
 *
 * Steps:
 *
 * 1. Register org admin, login, create invoice as admin
 * 2. Register department head, login as dept head
 * 3. Create a billing item as department head under the invoice
 * 4. Attempt to update billing item with an invalid payload (e.g., negative
 *    quantity), expect error and no data change
 * 5. Register a secondary department head, login, attempt to update the original
 *    billing item (unauthorized), expect error
 */
export async function test_api_billing_invoice_item_update_by_department_head_unauthorized_or_invalid(
  connection: api.IConnection,
) {
  // 1. Register org admin & login
  const orgEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgEmail,
        full_name: RandomGenerator.name(),
        password: "Password123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  // 2. Create invoice as admin
  const invoiceReq = {
    organization_id: orgAdmin.id, // purposely using admin's id as org id for mock
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: 10000,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice: IHealthcarePlatformBillingInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceReq },
    );
  typia.assert(invoice);

  // 3. Register department head & login
  const deptEmail = typia.random<string & tags.Format<"email">>();
  const deptHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: deptEmail,
        full_name: RandomGenerator.name(),
        password: "Password123!",
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(deptHead);

  // 4. Create billing item as department head under invoice
  const billingItemCreate = {
    invoice_id: invoice.id,
    billing_code_id: typia.random<string & tags.Format<"uuid">>(),
    description: RandomGenerator.paragraph(),
    quantity: 1,
    unit_price: 1000,
  } satisfies IHealthcarePlatformBillingItem.ICreate;
  const item: IHealthcarePlatformBillingItem =
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.create(
      connection,
      { billingInvoiceId: invoice.id, body: billingItemCreate },
    );
  typia.assert(item);

  // 5. Attempt to update billing item with a negative quantity (invalid)
  await TestValidator.error(
    "Department head cannot update billing item with negative quantity",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingItemId: item.id,
          body: {
            quantity: -10,
          } satisfies IHealthcarePlatformBillingItem.IUpdate,
        },
      );
    },
  );

  // 6. Register another department head (unauthorized), login
  const otherDeptEmail = typia.random<string & tags.Format<"email">>();
  const otherDeptHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: otherDeptEmail,
        full_name: RandomGenerator.name(),
        password: "Password123!",
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(otherDeptHead);

  // 7. Login as other department head, try to update original billing item (should fail)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: otherDeptEmail,
      password: "Password123!",
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  await TestValidator.error(
    "Unauthorized department head cannot update foreign billing item",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingItemId: item.id,
          body: {
            description: "Malicious update attempt",
          } satisfies IHealthcarePlatformBillingItem.IUpdate,
        },
      );
    },
  );
}
