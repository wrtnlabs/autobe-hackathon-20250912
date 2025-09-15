import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingInvoice";

/**
 * Validate org admin billing invoice search, pagination & filters.
 *
 * Steps:
 *
 * 1. Register/Login as system admin
 * 2. System admin creates org
 * 3. Org admin registers/logs in
 * 4. Create two patients
 * 5. Org admin creates two invoices with diff. patients/status/invoice numbers
 * 6. Search all for org (no filters)—result: both
 * 7. Search & filter by one patient/status — result: one
 * 8. Paginate with limit=1—result: correct item/page
 * 9. Filter by unknown patient—result: empty
 * 10. Filter by non-org organization_id—error
 */
export async function test_api_billing_invoice_search_by_org_admin_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. Register/login system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPW = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPW,
    },
  });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPW,
    },
  });
  // 2. Create org
  const orgCode = RandomGenerator.alphaNumeric(8);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(org);

  // 3. Org admin reg/log
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPW = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPW,
        // provider/provider_key omitted for local
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPW,
    },
  });
  // 4. Two patients
  const patient1Email = typia.random<string & tags.Format<"email">>();
  const patient2Email = typia.random<string & tags.Format<"email">>();
  const patient1 =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patient1Email,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1990-01-01T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient1);
  const patient2 =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patient2Email,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1992-02-02T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient2);

  // 5. Org admin creates invoices (status/invoice_number differ)
  const invoiceNum1 = RandomGenerator.alphaNumeric(10);
  const invoiceNum2 = RandomGenerator.alphaNumeric(10);
  const invoice1 =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: org.id,
          patient_id: patient1.id,
          invoice_number: invoiceNum1,
          status: "sent",
          total_amount: 1000,
          currency: "USD",
          description: RandomGenerator.paragraph(),
          due_date: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    );
  typia.assert(invoice1);
  const invoice2 =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: org.id,
          patient_id: patient2.id,
          invoice_number: invoiceNum2,
          status: "paid",
          total_amount: 2000,
          currency: "USD",
          description: RandomGenerator.paragraph(),
          due_date: null,
        },
      },
    );
  typia.assert(invoice2);
  // 6. Search all for org (both results)
  let searchAll =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.index(
      connection,
      {
        body: {
          organization_id: org.id,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(searchAll);
  TestValidator.predicate(
    "Result contains both invoices",
    searchAll.data.length >= 2 &&
      searchAll.data.some((r) => r.invoice_number === invoiceNum1) &&
      searchAll.data.some((r) => r.invoice_number === invoiceNum2),
  );
  TestValidator.equals("pagination org scope", searchAll.pagination.current, 1);

  // 7. Filter by patient & status
  let patient1Search =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.index(
      connection,
      {
        body: {
          organization_id: org.id,
          patient_id: patient1.id,
        },
      },
    );
  typia.assert(patient1Search);
  TestValidator.equals(
    "patient1 filtered count",
    patient1Search.data.length,
    1,
  );
  TestValidator.equals(
    "patient1 invoice_number matches",
    patient1Search.data[0].invoice_number,
    invoiceNum1,
  );

  let statusSearch =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.index(
      connection,
      {
        body: {
          organization_id: org.id,
          status: "paid",
        },
      },
    );
  typia.assert(statusSearch);
  TestValidator.equals("status=paid count", statusSearch.data.length, 1);
  TestValidator.equals(
    "status=paid invoice_number",
    statusSearch.data[0].invoice_number,
    invoiceNum2,
  );

  // 8. Paginate with limit=1
  let page1 =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.index(
      connection,
      {
        body: {
          organization_id: org.id,
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("limit 1 page count", page1.data.length, 1);
  TestValidator.equals("pagination current page", page1.pagination.current, 1);

  // 9. Unknown patient (should yield no results)
  const fakePatientId = typia.random<string & tags.Format<"uuid">>();
  let emptySearch =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.index(
      connection,
      {
        body: {
          organization_id: org.id,
          patient_id: fakePatientId,
        },
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "unknown patient search yields nothing",
    emptySearch.data.length,
    0,
  );

  // 10. Other org id (should error)
  const otherOrgId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "filtering by non-owned org id forbidden",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.index(
        connection,
        {
          body: {
            organization_id: otherOrgId,
          },
        },
      );
    },
  );
}
