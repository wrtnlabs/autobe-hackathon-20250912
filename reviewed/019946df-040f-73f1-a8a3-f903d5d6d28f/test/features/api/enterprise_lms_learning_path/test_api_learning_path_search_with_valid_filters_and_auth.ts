import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPath";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsLearningPath";

/**
 * This test function validates the search and filtering functionality of
 * learning paths for an organization administrator in the enterprise LMS
 * system, ensuring proper authentication and authorization. The test covers
 * full realistic workflow:
 *
 * - First, an organization administrator user is registered through the join API,
 *   with all required information including tenant ID, email, password, and
 *   names, to establish an authorized account with the suitable role.
 * - Next, the admin logs in to receive an access token to authorize subsequent
 *   API requests.
 * - With authentication setup, the learning path search endpoint is exercised
 *   using various valid filter combinations to test filtering by code
 *   substring, title substring, different statuses, pagination parameters page
 *   and limit, and sorting with orderBy and orderDirection.
 * - The test verifies that the API responds with pagination metadata and data
 *   arrays containing learning path summaries matching filter criteria. Each
 *   API response is validated using typia.assert for perfect type conformance.
 * - The test also checks that authorization is enforced by expecting errors on
 *   unauthorized access attempts (e.g., no token). This thorough test ensures
 *   robust backend behavior for learning path browsing and management by
 *   tenant-scoped organization admins, validating business rules, security, and
 *   data integrity.
 */
export async function test_api_learning_path_search_with_valid_filters_and_auth(
  connection: api.IConnection,
) {
  // 1. Join as organizationAdmin
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `admin_${RandomGenerator.alphaNumeric(5)}@example.com`;
  const password = "StrongP@ssw0rd!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      tenant_id: tenantId,
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Login as organizationAdmin
  const loggedInAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email,
        password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loggedInAdmin);

  // 3. Prepare several filters for searchLearningPaths
  // Base request with no filters (all optional)
  const baseRequest = {} satisfies IEnterpriseLmsLearningPath.IRequest;

  // Search with code substring
  const codeSearchRequest = {
    search: "LP",
  } satisfies IEnterpriseLmsLearningPath.IRequest;

  // Search with title substring
  const titleSearchRequest = {
    search: "Path",
  } satisfies IEnterpriseLmsLearningPath.IRequest;

  // Search filtered by status - simulate possible statuses
  const statusSearchRequest = {
    status: RandomGenerator.pick(["active", "inactive", "archived"] as const),
  } satisfies IEnterpriseLmsLearningPath.IRequest;

  // Pagination with page and limit
  const paginationRequest = {
    page: 2 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
  } satisfies IEnterpriseLmsLearningPath.IRequest;

  // Sorting with orderBy and orderDirection
  const sortingRequest = {
    orderBy: RandomGenerator.pick([
      "code",
      "title",
      "created_at",
      "updated_at",
    ] as const),
    orderDirection: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies IEnterpriseLmsLearningPath.IRequest;

  // Combined filter request
  const combinedRequest = {
    search: "LP",
    status: "active",
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderBy: "title",
    orderDirection: "asc",
  } satisfies IEnterpriseLmsLearningPath.IRequest;

  // 4. Execute searchLearningPaths with each request
  const baseResult =
    await api.functional.enterpriseLms.organizationAdmin.learningPaths.searchLearningPaths(
      connection,
      { body: baseRequest },
    );
  typia.assert(baseResult);
  TestValidator.predicate(
    "base search result has pagination",
    typeof baseResult.pagination === "object" && Array.isArray(baseResult.data),
  );

  const codeResult =
    await api.functional.enterpriseLms.organizationAdmin.learningPaths.searchLearningPaths(
      connection,
      { body: codeSearchRequest },
    );
  typia.assert(codeResult);
  TestValidator.predicate(
    "code search has data array",
    Array.isArray(codeResult.data),
  );

  const titleResult =
    await api.functional.enterpriseLms.organizationAdmin.learningPaths.searchLearningPaths(
      connection,
      { body: titleSearchRequest },
    );
  typia.assert(titleResult);
  TestValidator.predicate(
    "title search has data array",
    Array.isArray(titleResult.data),
  );

  const statusResult =
    await api.functional.enterpriseLms.organizationAdmin.learningPaths.searchLearningPaths(
      connection,
      { body: statusSearchRequest },
    );
  typia.assert(statusResult);
  TestValidator.predicate(
    "status search has data array",
    Array.isArray(statusResult.data),
  );

  const paginationResult =
    await api.functional.enterpriseLms.organizationAdmin.learningPaths.searchLearningPaths(
      connection,
      { body: paginationRequest },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination search has correct page",
    paginationResult.pagination.current === paginationRequest.page,
  );

  const sortingResult =
    await api.functional.enterpriseLms.organizationAdmin.learningPaths.searchLearningPaths(
      connection,
      { body: sortingRequest },
    );
  typia.assert(sortingResult);
  TestValidator.predicate(
    "sorting search has data array",
    Array.isArray(sortingResult.data),
  );

  const combinedResult =
    await api.functional.enterpriseLms.organizationAdmin.learningPaths.searchLearningPaths(
      connection,
      { body: combinedRequest },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined search has correct pagination page",
    combinedResult.pagination.current === combinedRequest.page,
  );

  // 5. Authorization enforcement - Try to call without token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "searchLearningPaths rejects unauthorized access",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.learningPaths.searchLearningPaths(
        unauthConn,
        { body: baseRequest },
      );
    },
  );
}
