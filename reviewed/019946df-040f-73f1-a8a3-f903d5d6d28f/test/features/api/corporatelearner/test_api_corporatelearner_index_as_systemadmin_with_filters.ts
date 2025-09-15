import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsCorporatelearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCorporatelearner";

/**
 * This test validates the retrieval of corporate learner user summaries by
 * a system administrator with search, filtering, sorting, and pagination
 * features.
 *
 * Workflow:
 *
 * 1. Register a new system administrator user (join).
 * 2. Login as the system administrator to authenticate.
 * 3. Perform multiple PATCH requests to
 *    /enterpriseLms/systemAdmin/corporatelearners with varying query
 *    parameters to test pagination, search, and filter capabilities.
 * 4. Validate the structure and content of responses and ensure pagination is
 *    correct.
 * 5. Test edge cases like empty results and maximum limits.
 * 6. Assert proper error handling for invalid parameters.
 *
 * Notes:
 *
 * - All API requests require the systemAdmin role which is verified by
 *   authenticated token.
 * - Random realistic data is generated via typia.random and RandomGenerator.
 * - All API response data is validated with typia.assert for full type
 *   safety.
 * - No manual token header manipulation is needed, SDK manages tokens
 *   automatically.
 */
export async function test_api_corporatelearner_index_as_systemadmin_with_filters(
  connection: api.IConnection,
) {
  // 1. System admin registration (join)
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(adminAuthorized);

  // 2. Login as system admin for subsequent operations (SDK auto manages tokens)
  const loginBody = {
    email: createBody.email,
    password_hash: createBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Define tests for corporate learners index API with filters and pagination

  // Helper function to perform index API call with given request
  async function callIndex(
    req: IEnterpriseLmsCorporateLearner.IRequest,
  ): Promise<IPageIEnterpriseLmsCorporatelearner.ISummary> {
    const output =
      await api.functional.enterpriseLms.systemAdmin.corporatelearners.indexCorporatelearners(
        connection,
        { body: req },
      );
    typia.assert(output);
    return output;
  }

  // 4. Test with empty filters (all defaults), expect valid pagination
  {
    const req = {} satisfies IEnterpriseLmsCorporateLearner.IRequest;
    const output = await callIndex(req);
    typia.assert(output.pagination);
    typia.assert(output.data);
    TestValidator.predicate(
      "pagination current page must be >= 0",
      output.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination record count must be >= 0",
      output.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination limit must be >= 0",
      output.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "page count must be pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination pages is at least 1 if records exist",
      output.pagination.records === 0 || output.pagination.pages >= 1,
    );
  }

  // 5. Test with search term filter - realistic string
  {
    const searchValue = RandomGenerator.substring(
      "testuser corporation learner system admin active suspended pending",
    );
    const req = {
      search: searchValue,
    } satisfies IEnterpriseLmsCorporateLearner.IRequest;
    const output = await callIndex(req);
    typia.assert(output);
    // Validate all returned learner summaries have matching search term in email, first or last name
    for (const learner of output.data) {
      const found =
        learner.email.includes(searchValue) ||
        learner.first_name.includes(searchValue) ||
        learner.last_name.includes(searchValue);
      TestValidator.predicate(
        `learner ${learner.id} matches search term '${searchValue}'`,
        found,
      );
    }
  }

  // 6. Test with status filter with allowed enum values - "active", "suspended", "pending"
  {
    const statuses = ["active", "suspended", "pending"] as const;
    const chosenStatus = RandomGenerator.pick(statuses);
    const req = {
      status: chosenStatus,
    } satisfies IEnterpriseLmsCorporateLearner.IRequest;
    const output = await callIndex(req);
    typia.assert(output);
    for (const learner of output.data) {
      TestValidator.equals(
        `learner status match for status: ${chosenStatus}`,
        learner.status,
        chosenStatus,
      );
    }
  }

  // 7. Test with pagination parameters - valid page and limit
  {
    const req = {
      page: 0,
      limit: 10,
    } satisfies IEnterpriseLmsCorporateLearner.IRequest;
    const output = await callIndex(req);
    typia.assert(output);
    TestValidator.equals(
      "pagination current page",
      output.pagination.current,
      0,
    );
    TestValidator.equals("pagination limit", output.pagination.limit, 10);
    TestValidator.predicate(
      "pagination record count is >= returned data length",
      output.pagination.records >= output.data.length,
    );
  }

  // 8. Test with maximum limit boundary - upper realistic limit assumed 100
  {
    const req = {
      page: 0,
      limit: 100,
    } satisfies IEnterpriseLmsCorporateLearner.IRequest;
    const output = await callIndex(req);
    typia.assert(output);
    TestValidator.equals(
      "pagination limit max test",
      output.pagination.limit,
      100,
    );
    TestValidator.predicate(
      "pagination record count is >= returned data length",
      output.pagination.records >= output.data.length,
    );
  }

  // 9. Test with invalid page and limit values, expect errors handled by backend
  // Note: We test negative page which should be logically invalid, expect empty or error

  await TestValidator.error(
    "invalid negative page number should fail",
    async () => {
      await callIndex({ page: -1 });
    },
  );
  await TestValidator.error(
    "invalid negative limit number should fail",
    async () => {
      await callIndex({ limit: -10 });
    },
  );
}
