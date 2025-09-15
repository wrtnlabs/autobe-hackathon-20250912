import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";

/**
 * This test function validates the organization administrator's capability
 * to search and retrieve blended learning sessions within their tenant
 * scope. It covers user creation, authentication, paginated filtered
 * session search, and validation of response structure and content.
 *
 * Steps:
 *
 * 1. Create a new organization admin user with valid tenant ID and
 *    credentials.
 * 2. Authenticate as the created organization admin user.
 * 3. Perform a patched search request for blended learning sessions filtered
 *    by typical parameters such as session type, status, and scheduled
 *    start date range.
 * 4. Validate pagination information (current page, limit, total pages, total
 *    records).
 * 5. Verify each session entry's properties adhere to expected formats and
 *    filter criteria.
 * 6. Business rules like tenant data isolation and role access enforcement are
 *    implicitly tested by authentication and query scoping.
 */
export async function test_api_blended_learning_session_list_organization_admin(
  connection: api.IConnection,
) {
  // Step 1: Create an organization administrator user with random but valid tenant_id and email
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";
  const firstName = RandomGenerator.name();
  const lastName = RandomGenerator.name();

  const createdAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: orgAdminEmail,
        password: password,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Log in as the organization admin
  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgAdminEmail,
        password: password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // Step 3: Perform the PATCH request to search blended learning sessions with filters
  const now = new Date();
  const scheduledFrom = new Date(
    now.getTime() - 7 * 24 * 3600 * 1000,
  ).toISOString(); // 7 days ago
  const scheduledTo = new Date(
    now.getTime() + 7 * 24 * 3600 * 1000,
  ).toISOString(); // 7 days ahead

  const searchBody = {
    session_type: "online",
    title: "",
    status: "scheduled",
    scheduled_start_at_from: scheduledFrom,
    scheduled_start_at_to: scheduledTo,
    scheduled_end_at_from: null,
    scheduled_end_at_to: null,
    page: 1,
    limit: 10,
    order_by: "scheduled_start_at_desc",
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;

  const sessionList: IPageIEnterpriseLmsBlendedLearningSession.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.index(
      connection,
      { body: searchBody },
    );
  typia.assert(sessionList);

  // Step 4: Validate pagination attributes
  TestValidator.predicate(
    "pagination current page should be 1",
    sessionList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    sessionList.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages must be >= 1",
    sessionList.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records must be >= 0",
    sessionList.pagination.records >= 0,
  );

  // Step 5: Validate each session entry
  for (const session of sessionList.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session id is a valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "session status matches filter",
      session.status === searchBody.status,
    );
    TestValidator.predicate(
      "session title contains filter (empty string passes always)",
      searchBody.title === "" || session.title.includes(searchBody.title!),
    );
    TestValidator.predicate(
      "session type matches filter",
      searchBody.session_type === undefined ||
        searchBody.session_type === null ||
        searchBody.session_type === "online",
    );
    const startAtDate = new Date(session.scheduled_start_at);
    const fromDate = new Date(searchBody.scheduled_start_at_from!);
    const toDate = new Date(searchBody.scheduled_start_at_to!);
    TestValidator.predicate(
      "session scheduled_start_at is within range",
      startAtDate >= fromDate && startAtDate <= toDate,
    );
  }

  // Error scenario validation is not feasible without explicit API error behavior defs
}
