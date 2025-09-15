import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformComplianceReview";

/**
 * Validate system admin compliance review search, filter, and pagination,
 * including RBAC and error handling.
 *
 * 1. Register a unique system admin with random business email and strong password
 * 2. Authenticate as this admin (implicit by join)
 * 3. Make requests to complianceReviews.index with various filters: org, hold_id,
 *    risk_assessment_id, reviewer_id, status, review_type (using random
 *    UUIDs/strings or known values from real data if available)
 * 4. For each filter, verify that response only includes reviews matching the
 *    filter if such exist, and that pagination metadata is sensible
 * 5. For a general request (no filters) with a small 'limit', test pagination by
 *    requesting page 1 then page 2, verifying non-overlapping results and
 *    correct metadata
 * 6. Attempt an unauthorized filter (nonsense or likely-invalid org_id) and verify
 *    error is returned and RBAC is respected
 * 7. Attempt invalid input (bad uuid format for org_id) and confirm clear error
 * 8. All typia.assert() where applicable; use TestValidator.predicate/equals for
 *    business validation
 * 9. TestValidator.error for error cases
 */
export async function test_api_compliance_review_search_and_filtering_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const uniqueEmail = `${RandomGenerator.alphaNumeric(12)}@enterprise-corp.com`;
  const joinBody = {
    email: uniqueEmail,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: uniqueEmail,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, uniqueEmail);
  TestValidator.equals(
    "RBAC verified: admin is assigned id",
    typeof admin.id,
    "string",
  );

  // 2. Make a general query (no filter) with a small limit for pagination
  const generalReq = {
    limit: 2,
  } satisfies IHealthcarePlatformComplianceReview.IRequest;
  const firstPage =
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
      connection,
      { body: generalReq },
    );
  typia.assert(firstPage);
  TestValidator.predicate("pagination meta present", !!firstPage.pagination);
  TestValidator.equals("limit honored", firstPage.pagination.limit, 2);
  TestValidator.equals("data array", Array.isArray(firstPage.data), true);

  // If multiple pages, get second page and check different IDs
  if (firstPage.pagination.pages > 1) {
    const secondPageReq = {
      ...generalReq,
      page: 2,
    } satisfies IHealthcarePlatformComplianceReview.IRequest;
    const secondPage =
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
        connection,
        { body: secondPageReq },
      );
    typia.assert(secondPage);
    TestValidator.predicate(
      "pagination meta present (p2)",
      !!secondPage.pagination,
    );
    const allIds = [
      ...firstPage.data.map((d) => d.id),
      ...secondPage.data.map((d) => d.id),
    ];
    const unique = Array.from(new Set(allIds));
    TestValidator.equals(
      "page 1 and 2 unique ids",
      unique.length,
      allIds.length,
    );
  }

  // 3. Filter tests (try with firstPage data if available)
  const anyReview = firstPage.data[0];
  if (anyReview) {
    // By organization
    if (anyReview.organization_id) {
      const byOrgReq = {
        organization_id: anyReview.organization_id,
      } satisfies IHealthcarePlatformComplianceReview.IRequest;
      const byOrg =
        await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
          connection,
          { body: byOrgReq },
        );
      typia.assert(byOrg);
      TestValidator.predicate(
        "org_id filter respected",
        byOrg.data.every(
          (item) => item.organization_id === anyReview.organization_id,
        ),
      );
    }
    // By reviewer_id
    if (anyReview.reviewer_id) {
      const byReviewerReq = {
        reviewer_id: anyReview.reviewer_id,
      } satisfies IHealthcarePlatformComplianceReview.IRequest;
      const byReviewer =
        await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
          connection,
          { body: byReviewerReq },
        );
      typia.assert(byReviewer);
      TestValidator.predicate(
        "reviewer_id filter respected",
        byReviewer.data.every(
          (item) => item.reviewer_id === anyReview.reviewer_id,
        ),
      );
    }
    // By status
    if (anyReview.status) {
      const byStatusReq = {
        status: anyReview.status,
      } satisfies IHealthcarePlatformComplianceReview.IRequest;
      const byStatus =
        await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
          connection,
          { body: byStatusReq },
        );
      typia.assert(byStatus);
      TestValidator.predicate(
        "status filter respected",
        byStatus.data.every((item) => item.status === anyReview.status),
      );
    }
    // By review_type
    if (anyReview.review_type) {
      const byTypeReq = {
        review_type: anyReview.review_type,
      } satisfies IHealthcarePlatformComplianceReview.IRequest;
      const byType =
        await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
          connection,
          { body: byTypeReq },
        );
      typia.assert(byType);
      TestValidator.predicate(
        "review_type filter respected",
        byType.data.every((item) => item.review_type === anyReview.review_type),
      );
    }
    // By hold_id if present
    if (anyReview.hold_id !== null && anyReview.hold_id !== undefined) {
      const byHoldReq = {
        hold_id: anyReview.hold_id,
      } satisfies IHealthcarePlatformComplianceReview.IRequest;
      const byHold =
        await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
          connection,
          { body: byHoldReq },
        );
      typia.assert(byHold);
      TestValidator.predicate(
        "hold_id filter respected",
        byHold.data.every((item) => item.hold_id === anyReview.hold_id),
      );
    }
    // By risk_assessment_id if present
    if (
      anyReview.risk_assessment_id !== null &&
      anyReview.risk_assessment_id !== undefined
    ) {
      const byRiskReq = {
        risk_assessment_id: anyReview.risk_assessment_id,
      } satisfies IHealthcarePlatformComplianceReview.IRequest;
      const byRisk =
        await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
          connection,
          { body: byRiskReq },
        );
      typia.assert(byRisk);
      TestValidator.predicate(
        "risk_assessment_id filter respected",
        byRisk.data.every(
          (item) => item.risk_assessment_id === anyReview.risk_assessment_id,
        ),
      );
    }
  }

  // 4. Test sorting (if results exist)
  if (firstPage.data.length > 1) {
    const sortByCreated = {
      sort_by: "created_at",
      sort_direction: "desc",
    } satisfies IHealthcarePlatformComplianceReview.IRequest;
    const sorted =
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
        connection,
        { body: sortByCreated },
      );
    typia.assert(sorted);
    TestValidator.predicate("sorted descending created_at", () => {
      for (let i = 1; i < sorted.data.length; ++i) {
        if (sorted.data[i - 1].created_at < sorted.data[i].created_at)
          return false;
      }
      return true;
    });
  }

  // 5. Error cases
  // Invalid org (syntactic, but likely unauthorized/random)
  const invalidOrgId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "RBAC: cannot filter forbidden org_id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
        connection,
        {
          body: {
            organization_id: invalidOrgId,
          } satisfies IHealthcarePlatformComplianceReview.IRequest,
        },
      );
    },
  );
  // Bad input (malformed uuid)
  await TestValidator.error("bad input: org_id not uuid", async () => {
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.index(
      connection,
      { body: { organization_id: "not-a-uuid" as any } as any },
    );
  });
}
