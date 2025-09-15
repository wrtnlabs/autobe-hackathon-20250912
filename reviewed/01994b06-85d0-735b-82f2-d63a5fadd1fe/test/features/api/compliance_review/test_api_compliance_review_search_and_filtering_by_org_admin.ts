import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformComplianceReview";

/**
 * Validate that an organization admin can query only their organization's
 * compliance reviews via search, filter, and pagination endpoints, enforcing
 * RBAC boundaries and business logic for
 * /healthcarePlatform/organizationAdmin/complianceReviews.
 *
 * Steps:
 *
 * 1. Register & authenticate an org admin and extract their credentials.
 * 2. Issue a PATCH search with org-admin token & valid filters, confirm only
 *    reviews for their org returned, validate pagination/metadata.
 * 3. Try filtering for non-owned reviewer/org/risk_assessment IDs and expect
 *    empty/denied results.
 * 4. Confirm response data's organization_id matches the admin's assigned org only
 *    and pagination is correct.
 * 5. Provide invalid IDs or escalate filter to another org - expect 0 results or
 *    proper rejection.
 */
export async function test_api_compliance_review_search_and_filtering_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Query compliance reviews belonging to their org via PATCH - no filters (should return reviews for own org)
  const searchReq1 = {
    organization_id: admin.id, // as org admins should be limited to their org context
    limit: 5,
    page: 1,
  } satisfies IHealthcarePlatformComplianceReview.IRequest;
  const page1: IPageIHealthcarePlatformComplianceReview =
    await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.index(
      connection,
      { body: searchReq1 },
    );
  typia.assert(page1);
  // Validate all returned reviews belong only to the admin's org
  for (const review of page1.data) {
    TestValidator.equals(
      "review must match admin organization",
      review.organization_id,
      searchReq1.organization_id,
    );
  }

  // 3. Query with random reviewer & risk_assessment filters (simulate code-paths)
  const searchReq2 = {
    organization_id: admin.id,
    reviewer_id: typia.random<string & tags.Format<"uuid">>(),
    risk_assessment_id: typia.random<string & tags.Format<"uuid">>(),
    limit: 3,
    page: 1,
  } satisfies IHealthcarePlatformComplianceReview.IRequest;
  const page2: IPageIHealthcarePlatformComplianceReview =
    await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.index(
      connection,
      { body: searchReq2 },
    );
  typia.assert(page2);
  // Results should still conform
  for (const review of page2.data) {
    TestValidator.equals(
      "review still limited to own org (reviewer/risk_assessment filter)",
      review.organization_id,
      searchReq2.organization_id,
    );
  }

  // 4. Query using a reviewer or org from ANOTHER org (expect empty result)
  const fakeOrgId = typia.random<string & tags.Format<"uuid">>();
  const forbiddenReq = {
    organization_id: fakeOrgId,
    limit: 2,
    page: 1,
  } satisfies IHealthcarePlatformComplianceReview.IRequest;
  const forbiddenResult =
    await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.index(
      connection,
      { body: forbiddenReq },
    );
  typia.assert(forbiddenResult);
  TestValidator.equals(
    "forbidden org returns empty data",
    forbiddenResult.data.length,
    0,
  );

  // 5. Request a page outside of results, validation for pagination metadata
  const searchReq3 = {
    organization_id: admin.id,
    limit: 1,
    page: 999,
  } satisfies IHealthcarePlatformComplianceReview.IRequest;
  const pageOut =
    await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.index(
      connection,
      { body: searchReq3 },
    );
  typia.assert(pageOut);
  TestValidator.equals(
    "out of range page returns 0 data",
    pageOut.data.length,
    0,
  );

  // 6. Pagination info matches the returned result set
  TestValidator.predicate(
    "pagination reflects result set",
    page1.data.length <= page1.pagination.limit,
  );
}
