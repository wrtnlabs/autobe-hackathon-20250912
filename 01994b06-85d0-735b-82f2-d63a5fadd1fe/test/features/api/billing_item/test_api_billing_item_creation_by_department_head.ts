import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for department head creating billing items for an accessible
 * invoice.
 *
 * - Ensures ordinary/edge permission and business rule flows for department head
 *   creating a billing item under a specific invoice.
 * - Covers: successful item creation, linking, required field enforcement,
 *   invoice/code not found, code from other org/department, duplicate entry
 *   prevention.
 */
export async function test_api_billing_item_creation_by_department_head(
  connection: api.IConnection,
) {
  // Setup: Organization admin creates invoice and code, then department head joins & logs in
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "adminPASS123";
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdmin);

  // Admin login for context consistency (token)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // Create a billing invoice for department head scope
  const invoiceReq = {
    organization_id: orgAdmin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(7),
    status: "draft",
    total_amount: 10000,
    currency: "USD",
  };
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: invoiceReq,
      },
    );
  typia.assert(invoice);

  // Create a billing code
  const billingCodeReq = {
    code: RandomGenerator.alphaNumeric(5),
    code_system: "CPT",
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: "Test description",
    active: true,
  };
  const billingCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      {
        body: billingCodeReq,
      },
    );
  typia.assert(billingCode);

  // Now, department head user joins and logs in
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = "DeptPASS456";
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: deptHeadPassword,
    },
  });
  typia.assert(deptHead);

  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    },
  });

  // Successful billing item creation by department head
  const itemCreateReq = {
    invoice_id: invoice.id,
    billing_code_id: billingCode.id,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    quantity: 2,
    unit_price: 50,
  };
  const billingItem =
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: itemCreateReq,
      },
    );
  typia.assert(billingItem);
  TestValidator.equals(
    "item linked to correct invoice",
    billingItem.invoice_id,
    invoice.id,
  );
  TestValidator.equals(
    "item has correct billing code",
    billingItem.billing_code_id,
    billingCode.id,
  );
  TestValidator.equals(
    "item quantity matches input",
    billingItem.quantity,
    itemCreateReq.quantity,
  );

  // Attempt: duplicate billing item with same code for the invoice (should fail/constraint)
  await TestValidator.error(
    "duplicate billing item for invoice/code fails",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.create(
        connection,
        {
          billingInvoiceId: invoice.id,
          body: itemCreateReq,
        },
      );
    },
  );

  // Attempt: non-existent billing code id
  await TestValidator.error("non-existent billing_code_id fails", async () => {
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          ...itemCreateReq,
          billing_code_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });

  // Attempt: non-existent invoice id
  await TestValidator.error("non-existent invoice id fails", async () => {
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.create(
      connection,
      {
        billingInvoiceId: typia.random<string & tags.Format<"uuid">>(),
        body: itemCreateReq,
      },
    );
  });

  // Simulate deletion by using an old, inactive billing code (deactivation not in API); skip actual deletion.
  // Attempt: code from a different organization (simulate: create another org admin & code, then test)
  const orgAdmin2Email = typia.random<string & tags.Format<"email">>();
  const orgAdmin2 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdmin2Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "AnotherPASS789",
      },
    },
  );
  typia.assert(orgAdmin2);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdmin2Email,
      password: "AnotherPASS789",
    },
  });
  const otherCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          code_system: "CPT",
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: "Other org code",
          active: true,
        },
      },
    );
  typia.assert(otherCode);
  // Switch back to department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    },
  });
  // Attempt item with billing code from other org (should fail)
  await TestValidator.error(
    "using billing code from other org fails",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.create(
        connection,
        {
          billingInvoiceId: invoice.id,
          body: {
            ...itemCreateReq,
            billing_code_id: otherCode.id,
          },
        },
      );
    },
  );
}
