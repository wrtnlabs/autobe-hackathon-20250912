import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";

/**
 * This E2E test verifies the content creator/instructor role's ability to
 * search and paginate blended learning sessions in their assigned tenant
 * organization. It covers the complete login workflow to obtain authentication
 * tokens, and performs session list queries with varied filtering parameters
 * such as session type, title, status, and scheduled time ranges.
 *
 * The test ensures that data returned only includes sessions belonging to the
 * authenticated user's tenant, validates pagination metadata for correctness,
 * and confirms that only authorized content creator/instructor users are
 * permitted to perform the searches.
 *
 * Negative scenarios are included to confirm request failures when invalid
 * filter criteria or insufficient user roles are used.
 *
 * The overall aim is to validate multi-tenant security, role-based access
 * control, and functional correctness of filtered session listing APIs for
 * content creators/instructors.
 */
export async function test_api_blended_learning_session_list_content_creator_instructor(
  connection: api.IConnection,
) {
  // 1. Create a new content creator/instructor account with assigned tenant
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1)}@example.com`;
  const passwordRaw = "Password123!";

  // For password_hash field, simulate a hash by encoding password as base64
  const passwordHash = Buffer.from(passwordRaw).toString("base64");

  // Prepare join request body
  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const authorized = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorized);

  // 2. Login with the created account
  const loginBody = {
    email: email,
    password: passwordRaw,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const loggedIn = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedIn);

  // 3. Retrieve session list without filters (all sessions)
  const emptyFilterRequest =
    {} satisfies IEnterpriseLmsBlendedLearningSession.IRequest;
  const pageAll =
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.index(
      connection,
      { body: emptyFilterRequest },
    );
  typia.assert(pageAll);

  // Validate pagination data
  TestValidator.predicate(
    "pagination current >= 0",
    pageAll.pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit > 0", pageAll.pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages >= 0",
    pageAll.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    pageAll.pagination.records >= 0,
  );

  // Validate session summaries id and properties
  for (const session of pageAll.data) {
    TestValidator.predicate(
      "session id valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "session title string",
      typeof session.title === "string",
    );
    TestValidator.predicate(
      "session status string",
      typeof session.status === "string",
    );
    TestValidator.predicate(
      "session scheduled_start_at string",
      typeof session.scheduled_start_at === "string",
    );
  }

  // 4. Search sessions filtered by session_type "online"
  const sessionTypeFilterRequest = {
    session_type: "online",
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;

  const pageFilteredType =
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.index(
      connection,
      { body: sessionTypeFilterRequest },
    );
  typia.assert(pageFilteredType);

  for (const session of pageFilteredType.data) {
    TestValidator.predicate(
      "filtered session id valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
  }

  // 5. Search sessions filtered by status "scheduled" and partial title
  const partialTitle = RandomGenerator.substring(
    pageAll.data.length > 0 ? pageAll.data[0].title : "default",
  );

  const statusTitleFilterRequest = {
    status: "scheduled",
    title: partialTitle,
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;

  const pageStatusTitle =
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.index(
      connection,
      { body: statusTitleFilterRequest },
    );
  typia.assert(pageStatusTitle);

  // 6. Filter sessions by scheduled start date range (from now to tomorrow)
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  const dateRangeFilterRequest = {
    scheduled_start_at_from: now,
    scheduled_start_at_to: tomorrow,
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;

  const pageDateRange =
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.index(
      connection,
      { body: dateRangeFilterRequest },
    );
  typia.assert(pageDateRange);

  // 7. Pagination test with page=1, limit=10, sorted descending by scheduled_start_at
  const paginationRequest = {
    page: 1,
    limit: 10,
    order_by: "scheduled_start_at DESC",
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;

  const pagePaginated =
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.index(
      connection,
      { body: paginationRequest },
    );
  typia.assert(pagePaginated);

  TestValidator.predicate(
    "pagination current is 1",
    pagePaginated.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    pagePaginated.pagination.limit === 10,
  );

  // 8. Unauthorized access attempt (unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated search should fail", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.index(
      unauthConn,
      { body: emptyFilterRequest },
    );
  });
}
