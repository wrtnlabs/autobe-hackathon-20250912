import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * Tests the comprehensive workflow of a designer user registering,
 * authenticating, and retrieving a filtered, paginated, and sorted list of
 * designers with proper authorization.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new designer user with valid registration details.
 * 2. Logs in with the registered user's credentials to obtain JWT tokens.
 * 3. Uses the authenticated context to call the designer listing API with
 *    various filters, pagination, and sorting options.
 * 4. Validates pagination metadata consistency and filtering correctness.
 * 5. Checks sorting by 'email' and 'name' in ascending and descending order.
 * 6. Executes negative tests for unauthorized access, invalid pagination
 *    values, and filters resulting in empty lists.
 *
 * Throughout, responses are validated for type safety using typia.assert(),
 * and TestValidator ensures all business logic expectations.
 *
 * No direct header manipulation is done; authentication is handled by the
 * SDK.
 */
export async function test_api_designer_index_with_designer_authentication_and_pagination(
  connection: api.IConnection,
) {
  // 1. Designer user registration
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordPlain = RandomGenerator.alphaNumeric(10);
  const passwordHash = `hash_${passwordPlain}`;
  const name = RandomGenerator.name();

  const joined: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
        name,
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(joined);

  // 2. Designer user login
  const loggedIn: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: {
        email,
        password: passwordPlain,
      } satisfies ITaskManagementDesigner.ILogin,
    });
  typia.assert(loggedIn);

  // Confirm same user id
  TestValidator.equals(
    "login user id matches join user id",
    loggedIn.id,
    joined.id,
  );

  // 3. Authenticated call to designer listing patch endpoint

  // Helper: call designer listing with given request and validate response
  async function validateListing(
    request: ITaskManagementDesigner.IRequest,
    expectNonEmpty: boolean,
  ) {
    const pageResult: IPageITaskManagementDesigner.ISummary =
      await api.functional.taskManagement.designer.taskManagement.designers.index(
        connection,
        { body: request },
      );
    typia.assert(pageResult);

    // Pagination checks
    const { current, limit, pages, records } = pageResult.pagination;
    TestValidator.predicate(
      "pagination current page non-negative",
      current >= 0,
    );
    TestValidator.predicate("pagination limit positive", limit > 0);
    TestValidator.predicate("pagination total pages non-negative", pages >= 0);
    TestValidator.predicate(
      "pagination total records non-negative",
      records >= 0,
    );

    TestValidator.equals(
      "pagination records matches data length",
      pageResult.data.length,
      records <= limit ? records : limit,
    );

    // If expecting non-empty results check consistency with request filters
    if (expectNonEmpty) {
      // Check filters: email and name
      if (request.email !== undefined && request.email !== null) {
        for (const designer of pageResult.data) {
          TestValidator.predicate(
            `designer email contains filter '${request.email}'`,
            designer.email.includes(request.email),
          );
        }
      }
      if (request.name !== undefined && request.name !== null) {
        for (const designer of pageResult.data) {
          TestValidator.predicate(
            `designer name contains filter '${request.name}'`,
            designer.name.includes(request.name),
          );
        }
      }
    } else {
      // Expect empty result data
      TestValidator.equals(
        "empty data array on filter yielding no results",
        pageResult.data,
        [],
      );
    }

    return pageResult;
  }

  // 4. Test cases
  // - Basic pagination with no filter
  await validateListing(
    {
      page: 0,
      limit: 5,
    },
    true,
  );

  // - Filter by email substring
  await validateListing(
    {
      email: email.slice(0, 3),
      page: 0,
      limit: 10,
    },
    true,
  );

  // - Filter by name substring
  await validateListing(
    {
      name: name.slice(0, 2),
      page: 0,
      limit: 10,
    },
    true,
  );

  // - Filter with no matching results
  await validateListing(
    {
      email: "nonexistent@example.com",
      page: 0,
      limit: 5,
    },
    false,
  );

  // - Negative tests

  // Unauthorized call
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access throws error", async () => {
    await api.functional.taskManagement.designer.taskManagement.designers.index(
      unauthConn,
      {
        body: { page: 0, limit: 5 } satisfies ITaskManagementDesigner.IRequest,
      },
    );
  });

  // Invalid paging: negative page
  await TestValidator.error(
    "negative page parameter throws error",
    async () => {
      await api.functional.taskManagement.designer.taskManagement.designers.index(
        connection,
        {
          body: {
            page: -1,
            limit: 5,
          } satisfies ITaskManagementDesigner.IRequest,
        },
      );
    },
  );

  // Invalid paging: negative limit
  await TestValidator.error(
    "negative limit parameter throws error",
    async () => {
      await api.functional.taskManagement.designer.taskManagement.designers.index(
        connection,
        {
          body: {
            page: 0,
            limit: -5,
          } satisfies ITaskManagementDesigner.IRequest,
        },
      );
    },
  );

  // Sorting tests

  // - Sort by email ascending
  const sortEmailAsc = await validateListing(
    {
      page: 0,
      limit: 10,
      sort: "email",
      order: "asc",
    },
    true,
  );
  for (let i = 1; i < sortEmailAsc.data.length; i++) {
    TestValidator.predicate(
      `sort email ascending at index ${i}`,
      sortEmailAsc.data[i - 1].email <= sortEmailAsc.data[i].email,
    );
  }

  // - Sort by email descending
  const sortEmailDesc = await validateListing(
    {
      page: 0,
      limit: 10,
      sort: "email",
      order: "desc",
    },
    true,
  );
  for (let i = 1; i < sortEmailDesc.data.length; i++) {
    TestValidator.predicate(
      `sort email descending at index ${i}`,
      sortEmailDesc.data[i - 1].email >= sortEmailDesc.data[i].email,
    );
  }

  // - Sort by name ascending
  const sortNameAsc = await validateListing(
    {
      page: 0,
      limit: 10,
      sort: "name",
      order: "asc",
    },
    true,
  );
  for (let i = 1; i < sortNameAsc.data.length; i++) {
    TestValidator.predicate(
      `sort name ascending at index ${i}`,
      sortNameAsc.data[i - 1].name <= sortNameAsc.data[i].name,
    );
  }

  // - Sort by name descending
  const sortNameDesc = await validateListing(
    {
      page: 0,
      limit: 10,
      sort: "name",
      order: "desc",
    },
    true,
  );
  for (let i = 1; i < sortNameDesc.data.length; i++) {
    TestValidator.predicate(
      `sort name descending at index ${i}`,
      sortNameDesc.data[i - 1].name >= sortNameDesc.data[i].name,
    );
  }
}
