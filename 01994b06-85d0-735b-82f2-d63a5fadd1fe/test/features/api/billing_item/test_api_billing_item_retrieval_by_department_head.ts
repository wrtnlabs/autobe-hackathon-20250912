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
 * Validates that a department head can retrieve details of a billing item
 * under their accessible scope and enforces proper access control and
 * formatting.
 *
 * 1. Organization admin (setup actor) joins and logs in.
 * 2. Organization admin creates a billing invoice for a new patient (simulated
 *    with random UUIDs).
 * 3. Organization admin creates a billing item attached to the invoice (random
 *    code, description, quantity/price).
 * 4. Department head (actor under test) joins with their own credentials and
 *    logs in.
 * 5. Department head requests the billing item using the correct
 *    billingInvoiceId/billingItemId combination and should get the expected
 *    full detail (validate type and field equality).
 * 6. Attempt to retrieve a billing item with a random invoice/item ID not
 *    belonging to this department; expect a forbidden/not found error (no
 *    details revealed, proper error code).
 * 7. (Edge case) Simulate a soft-delete on the billing item (if possible);
 *    attempt retrieval and expect forbidden/not found error (if such
 *    operation is unavailable, skip step).
 */
export async function test_api_billing_item_retrieval_by_department_head(
  connection: api.IConnection,
) {
  // 1. Organization admin creation and login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Billing invoice creation
  const billingInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          invoice_number: RandomGenerator.alphaNumeric(10),
          status: "draft",
          currency: RandomGenerator.pick(["USD", "EUR", "KRW", "CNY"] as const),
          total_amount: 1000,
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(billingInvoice);

  // 3. Billing item creation
  const billingItem =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: billingInvoice.id,
        body: {
          invoice_id: billingInvoice.id,
          billing_code_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          quantity: 1,
          unit_price: 1000,
        } satisfies IHealthcarePlatformBillingItem.ICreate,
      },
    );
  typia.assert(billingItem);

  // 4. Department head creation and login
  const departmentHeadEmail = typia.random<string & tags.Format<"email">>();
  const departmentHeadPassword = RandomGenerator.alphaNumeric(12);
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: departmentHeadEmail,
        full_name: RandomGenerator.name(),
        password: departmentHeadPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(departmentHead);

  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: departmentHeadEmail,
      password: departmentHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 5. Main flow: retrieve as department head
  const retrieved =
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.at(
      connection,
      {
        billingInvoiceId: billingInvoice.id,
        billingItemId: billingItem.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved billing item matches created",
    retrieved,
    billingItem,
  );

  // 6. Edge: attempt to retrieve random (out-of-scope) billing item
  await TestValidator.error(
    "department head forbidden from accessing unowned billing item",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.at(
        connection,
        {
          billingInvoiceId: typia.random<string & tags.Format<"uuid">>(),
          billingItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
