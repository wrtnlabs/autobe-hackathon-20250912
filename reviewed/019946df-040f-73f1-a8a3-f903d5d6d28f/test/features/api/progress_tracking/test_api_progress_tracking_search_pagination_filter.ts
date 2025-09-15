import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProgressTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProgressTracking";

/**
 * End-to-end test for searching progress tracking entries with filters,
 * pagination, and authorization.
 *
 * This test simulates a full corporate learner workflow:
 *
 * 1. Corporate learner joins (registration).
 * 2. Learner logs in to authenticate.
 * 3. Various progress tracking search requests are performed:
 *
 *    - Filtering by learner_id and content_id with pagination.
 *    - Paging through multiple pages, verifying metadata.
 *    - Testing invalid filters return errors.
 *    - Testing unauthorized access errors.
 *
 * It asserts the correctness of API responses against input filters and
 * validates pagination metadata.
 *
 * All data uses valid UUIDs and pagination parameters as per DTOs.
 *
 * Authentication tokens are managed automatically by the SDK.
 */
export async function test_api_progress_tracking_search_pagination_filter(
  connection: api.IConnection,
) {
  // Step 1: Register a new corporate learner account.
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `user${RandomGenerator.alphaNumeric(5)}@company.com`,
    password: `Password!${RandomGenerator.alphaNumeric(5)}`,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const joinResponse = await api.functional.auth.corporateLearner.join(
    connection,
    { body: joinBody },
  );
  typia.assert(joinResponse);

  // Step 2: Login with the same user for authentication context.
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loginResponse = await api.functional.auth.corporateLearner.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loginResponse);

  // Capture learner_id and content_id for filtering from random UUIDs.
  const learnerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const contentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Prepare pagination parameters.
  const page1 = 1;
  const limit = 5;

  // Step 3: Perform a valid search request with learner_id and content_id filtering and pagination.
  const searchReq1 = {
    learner_id: learnerId,
    content_id: contentId,
    page: page1,
    limit: limit,
  } satisfies IEnterpriseLmsProgressTracking.IRequest;
  const searchResponse1 =
    await api.functional.enterpriseLms.corporateLearner.progressTracking.indexProgressTracking(
      connection,
      { body: searchReq1 },
    );
  typia.assert(searchResponse1);

  // Validate pagination metadata.
  TestValidator.predicate(
    "pagination current page is correct",
    searchResponse1.pagination.current === page1,
  );
  TestValidator.predicate(
    "pagination limit is as requested",
    searchResponse1.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResponse1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    searchResponse1.pagination.records >= 0,
  );

  // Step 4: Validate that all returned summaries correspond to the filters.
  for (const summary of searchResponse1.data) {
    TestValidator.equals(
      "learner_id matches filter",
      summary.learner_id,
      learnerId,
    );
    TestValidator.equals(
      "content_id matches filter",
      summary.content_id,
      contentId,
    );
  }

  // Step 5: Test search with only pagination parameters (no filters).
  const searchReq2 = {
    page: 2,
    limit: 3,
  } satisfies IEnterpriseLmsProgressTracking.IRequest;
  const searchResponse2 =
    await api.functional.enterpriseLms.corporateLearner.progressTracking.indexProgressTracking(
      connection,
      { body: searchReq2 },
    );
  typia.assert(searchResponse2);

  // Validate pagination metadata on page 2.
  TestValidator.equals(
    "pagination current page is 2",
    searchResponse2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 3",
    searchResponse2.pagination.limit,
    3,
  );

  // Step 6: Test that invalid pagination parameters result in error.
  await TestValidator.error(
    "should fail with invalid page parameter",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.progressTracking.indexProgressTracking(
        connection,
        {
          body: {
            page: -1,
            limit: 5,
          } satisfies IEnterpriseLmsProgressTracking.IRequest,
        },
      );
    },
  );

  await TestValidator.error(
    "should fail with invalid limit parameter",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.progressTracking.indexProgressTracking(
        connection,
        {
          body: {
            page: 1,
            limit: 0,
          } satisfies IEnterpriseLmsProgressTracking.IRequest,
        },
      );
    },
  );

  // Step 7: Test unauthorized access scenario.
  // Create a new unauthenticated connection with empty headers to simulate missing tokens.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "should fail with unauthorized access",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.progressTracking.indexProgressTracking(
        unauthConn,
        {
          body: {} satisfies IEnterpriseLmsProgressTracking.IRequest,
        },
      );
    },
  );
}
