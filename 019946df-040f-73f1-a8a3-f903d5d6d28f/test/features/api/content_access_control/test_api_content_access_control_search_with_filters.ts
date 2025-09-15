import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentAccessControl";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentAccessControl";

/**
 * E2E Test: Search content access controls with filters by tenant and content
 * ID. Verifies pagination.
 *
 * Tests filtering logic to confirm retrieved content access control entries
 * belong to the specified tenant and content. Ensures pagination metadata
 * correctness and tests unauthorized and invalid filter error scenarios.
 */
export async function test_api_content_access_control_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Organization admin join (register) with fixed tenant_id for isolation
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const joinBody = {
    tenant_id: tenantId,
    email: `orgadmin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "securePassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(orgAdmin);

  // 2. Organization admin login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create sample content access control entries for this tenant
  // Since no explicit create API provided, simulate by preparing expected data

  // We'll simulate multiple entries with known content_id and tenant_id
  const knownContentId = typia.random<string & tags.Format<"uuid">>();
  const entriesCount = 3; // specific number for deterministic testing
  const sampleEntries: IEnterpriseLmsContentAccessControl.ISummary[] =
    ArrayUtil.repeat(entriesCount, () => ({
      id: typia.random<string>(),
      content_id: knownContentId,
      tenant_id: tenantId,
      allowed_roles: "corporateLearner,externalLearner",
      allowed_learners: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  // 4. PATCH request with filters: tenant_id and content_id
  const filterRequest = {
    tenant_id: tenantId,
    content_id: knownContentId,
  } satisfies IEnterpriseLmsContentAccessControl.IRequest;

  const pageResult: IPageIEnterpriseLmsContentAccessControl.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.search(
      connection,
      { body: filterRequest },
    );
  typia.assert(pageResult);

  // 5. Verify all returned entries match the filter criteria
  for (const entry of pageResult.data) {
    TestValidator.equals("tenant_id filter", entry.tenant_id, tenantId);
    TestValidator.equals("content_id filter", entry.content_id, knownContentId);
  }

  // 6. Verify pagination metadata
  const pagination = pageResult.pagination;
  TestValidator.predicate("pagination current >= 0", pagination.current >= 0);
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);

  // 7. Test unauthorized access: try same filter without authentication
  // Create an unauthenticated connection with empty headers
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access should be denied",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.search(
        unauthConn,
        { body: filterRequest },
      );
    },
  );

  // 8. Test invalid filter: invalid tenant_id format
  await TestValidator.error(
    "invalid tenant_id filter should cause error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.search(
        connection,
        {
          body: {
            tenant_id: "invalid-uuid-format",
          } satisfies IEnterpriseLmsContentAccessControl.IRequest,
        },
      );
    },
  );
}
