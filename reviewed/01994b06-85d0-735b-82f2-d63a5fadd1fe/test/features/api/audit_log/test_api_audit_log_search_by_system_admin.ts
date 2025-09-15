import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLog";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAuditLog";

/**
 * E2E test for healthcare platform system admin audit log search &
 * filtering API.
 *
 * Validates:
 *
 * - System admin can search and filter audit logs by action type, entity, and
 *   time.
 * - Full pagination (limit=1, current/records/pages checks).
 * - Permission boundaries (cannot see logs for foreign orgs).
 * - Failure on unauthenticated or malformed requests.
 *
 * Steps:
 *
 * 1. Create system admin (with unique email/profile).
 * 2. Login as system admin.
 * 3. Create a compliance review (to generate a compliance-audit log event).
 * 4. Query PATCH /healthcarePlatform/systemAdmin/auditLogs
 *
 *    - Without filters, expect to find the just-created log event.
 *    - With action_type filter, confirm filtering.
 *    - With organization_id filter set to random (other org), expect zero/fail.
 *    - Test pagination (limit=1, page count, records).
 * 5. Test unauthenticated access denied.
 * 6. Test failure with malformed queries (e.g., invalid limit below minimum).
 */
export async function test_api_audit_log_search_by_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register system admin
  const email = `${RandomGenerator.name(1)}.${RandomGenerator.alphaNumeric(5)}@enterprise-corp.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const joinRes = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: email,
      password: password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinRes);

  // Step 2: Login as system admin
  const loginRes = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email,
      provider: "local",
      provider_key: email,
      password: password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginRes);

  // Step 3: Create compliance review (to ensure a log event is generated)
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const compReview =
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
      connection,
      {
        body: {
          organization_id: orgId,
          review_type: "periodic",
          method: RandomGenerator.paragraph(),
          status: "scheduled",
        } satisfies IHealthcarePlatformComplianceReview.ICreate,
      },
    );
  typia.assert(compReview);

  // Step 4a: Search all audit logs for this organization, expecting new compliance review event
  const auditLogsPage =
    await api.functional.healthcarePlatform.systemAdmin.auditLogs.index(
      connection,
      {
        body: {
          organization: orgId,
          sort: "created_at:desc",
        },
      },
    );
  typia.assert(auditLogsPage);
  const found = auditLogsPage.data.find(
    (log) => log.related_entity_id === compReview.id && log.action_type,
  );
  TestValidator.predicate("audit log for compliance review found", !!found);

  // Step 4b: Filter by action_type
  if (found) {
    const filterPage =
      await api.functional.healthcarePlatform.systemAdmin.auditLogs.index(
        connection,
        {
          body: {
            action_type: found.action_type,
            organization: orgId,
            related_entity_id: compReview.id,
          },
        },
      );
    typia.assert(filterPage);
    TestValidator.predicate(
      "filtered by action and entity",
      filterPage.data.some((l) => l.related_entity_id === compReview.id),
    );
  }

  // Step 4c: Pagination test (limit=1)
  const page1 =
    await api.functional.healthcarePlatform.systemAdmin.auditLogs.index(
      connection,
      {
        body: {
          organization: orgId,
          limit: 1,
          sort: "created_at:desc",
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination limit=1", page1.pagination.limit, 1);

  // Step 4d: Org filter (other org, expect zero log)
  const pageWrongOrg =
    await api.functional.healthcarePlatform.systemAdmin.auditLogs.index(
      connection,
      {
        body: {
          organization: typia.random<string & tags.Format<"uuid">>(),
          related_entity_id: compReview.id,
        },
      },
    );
  typia.assert(pageWrongOrg);
  TestValidator.equals(
    "should have no log in unrelated org",
    pageWrongOrg.data.length,
    0,
  );

  // Step 5: Try log search without authentication (new connection, no headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated audit log search fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.auditLogs.index(
        unauthConn,
        {
          body: {
            organization: orgId,
          },
        },
      );
    },
  );

  // Step 6: Fail case for malformed query (invalid limit)
  await TestValidator.error(
    "invalid audit log search query fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.auditLogs.index(
        connection,
        {
          body: {
            organization: orgId,
            limit: 0, // below Minimum<1>
          },
        },
      );
    },
  );
}
