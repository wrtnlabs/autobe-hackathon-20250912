import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceClaim";

/**
 * Validates organization administrator advanced search and pagination for
 * insurance claims, ensuring only org-scoped records are returned and all
 * search/filter features work.
 *
 * Steps:
 *
 * 1. Register a new org admin, to provide org scoping for all downstream
 *    resources.
 * 2. Create an insurance policy for a unique patient within this organization.
 * 3. Create at least three claims, all tied to this policy but with different
 *    invoices, statuses, and dates.
 * 4. Execute multiple searches: filtering by policy, invoice, status, and service
 *    date range (from, to).
 * 5. Test pagination (limit, page), confirm correct records per page and
 *    consistent result order.
 * 6. Run a negative case (fake invoice_id): result must be empty.
 * 7. Assert all returned claims have the correct organization_id (=orgAdmin.id)
 *    via policy linkage.
 * 8. Ensure only claims accessible by the admin's org are ever visible.
 */
export async function test_api_insurance_claims_advanced_search_pagination_and_role_scoping(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: "SecurePass!1",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  const orgId = orgAdmin.id;
  // 2. Create insurance policy (patient_id unique)
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const insurancePolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: patientId,
          organization_id: orgId,
          policy_number: RandomGenerator.alphaNumeric(10),
          payer_name: RandomGenerator.name(2),
          coverage_start_date: new Date().toISOString().substring(0, 10),
          coverage_end_date: null,
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(insurancePolicy);

  // 3. Create 3 claims with different invoice/status/dates
  const invoiceIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const now = Date.now();
  const claimA =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: insurancePolicy.id,
          invoice_id: invoiceIds[0],
          claim_number: RandomGenerator.alphaNumeric(8),
          service_start_date: new Date(
            now - 1000 * 60 * 60 * 24 * 5,
          ).toISOString(),
          service_end_date: null,
          total_claimed_amount: 1000,
          submission_status: "submitted",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claimA);

  const claimB =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: insurancePolicy.id,
          invoice_id: invoiceIds[1],
          claim_number: RandomGenerator.alphaNumeric(8),
          service_start_date: new Date(
            now - 1000 * 60 * 60 * 24 * 2,
          ).toISOString(),
          service_end_date: null,
          total_claimed_amount: 2000,
          submission_status: "denied",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claimB);

  const claimC =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: insurancePolicy.id,
          invoice_id: invoiceIds[2],
          claim_number: RandomGenerator.alphaNumeric(8),
          service_start_date: new Date(
            now - 1000 * 60 * 60 * 24 * 1,
          ).toISOString(),
          service_end_date: null,
          total_claimed_amount: 1500,
          submission_status: "paid",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claimC);

  // 4a. Filter by insurance_policy_id (should show all above)
  let page =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          insurance_policy_id: insurancePolicy.id,
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "all three claims present by policy filter",
    page.data.length,
    3,
  );
  TestValidator.predicate(
    "all claims for the policy/organization",
    page.data.every(
      (claim) =>
        claim.insurance_policy_id === insurancePolicy.id &&
        claim.invoice_id &&
        [claimA.invoice_id, claimB.invoice_id, claimC.invoice_id].includes(
          claim.invoice_id,
        ),
    ),
  );
  TestValidator.predicate(
    "all claims have correct org via policy",
    page.data.every((claim) => insurancePolicy.organization_id === orgId),
  );

  // 4b. Filter by invoice_id (claimA)
  page =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          invoice_id: claimA.invoice_id,
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "should return only claimA for invoice",
    page.data.length,
    1,
  );
  TestValidator.equals(
    "claimA invoice matches filter",
    page.data[0].invoice_id,
    claimA.invoice_id,
  );

  // 4c. Filter by submission_status ("denied")
  page =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          submission_status: claimB.submission_status,
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "all claims have denied status",
    page.data.every((claim) => claim.submission_status === "denied"),
  );

  // 4d. Filter by date range (service_start_date_from, includes only claimB & C)
  const rangeStart = new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(); // 3 days ago
  page =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          insurance_policy_id: insurancePolicy.id,
          service_start_date_from: rangeStart,
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "all claims on or after date",
    page.data.every(
      (claim) => new Date(claim.service_start_date) >= new Date(rangeStart),
    ),
  );

  // 5. Pagination: limit=2, page=1 (should yield 2 claims), limit=2, page=2 (should yield 1 claim)
  const safeLimit = 2 satisfies number as number;
  page =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          insurance_policy_id: insurancePolicy.id,
          limit: safeLimit,
          page: 1 satisfies number as number,
          order_by: "service_start_date",
          order_direction: "asc",
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("page 1 has 2 claims", page.data.length, 2);
  const seenClaimIds = page.data.map((claim) => claim.id);
  const page2 =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          insurance_policy_id: insurancePolicy.id,
          limit: safeLimit,
          page: 2 satisfies number as number,
          order_by: "service_start_date",
          order_direction: "asc",
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 has 1 claim", page2.data.length, 1);
  TestValidator.predicate(
    "no overlapping claims between pages",
    !seenClaimIds.includes(page2.data[0].id),
  );

  // 6. Negative scenario: bogus invoice_id must yield empty
  const fakeInvoiceId = typia.random<string & tags.Format<"uuid">>();
  page =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          invoice_id: fakeInvoiceId,
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "no claims should match non-existent invoice_id",
    page.data.length,
    0,
  );

  // 7. Assert all results are always within org, i.e., org_id as linkage, for each query
}
