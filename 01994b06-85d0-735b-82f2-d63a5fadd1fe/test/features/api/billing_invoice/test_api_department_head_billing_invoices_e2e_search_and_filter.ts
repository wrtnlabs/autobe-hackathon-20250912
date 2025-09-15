import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingInvoice";

/**
 * E2E scenario: department head billing invoice search and filter
 *
 * Validates the search and filter endpoint for billing invoices accessible to a
 * department head. Verifies both successful retrieval with correct scope and
 * error cases for security-enforcement.
 *
 * Workflow:
 *
 * 1. Register a department head account (random, isolated test credentials)
 * 2. Login as department head to establish auth context
 * 3. Search for billing invoices by organization_id (note: actual org linkage
 *    can't be checked due to DTO limits)
 * 4. Search with additional filters: patient_id, status, date range (can only
 *    check status, not actual patient ID linkage)
 * 5. Confirm all returned invoices structurally match and status filter is
 *    enforced (can't strictly check org/patient containment)
 * 6. Attempt to search with unauthorized organization_id—should error or be
 *    disallowed
 * 7. Attempt to search with unauthorized patient_id—should error or be disallowed
 *
 * Validations:
 *
 * - Endpoint enforces filter and error rules for cross-org access attempts
 * - Status filter in results is respected
 * - All API calls use properly authenticated context
 */
export async function test_api_department_head_billing_invoices_e2e_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Register new department head with random credentials
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const deptHeadJoin = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(),
        password: deptHeadPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(deptHeadJoin);

  // 2. Login as department head to ensure correct authentication context
  const deptHeadLogin = await api.functional.auth.departmentHead.login(
    connection,
    {
      body: {
        email: deptHeadEmail,
        password: deptHeadPassword,
      } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
    },
  );
  typia.assert(deptHeadLogin);

  // 3. Basic search by organization_id (can't verify org linkage in ISummary, just structural)
  const invoiceList1 =
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.index(
      connection,
      {
        body: {
          organization_id: deptHeadJoin.id, // NOTE: No organization property in DTO, using user id as best stand-in
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformBillingInvoice.IRequest,
      },
    );
  typia.assert(invoiceList1);
  // Just check that result is an array and structure matches
  TestValidator.predicate(
    "invoice summaries returned (if any) are structurally valid",
    Array.isArray(invoiceList1.data),
  );

  // 4. Filtered search: status, patient_id, date range
  const filteredInvoiceReq = {
    organization_id: deptHeadJoin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(), // random patient
    status: "paid",
    created_at_from: new Date(Date.now() - 86400000 * 30).toISOString(),
    created_at_to: new Date().toISOString(),
    page: 1,
    limit: 10,
  } satisfies IHealthcarePlatformBillingInvoice.IRequest;
  const invoiceList2 =
    await api.functional.healthcarePlatform.departmentHead.billingInvoices.index(
      connection,
      {
        body: filteredInvoiceReq,
      },
    );
  typia.assert(invoiceList2);
  // Validate only status; can't validate patient linkage
  TestValidator.predicate(
    "all invoices (if returned) should have status 'paid'",
    invoiceList2.data.every((inv) => inv.status === "paid"),
  );

  // 5. Security: search with unauthorized organization_id (random UUID)
  await TestValidator.error(
    "search with unauthorized organization_id should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.billingInvoices.index(
        connection,
        {
          body: {
            organization_id: typia.random<string & tags.Format<"uuid">>(),
            page: 1,
            limit: 5,
          } satisfies IHealthcarePlatformBillingInvoice.IRequest,
        },
      );
    },
  );

  // 6. Security: search with unauthorized patient_id (random UUID)
  await TestValidator.error(
    "search with unauthorized patient_id should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.billingInvoices.index(
        connection,
        {
          body: {
            organization_id: deptHeadJoin.id,
            patient_id: typia.random<string & tags.Format<"uuid">>(),
            page: 1,
            limit: 5,
          } satisfies IHealthcarePlatformBillingInvoice.IRequest,
        },
      );
    },
  );
}
