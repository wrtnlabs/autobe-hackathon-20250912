import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLog";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAuditLog";

/**
 * Validate audit log search and filtering by Organization Admin for
 * organization-scoped compliance logs.
 *
 * This test verifies the Organization Admin can retrieve audit log entries for
 * their own organization, filter by action_type and date range, and get
 * paginated results. It also confirms unauthorized or malformed search attempts
 * fail as expected.
 *
 * Steps:
 *
 * 1. Register a new Organization Admin for an org and log in.
 * 2. Create one or more compliance review records, ensuring audit logs are
 *    generated.
 * 3. Search audit logs by organization, filter by action_type, and filter by
 *    compliance review as related entity.
 * 4. Validate retrieved logs are limited to admin's org, include expected events,
 *    and correct pagination.
 * 5. Attempt a search for audit logs in another organization; expect no results.
 * 6. Attempt audit log search with malformed filter; expect error. (REMOVED,
 *    forbidden)
 * 7. Attempt log search without authentication; expect error.
 */
export async function test_api_audit_log_search_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: "password1234",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Create some compliance reviews within the admin's org
  const complianceReviews = await ArrayUtil.asyncRepeat(3, async () => {
    const payload = {
      organization_id: adminJoin.id,
      review_type: RandomGenerator.pick([
        "periodic",
        "incident",
        "external_audit",
        "followup",
      ] as const),
      method: RandomGenerator.pick([
        "manual audit",
        "external audit",
        "workflow progress",
        "compliance script",
      ] as const),
      status: RandomGenerator.pick([
        "scheduled",
        "in_progress",
        "completed",
      ] as const),
      outcome: RandomGenerator.paragraph(),
      recommendations: RandomGenerator.paragraph(),
      reviewed_at: new Date().toISOString(),
      comments: RandomGenerator.paragraph(),
    } satisfies IHealthcarePlatformComplianceReview.ICreate;
    const review =
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.create(
        connection,
        { body: payload },
      );
    typia.assert(review);
    return review;
  });

  // 3. Search audit logs by organization
  const logPage =
    await api.functional.healthcarePlatform.organizationAdmin.auditLogs.index(
      connection,
      {
        body: {
          organization: adminJoin.id,
          limit: 30,
          sort: "created_at:desc",
        } satisfies IHealthcarePlatformAuditLog.IRequest,
      },
    );
  typia.assert(logPage);
  TestValidator.predicate(
    "all audit logs are from admin's organization",
    logPage.data.every((log) => log.organization_id === adminJoin.id),
  );

  // 4. Filter logs by action_type ('CREATE')
  const logsFilteredByType =
    await api.functional.healthcarePlatform.organizationAdmin.auditLogs.index(
      connection,
      {
        body: {
          organization: adminJoin.id,
          action_type: "CREATE",
          limit: 30,
        } satisfies IHealthcarePlatformAuditLog.IRequest,
      },
    );
  typia.assert(logsFilteredByType);
  TestValidator.predicate(
    "filtered logs all have action_type CREATE",
    logsFilteredByType.data.every((log) => log.action_type === "CREATE"),
  );

  // 5. Filter logs by related entity (compliance review)
  if (complianceReviews.length > 0) {
    const relatedId = complianceReviews[0].id;
    const entityType = "COMPLIANCE_REVIEW";
    const logsByEntity =
      await api.functional.healthcarePlatform.organizationAdmin.auditLogs.index(
        connection,
        {
          body: {
            organization: adminJoin.id,
            related_entity_type: entityType,
            related_entity_id: relatedId,
            limit: 10,
          } satisfies IHealthcarePlatformAuditLog.IRequest,
        },
      );
    typia.assert(logsByEntity);
    TestValidator.predicate(
      "logs filtered by entity match expected entity",
      logsByEntity.data.every(
        (log) =>
          log.related_entity_type === entityType &&
          log.related_entity_id === relatedId,
      ),
    );
  }

  // 6. Pagination
  const paginatedLogs =
    await api.functional.healthcarePlatform.organizationAdmin.auditLogs.index(
      connection,
      {
        body: {
          organization: adminJoin.id,
          page: 1,
          limit: 2,
        } satisfies IHealthcarePlatformAuditLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  TestValidator.predicate(
    "pagination returns <=2 results",
    paginatedLogs.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    paginatedLogs.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination pages positive",
    paginatedLogs.pagination.pages >= 1,
  );

  // 7. Search logs outside admin's org (should yield no results)
  const otherOrgId = typia.random<string & tags.Format<"uuid">>();
  if (otherOrgId !== adminJoin.id) {
    const crossOrgLogs =
      await api.functional.healthcarePlatform.organizationAdmin.auditLogs.index(
        connection,
        {
          body: {
            organization: otherOrgId,
            limit: 5,
          } satisfies IHealthcarePlatformAuditLog.IRequest,
        },
      );
    typia.assert(crossOrgLogs);
    TestValidator.equals(
      "no audit logs returned for non-owned organization",
      crossOrgLogs.data.length,
      0,
    );
  }

  // 8. Unauthorized access (no authentication)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated attempt should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.auditLogs.index(
      unauthenticatedConnection,
      {
        body: {
          organization: adminJoin.id,
        } satisfies IHealthcarePlatformAuditLog.IRequest,
      },
    );
  });
}
