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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingItem";

/**
 * End-to-end scenario that tests PATCH-ing billing items on a billing invoice
 * as a department head.
 *
 * 1. OrgAdmin sign up, login.
 * 2. DepartmentHead sign up, login.
 * 3. OrgAdmin creates a billing code.
 * 4. OrgAdmin creates a billing invoice (supply valid patient + org)
 * 5. DepartmentHead (correct department) PATCHes billingItems for invoiceId:
 *    supplies valid billing_code_id and invoice_id in body; confirms success
 *    and verifies item in response.
 * 6. Tries PATCH as OrgAdmin (wrong role) -- denied.
 * 7. Tries PATCH to non-existent invoiceId -- denied.
 * 8. Attempts PATCH with missing/wrong billing_code_id or invoice_id in body,
 *    expects error.
 * 9. Optionally, retrieves PATCHed invoice items to confirm update. Uses only
 *    correct types for all bodies.
 */
export async function test_api_billing_invoice_patch_items_department_head_workflow_and_permission_enforcement(
  connection: api.IConnection,
) {
  // 1. Register organizationAdmin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // 2. Login as OrgAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Register departmentHead
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadEmail,
      full_name: RandomGenerator.name(),
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(deptHead);

  // 4. Login as departmentHead
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 5. Login back as OrgAdmin to set up invoice/billing code
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // 6. OrgAdmin create a billing code
  const billingCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(7),
          code_system: RandomGenerator.name(1),
          name: RandomGenerator.name(2),
          active: true,
        } satisfies IHealthcarePlatformBillingCode.ICreate,
      },
    );
  typia.assert(billingCode);

  // 7. OrgAdmin creates invoice
  const billingInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          invoice_number: RandomGenerator.alphaNumeric(10),
          status: "draft",
          total_amount: 1000,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(billingInvoice);

  // 8. DepartmentHead logs in
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 9. PATCH billingInvoice items (must supply invoiceId as path param and both billing_code_id, invoice_id as filters)
  const patchItemsQuery = {
    billing_code_id: billingCode.id,
    invoice_id: billingInvoice.id,
    limit: 10,
    offset: 0,
  } satisfies IHealthcarePlatformBillingItem.IRequest;
  const patched =
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.index(
      connection,
      {
        billingInvoiceId: billingInvoice.id,
        body: patchItemsQuery,
      },
    );
  typia.assert(patched);
  TestValidator.equals(
    "patch response has correct pagination invoice_id",
    patched.data[0]?.invoice_id,
    billingInvoice.id,
  );

  // 10. PATCH as OrgAdmin (should be denied)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error("PATCH as orgAdmin should be denied", async () => {
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.index(
      connection,
      {
        billingInvoiceId: billingInvoice.id,
        body: patchItemsQuery,
      },
    );
  });

  // 11. PATCH for a non-existent invoiceId
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  const fakeInvoiceId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("PATCH for non-existent invoiceId", async () => {
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.index(
      connection,
      {
        billingInvoiceId: fakeInvoiceId,
        body: patchItemsQuery,
      },
    );
  });

  // 12. PATCH with missing billing_code_id (business error)
  await TestValidator.error("PATCH with missing billing_code_id", async () => {
    const { billing_code_id, ...rest } = patchItemsQuery;
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.index(
      connection,
      {
        billingInvoiceId: billingInvoice.id,
        body: rest as IHealthcarePlatformBillingItem.IRequest,
      },
    );
  });

  // 13. PATCH with wrong billing_code_id (but type correct)
  await TestValidator.error("PATCH with wrong billing_code_id", async () => {
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.index(
      connection,
      {
        billingInvoiceId: billingInvoice.id,
        body: {
          ...patchItemsQuery,
          billing_code_id: fakeInvoiceId,
        },
      },
    );
  });
  // 14. PATCH with wrong invoice_id (type correct, non-existent)
  await TestValidator.error("PATCH with wrong invoice_id", async () => {
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.billingItems.index(
      connection,
      {
        billingInvoiceId: billingInvoice.id,
        body: {
          ...patchItemsQuery,
          invoice_id: fakeInvoiceId,
        },
      },
    );
  });
}
