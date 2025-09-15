import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeAuditLog";

/**
 * Validate audit logs search with filters and authorization enforcement.
 *
 * This test ensures that audit logs can be retrieved with specific filters
 * for actor_id and target_id. It covers the entire workflow for an admin
 * user:
 *
 * 1. Register and authenticate an admin user.
 * 2. Perform filter-based audit log searches by actor_id and target_id.
 * 3. Validate that audit entries returned correspond exactly to the filters.
 * 4. Check that pagination info is accurate and consistent.
 * 5. Attempt access with unauthenticated user to assert authorization.
 *
 * The test will create admin credentials, perform filtered audit log
 * queries, validate response data, and confirm access control enforcement.
 *
 * @param connection Api.IConnection API connection context
 */
export async function test_api_flexoffice_audit_logs_search_with_filters_and_authorization(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strongPassword123!";
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // Step 2: Login with admin credentials to establish authorization context
  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // Use admin user id for filtering audit logs
  const actorId = adminAuthorized.id;
  // For target_id, to simulate real target, use the same admin's id
  const targetId = adminAuthorized.id;

  // Step 3: Perform audit log search with actor_id and target_id filters
  const auditRequest: IFlexOfficeAuditLog.IRequest = {
    actor_id: actorId,
    target_id: targetId,
  };

  const auditPage: IPageIFlexOfficeAuditLog.ISummary =
    await api.functional.flexOffice.admin.audits.index(connection, {
      body: auditRequest,
    });
  typia.assert(auditPage);

  // Step 4: Validate all audit entries match the filters
  for (const auditEntry of auditPage.data) {
    // actor_id may be null, so check only if present
    if (auditEntry.actor_id !== null && auditEntry.actor_id !== undefined) {
      TestValidator.equals(
        "actor_id matches filter",
        auditEntry.actor_id,
        actorId,
      );
    }
    // target_id may be null, so check only if present
    if (auditEntry.target_id !== null && auditEntry.target_id !== undefined) {
      TestValidator.equals(
        "target_id matches filter",
        auditEntry.target_id,
        targetId,
      );
    }
  }

  // Step 5: Validate pagination metadata
  const pagination = auditPage.pagination;
  TestValidator.predicate(
    "pagination current page >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);

  // Optional strict check that pages matches ceiling(records / limit)
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination pages matches ceiling(records / limit)",
      pagination.pages,
      expectedPages,
    );
  }

  // Step 6: Verify that non-authorized access is blocked
  // Create a new connection without auth headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {}, // no authorization token
  };

  await TestValidator.error(
    "unauthorized access should throw error",
    async () => {
      await api.functional.flexOffice.admin.audits.index(
        unauthenticatedConnection,
        {
          body: auditRequest,
        },
      );
    },
  );
}
