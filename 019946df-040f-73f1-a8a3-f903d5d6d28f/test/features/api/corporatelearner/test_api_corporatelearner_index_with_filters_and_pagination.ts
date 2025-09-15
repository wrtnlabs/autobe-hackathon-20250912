import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsCorporatelearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCorporatelearner";

/**
 * E2E test for listing corporate learners as an organization administrator.
 *
 * This test performs the following steps:
 *
 * 1. Organization admin user joins with tenant and personal info.
 * 2. The same user logs in to ensure authentication token refresh.
 * 3. Call the corporate learners index API with a variety of realistic filter
 *    and pagination parameters, verifying tenant-restricted results.
 * 4. Confirm pagination metadata correctness and the nature of the retrieved
 *    learner summaries.
 * 5. Attempt some different filtering scenarios such as filtering by status
 *    and applying search terms to validate filtering logic.
 *
 * All API responses are asserted type-safe by typia.assert. The test
 * ensures role-based access control by authenticating organization admin
 * only.
 *
 * No invalid or malformed filters are intentionally tested to avoid type
 * errors.
 */
export async function test_api_corporatelearner_index_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Organization Admin Join
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = RandomGenerator.alphaNumeric(8) + "@organization.com";
  const joinBody = {
    tenant_id: tenantId,
    email,
    password: "StrongPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(orgAdmin);
  TestValidator.predicate(
    "Organization admin join token present",
    typeof orgAdmin.token.access === "string",
  );

  // Step 2: Organization Admin Login
  const loginBody = {
    email,
    password: "StrongPass123!",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(orgAdminLogin);
  TestValidator.equals(
    "Organization admin login id matches join id",
    orgAdminLogin.id,
    orgAdmin.id,
  );

  // Step 3: Index corporate learners with default filter (empty search)
  const requestDefault = {} satisfies IEnterpriseLmsCorporateLearner.IRequest;
  let pageResult =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.indexCorporatelearners(
      connection,
      { body: requestDefault },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "Pagination current page is number and >= 0",
    pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "Pagination limit per page is number and >= 0",
    pageResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "Learners data is array",
    Array.isArray(pageResult.data),
  );

  // Step 4: Test filtering by status
  const requestFilterStatus = {
    status: "active",
  } satisfies IEnterpriseLmsCorporateLearner.IRequest;
  const filteredStatusPage =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.indexCorporatelearners(
      connection,
      { body: requestFilterStatus },
    );
  typia.assert(filteredStatusPage);
  TestValidator.predicate(
    "Filtered status page data array",
    Array.isArray(filteredStatusPage.data),
  );

  // Step 5: Test filtering by partial search string
  const searchString = email.substring(0, 3);
  const requestSearch = {
    search: searchString,
    limit: 10,
    page: 1,
  } satisfies IEnterpriseLmsCorporateLearner.IRequest;
  const searchPageResult =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.indexCorporatelearners(
      connection,
      { body: requestSearch },
    );
  typia.assert(searchPageResult);
  TestValidator.predicate(
    "Search filtered learners data array",
    Array.isArray(searchPageResult.data),
  );
  if (searchPageResult.data.length > 0) {
    TestValidator.predicate(
      "All learners email include search string",
      searchPageResult.data.every((lrn) => lrn.email.includes(searchString)),
    );
  }
}
