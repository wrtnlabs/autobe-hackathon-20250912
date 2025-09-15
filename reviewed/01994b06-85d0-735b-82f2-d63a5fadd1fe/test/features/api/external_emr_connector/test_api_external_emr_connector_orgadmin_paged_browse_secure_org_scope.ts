import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformExternalEmrConnector";

/**
 * Validate secure, role-based EMR connector search for organization admins.
 *
 * This test ensures that when an organization administrator performs a paged
 * and filtered search for external EMR connector configurations, they only
 * receive connector records belonging to their own organization, with no data
 * leakage across organizations. The test workflow is as follows:
 *
 * 1. Register a new organization administrator using randomized credentials
 *    (email, full_name, etc.).
 * 2. Authenticate as this organization admin, ensuring session context.
 * 3. Attempt to retrieve a paged list of external EMR connectors using the admin's
 *    session. Use basic paging parameters and test at least the default and a
 *    non-default page size. Examine the results and assert:
 *
 *    - Every returned IHealthcarePlatformExternalEmrConnector.ISummary record's
 *         healthcare_platform_organization_id must equal the org admin's
 *         organization (inferred from the session).
 *    - The response's pagination and data array must be present and properly typed.
 *    - There may be zero records, but there must not be any showing a different org
 *         id.
 * 4. Validate that search is NOT accessible without authentication. Call the
 *    endpoint with a non-authenticated connection and ensure an error is
 *    thrown.
 *
 * Success criteria:
 *
 * - All connectors returned belong ONLY to the authenticated admin's org.
 * - Response contains correct schema (pagination, data array).
 * - Unauthenticated access is forbidden.
 * - No connectors from other organizations are visible under this admin's
 *   session.
 */
export async function test_api_external_emr_connector_orgadmin_paged_browse_secure_org_scope(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const orgAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "AutoBEpassw0rd!",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdminResp = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminBody },
  );
  typia.assert(orgAdminResp);

  // 2. Login as organization admin
  const loginResp = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminBody.email,
        password: orgAdminBody.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResp);

  // 3a. Search as org admin (default page size)
  let pagedResp =
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.index(
      connection,
      {
        body: {
          page: 1,
          page_size: 5,
        } satisfies IHealthcarePlatformExternalEmrConnector.IRequest,
      },
    );
  typia.assert(pagedResp);
  for (const summary of pagedResp.data) {
    TestValidator.equals(
      "connector belongs to orgAdmin's org",
      summary.healthcare_platform_organization_id,
      orgAdminResp.id,
    );
  }
  TestValidator.predicate(
    "pagination is present",
    pagedResp.pagination !== undefined && pagedResp.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current > 0",
    pagedResp.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    pagedResp.pagination.limit > 0,
  );

  // 3b. Search another page size (simulate pagination)
  pagedResp =
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.index(
      connection,
      {
        body: {
          page: 2,
          page_size: 2,
        } satisfies IHealthcarePlatformExternalEmrConnector.IRequest,
      },
    );
  typia.assert(pagedResp);
  for (const summary of pagedResp.data) {
    TestValidator.equals(
      "connector belongs to orgAdmin's org (page 2)",
      summary.healthcare_platform_organization_id,
      orgAdminResp.id,
    );
  }

  // 4. Access without authentication (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.index(
      unauthConn,
      {
        body: {
          page: 1,
          page_size: 5,
        } satisfies IHealthcarePlatformExternalEmrConnector.IRequest,
      },
    );
  });
}
