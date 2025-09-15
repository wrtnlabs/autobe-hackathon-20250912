import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test retrieval of paginated designer list with TPM authentication.
 *
 * This test covers:
 *
 * - TPM user registration and login
 * - Designer list retrieval with default and filtered criteria
 * - Pagination boundary tests
 * - Sorting order tests
 * - Unauthorized access rejection
 *
 * Each step validates response schema and business logic correctness.
 */
export async function test_api_designer_list_retrieval_with_tpm_authentication_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: TPM user registration
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const joinResult = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);

  // Step 2: TPM user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loginResult = await api.functional.auth.tpm.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // Step 3: Designer list retrieval - default pagination
  const defaultList =
    await api.functional.taskManagement.tpm.taskManagement.designers.index(
      connection,
      {
        body: {}, // no filter or pagination
      },
    );
  typia.assert(defaultList);
  TestValidator.predicate(
    "pagination current page should be >= 0",
    defaultList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    defaultList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total pages should be >= 0",
    defaultList.pagination.pages >= 0,
  );

  // Step 4: Designer list retrieval - filtered by random email and name substrings
  const emailFilter =
    defaultList.data.length > 0
      ? defaultList.data[0].email.split("@")[0].substring(0, 3)
      : "";
  const nameFilter =
    defaultList.data.length > 0 ? defaultList.data[0].name.substring(0, 2) : "";
  const filteredList =
    await api.functional.taskManagement.tpm.taskManagement.designers.index(
      connection,
      {
        body: {
          email: emailFilter || null,
          name: nameFilter || null,
          page: 1,
          limit: 5,
          sort: "email",
          order: "asc",
        } satisfies ITaskManagementDesigner.IRequest,
      },
    );
  typia.assert(filteredList);
  TestValidator.predicate(
    "filtered data length should be <= limit",
    filteredList.data.length <= 5,
  );

  // Step 5: Test pagination boundaries (0 page, large page number)
  const paginationTests = [
    { page: 0, limit: 3 },
    { page: 1000, limit: 3 },
  ];
  for (const { page, limit } of paginationTests) {
    const pageResult =
      await api.functional.taskManagement.tpm.taskManagement.designers.index(
        connection,
        {
          body: {
            page,
            limit,
          } satisfies ITaskManagementDesigner.IRequest,
        },
      );
    typia.assert(pageResult);
    TestValidator.predicate(
      `pagination current matches requested ${page}`,
      pageResult.pagination.current === page,
    );
  }

  // Step 6: Sorting tests for name descending
  const sortDescList =
    await api.functional.taskManagement.tpm.taskManagement.designers.index(
      connection,
      {
        body: {
          sort: "name",
          order: "desc",
        } satisfies ITaskManagementDesigner.IRequest,
      },
    );
  typia.assert(sortDescList);
  for (let i = 1; i < sortDescList.data.length; ++i) {
    TestValidator.predicate(
      "name sorting descending",
      sortDescList.data[i - 1].name >= sortDescList.data[i].name,
    );
  }

  // Step 7: Unauthorized access test
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should fail unauthorized access without token",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.designers.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
