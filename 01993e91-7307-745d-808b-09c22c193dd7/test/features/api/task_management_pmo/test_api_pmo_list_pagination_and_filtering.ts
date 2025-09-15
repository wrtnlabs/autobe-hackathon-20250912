import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementPmo";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

export async function test_api_pmo_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new PMO user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const joinedPmo: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(joinedPmo);

  // 2. Login with the registered PMO user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const loggedInPmo: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(loggedInPmo);

  // 3. Call the PMO list endpoint with various filters and pagination
  // a) Full request with search and specific pagination and order
  const requestBody1 = {
    search: loggedInPmo.name.substring(0, 2),
    page: 1,
    limit: 5,
    orderBy: "email",
  } satisfies ITaskManagementPmo.IRequest;

  const page1: IPageITaskManagementPmo.ISummary =
    await api.functional.taskManagement.pmo.taskManagement.pmos.indexPmo(
      connection,
      { body: requestBody1 },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page1 pagination current equals 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate("page1 limit equals 5", page1.pagination.limit === 5);
  TestValidator.predicate(
    "page1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("page1 data length <= limit", page1.data.length <= 5);

  // b) Request with empty filters to test default pagination and ordering
  const requestBody2 = {} satisfies ITaskManagementPmo.IRequest;
  const page2: IPageITaskManagementPmo.ISummary =
    await api.functional.taskManagement.pmo.taskManagement.pmos.indexPmo(
      connection,
      { body: requestBody2 },
    );
  typia.assert(page2);
  TestValidator.predicate(
    "page2 pagination current defaults to 1",
    page2.pagination.current === 1,
  );
  TestValidator.predicate(
    "page2 limit defaults to 20",
    page2.pagination.limit === 20,
  );
  TestValidator.predicate(
    "page2 pages non-negative",
    page2.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page2 records non-negative",
    page2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page2 data length <= limit",
    page2.data.length <= 20,
  );

  // 4. Attempt call without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access should be denied",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.pmos.indexPmo(
        unauthConnection,
        { body: requestBody2 },
      );
    },
  );

  // 5. Test invalid pagination parameters
  const invalidRequests = [
    { page: -1, limit: 10 },
    { page: 1, limit: 0 },
    { page: 0, limit: 20 },
  ];

  for (const invalidReq of invalidRequests) {
    const body = {
      search: null,
      page: invalidReq.page as number | null,
      limit: invalidReq.limit as number | null,
      orderBy: null,
    } satisfies ITaskManagementPmo.IRequest;

    await TestValidator.error(
      `invalid pagination parameters page=${invalidReq.page} limit=${invalidReq.limit} should fail`,
      async () => {
        await api.functional.taskManagement.pmo.taskManagement.pmos.indexPmo(
          connection,
          { body },
        );
      },
    );
  }
}
