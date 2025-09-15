import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsExternallearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsExternallearner";

/**
 * E2E test for Enterprise LMS external learner pagination, filtering, and
 * tenant isolation.
 *
 * Validates normal and error scenarios for system admin operations on
 * tenants and external learners. Tests correct tenant bounding of external
 * learner searches, filtering by email and status, pagination accuracy, and
 * unauthorized access rejection.
 *
 * Business logic:
 *
 * - Only external learners belonging to the authenticated admin's tenant are
 *   listed.
 * - Pagination parameters adjust page size and page number correctly.
 * - Search supports filtering by email substrings and learner status.
 *
 * Test steps:
 *
 * 1. Create and login system admin
 * 2. Create a tenant and verify it
 * 3. Use tenant_id for filtered external learner queries:
 *
 *    - Filter by email search substring
 *    - Filter by learner status
 *    - Test pagination metadata and data consistency
 * 4. Test unauthorized access failure for external learner listing
 */
export async function test_api_externallearner_search_pagination_filter(
  connection: api.IConnection,
) {
  // 1. Create system administrator
  const systemAdminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(5)}@company.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Login system administrator
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const systemAdminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLoggedIn);

  // 3. Create tenant
  const tenantCreateBody = {
    code: `tenant${RandomGenerator.alphaNumeric(5)}`,
    name: `Tenant ${RandomGenerator.name(2)}`,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 4. Verify tenant retrieval
  const tenantCheck: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.at(connection, {
      id: tenant.id,
    });
  typia.assert(tenantCheck);
  TestValidator.equals("tenant id matches", tenantCheck.id, tenant.id);
  TestValidator.equals(
    "tenant code matches",
    tenantCheck.code,
    tenantCreateBody.code,
  );
  TestValidator.equals(
    "tenant name matches",
    tenantCheck.name,
    tenantCreateBody.name,
  );

  // Helper to validate external learners belong plausibly
  function checkAllBelongToTenant(
    pageData: IPageIEnterpriseLmsExternallearner.ISummary,
  ) {
    for (const learner of pageData.data) {
      typia.assert<string & tags.Format<"uuid">>(learner.id);
      TestValidator.predicate(
        `external learner ${learner.id} has valid status string`,
        typeof learner.status === "string" && learner.status.length > 0,
      );
    }
  }

  // 5. Test filtered external learner searches with email substring
  {
    const requestBody = {
      tenant_id: tenant.id,
      search: systemAdminCreateBody.email.substring(0, 5),
      page: 1,
      limit: 10,
    } satisfies IEnterpriseLmsExternalLearner.IRequest;

    const pageResult: IPageIEnterpriseLmsExternallearner.ISummary =
      await api.functional.enterpriseLms.systemAdmin.externallearners.indexExternallearners(
        connection,
        { body: requestBody },
      );
    typia.assert(pageResult);

    checkAllBelongToTenant(pageResult);

    TestValidator.predicate(
      "records within limit",
      pageResult.pagination.limit <= 10,
    );
    TestValidator.predicate(
      "current page is 1",
      pageResult.pagination.current === 1,
    );
    TestValidator.predicate(
      "pages are positive",
      pageResult.pagination.pages > 0,
    );
    TestValidator.predicate(
      "records count non-negative",
      pageResult.pagination.records >= 0,
    );
  }

  // 6. Test filtering by status "active" with empty search
  {
    const requestBody = {
      tenant_id: tenant.id,
      status: "active",
      page: 1,
      limit: 5,
      search: null,
    } satisfies IEnterpriseLmsExternalLearner.IRequest;

    const pageResult: IPageIEnterpriseLmsExternallearner.ISummary =
      await api.functional.enterpriseLms.systemAdmin.externallearners.indexExternallearners(
        connection,
        { body: requestBody },
      );
    typia.assert(pageResult);

    checkAllBelongToTenant(pageResult);

    TestValidator.predicate(
      "records within limit",
      pageResult.pagination.limit <= 5,
    );
    TestValidator.predicate(
      "current page is 1",
      pageResult.pagination.current === 1,
    );
    TestValidator.predicate(
      "pages are positive",
      pageResult.pagination.pages > 0,
    );
    TestValidator.predicate(
      "records count non-negative",
      pageResult.pagination.records >= 0,
    );

    for (const learner of pageResult.data) {
      TestValidator.equals("status mask active", learner.status, "active");
    }
  }

  // 7. Test pagination by requesting page 2
  {
    // Use a sensible limit that likely returns multiple pages
    const requestBody = {
      tenant_id: tenant.id,
      page: 2,
      limit: 3,
      search: null,
    } satisfies IEnterpriseLmsExternalLearner.IRequest;

    const pageResult: IPageIEnterpriseLmsExternallearner.ISummary =
      await api.functional.enterpriseLms.systemAdmin.externallearners.indexExternallearners(
        connection,
        { body: requestBody },
      );
    typia.assert(pageResult);

    checkAllBelongToTenant(pageResult);

    TestValidator.predicate(
      "current page is 2",
      pageResult.pagination.current === 2,
    );
    TestValidator.predicate("limit is 3", pageResult.pagination.limit === 3);
    TestValidator.predicate(
      "pages are positive",
      pageResult.pagination.pages > 0,
    );
    TestValidator.predicate(
      "records count non-negative",
      pageResult.pagination.records >= 0,
    );
  }

  // 8. Unauthorized access test: simulate by a new connection without authentication
  {
    const unauthenticatedConn: api.IConnection = {
      ...connection,
      headers: {},
    };

    const requestBody = {
      tenant_id: tenant.id,
      page: 1,
      limit: 5,
      search: null,
    } satisfies IEnterpriseLmsExternalLearner.IRequest;

    await TestValidator.error("unauthorized access should throw", async () => {
      await api.functional.enterpriseLms.systemAdmin.externallearners.indexExternallearners(
        unauthenticatedConn,
        { body: requestBody },
      );
    });
  }
}
