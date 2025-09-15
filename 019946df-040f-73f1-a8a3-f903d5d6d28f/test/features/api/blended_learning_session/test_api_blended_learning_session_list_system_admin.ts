import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";

/**
 * Test scenario for system administrator listing blended learning sessions.
 *
 * This test performs the following steps:
 *
 * 1. System admin user registration via join endpoint.
 * 2. System admin user login to obtain auth tokens.
 * 3. Listing blended learning sessions via PATCH
 *    /enterpriseLms/systemAdmin/blendedLearningSessions with specific
 *    filtering and pagination parameters.
 * 4. Validation of response metadata and data conformity to filters.
 * 5. Negative tests for invalid pagination values and unauthorized access.
 *
 * This validates role-based access control, filtering logic, and pagination
 * correctness for system admins.
 */
export async function test_api_blended_learning_session_list_system_admin(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const createBody = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const authorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. System admin login
  const loginBody = {
    email: createBody.email,
    password_hash: createBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Positive test - list blended learning sessions filtered with pagination
  const filterBody = {
    session_type: "online",
    status: "scheduled",
    page: 1,
    limit: 10,
    order_by: "scheduled_start_at desc",
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;

  const pageResult: IPageIEnterpriseLmsBlendedLearningSession.ISummary =
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
      connection,
      { body: filterBody },
    );
  typia.assert(pageResult);

  // Validate pagination fields
  TestValidator.predicate(
    "current page is positive",
    pageResult.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", pageResult.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    pageResult.pagination.pages >= 0,
  );

  // Validate each session in data matches filters
  for (const session of pageResult.data) {
    typia.assert(session);
    TestValidator.equals(
      "session status matches filter",
      session.status,
      filterBody.status,
    );
    // We cannot directly assert session_type because ISummary does not have it
  }

  // 4. Negative test: invalid page number
  await TestValidator.error("invalid page number throws error", async () => {
    const invalidPagination = {
      page: -1,
      limit: 10,
    } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;

    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
      connection,
      { body: invalidPagination },
    );
  });

  // 5. Negative test: invalid limit number
  await TestValidator.error("invalid limit number throws error", async () => {
    const invalidPagination = {
      page: 1,
      limit: -5,
    } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;

    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
      connection,
      { body: invalidPagination },
    );
  });

  // 6. Negative test: unauthorized access - simulate by using empty headers connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access throws error", async () => {
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
      unauthConn,
      { body: filterBody },
    );
  });
}
