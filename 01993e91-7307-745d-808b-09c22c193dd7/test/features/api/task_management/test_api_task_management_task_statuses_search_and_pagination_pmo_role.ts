import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";

/**
 * This E2E test scenario validates that a Project Management Officer (PMO) can
 * successfully filter and paginate task status records by leveraging the PATCH
 * /taskManagement/pmo/taskManagementTaskStatuses endpoint. The scenario
 * includes the PMO user joining or logging in to obtain proper authentication,
 * then using search and pagination parameters to query task statuses. It
 * asserts the response correctness in pagination, filtering conditions, and
 * access control. The scenario also tests failure cases arising from
 * unauthorized access, invalid parameters, or missing authentication. This
 * ensures secure and functional task status management by PMO role users.
 */
export async function test_api_task_management_task_statuses_search_and_pagination_pmo_role(
  connection: api.IConnection,
) {
  // 1. PMO user joins the system
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoAuthorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoAuthorized);

  // 2. PMO user logs in with the same credentials
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLoginAuthorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLoginAuthorized);

  // 3. Request task status list without filters
  const rawNoFilterBody = {} satisfies ITaskManagementTaskStatuses.IRequest;
  const responseNoFilter =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.index(
      connection,
      { body: rawNoFilterBody },
    );
  typia.assert(responseNoFilter);

  // Validate pagination
  TestValidator.predicate(
    "pagination current page is positive",
    responseNoFilter.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    responseNoFilter.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total pages is positive",
    responseNoFilter.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records count is positive",
    responseNoFilter.pagination.records > 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    responseNoFilter.data.length <= responseNoFilter.pagination.limit,
  );

  // 4. Query with code filter if possible
  const randomSampledCode =
    responseNoFilter.data.length > 0
      ? RandomGenerator.pick(responseNoFilter.data).code
      : undefined;
  if (randomSampledCode !== undefined) {
    const codeFilterBody = {
      code: randomSampledCode,
    } satisfies ITaskManagementTaskStatuses.IRequest;
    const responseCodeFilter =
      await api.functional.taskManagement.pmo.taskManagementTaskStatuses.index(
        connection,
        { body: codeFilterBody },
      );
    typia.assert(responseCodeFilter);

    // Assert every returned item matches the code filter
    for (const item of responseCodeFilter.data) {
      TestValidator.equals(
        "filtered code must match",
        item.code,
        randomSampledCode,
      );
    }
  }

  // 5. Query with name filter if possible
  const randomSampledName =
    responseNoFilter.data.length > 0
      ? RandomGenerator.pick(responseNoFilter.data).name
      : undefined;
  if (randomSampledName !== undefined) {
    const nameFilterBody = {
      name: randomSampledName,
    } satisfies ITaskManagementTaskStatuses.IRequest;
    const responseNameFilter =
      await api.functional.taskManagement.pmo.taskManagementTaskStatuses.index(
        connection,
        { body: nameFilterBody },
      );
    typia.assert(responseNameFilter);

    // Assert every returned item matches the name filter
    for (const item of responseNameFilter.data) {
      TestValidator.equals(
        "filtered name must match",
        item.name,
        randomSampledName,
      );
    }
  }

  // 6. Test pagination with specific page and limit
  const pageNumber = 1;
  const pageLimit = 3;
  const pageLimitBody = {
    page: pageNumber,
    limit: pageLimit,
  } satisfies ITaskManagementTaskStatuses.IRequest;
  const responsePageLimit =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.index(
      connection,
      { body: pageLimitBody },
    );
  typia.assert(responsePageLimit);
  TestValidator.equals(
    "pagination current page matches",
    responsePageLimit.pagination.current,
    pageNumber,
  );
  TestValidator.equals(
    "pagination limit matches",
    responsePageLimit.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    responsePageLimit.data.length <= pageLimit,
  );

  // 7. Test orderBy ascending by code
  const orderByAscBody = {
    orderBy: "code",
  } satisfies ITaskManagementTaskStatuses.IRequest;
  const responseOrderByAsc =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.index(
      connection,
      { body: orderByAscBody },
    );
  typia.assert(responseOrderByAsc);

  for (let i = 1; i < responseOrderByAsc.data.length; i++) {
    TestValidator.predicate(
      `codes ascending at index ${i - 1} and ${i}`,
      responseOrderByAsc.data[i - 1].code.localeCompare(
        responseOrderByAsc.data[i].code,
      ) <= 0,
    );
  }

  // 8. Test orderBy descending by code
  const orderByDescBody = {
    orderBy: "-code",
  } satisfies ITaskManagementTaskStatuses.IRequest;
  const responseOrderByDesc =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.index(
      connection,
      { body: orderByDescBody },
    );
  typia.assert(responseOrderByDesc);

  for (let i = 1; i < responseOrderByDesc.data.length; i++) {
    TestValidator.predicate(
      `codes descending at index ${i - 1} and ${i}`,
      responseOrderByDesc.data[i - 1].code.localeCompare(
        responseOrderByDesc.data[i].code,
      ) >= 0,
    );
  }

  // 9. Negative test: unauthenticated access should fail
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.index(
      unauthenticatedConn,
      { body: {} },
    );
  });

  // 10. Negative test: invalid pagination parameters
  const invalidPaginationBody = {
    page: -1,
    limit: -5,
  } satisfies ITaskManagementTaskStatuses.IRequest;
  await TestValidator.error(
    "invalid pagination params should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementTaskStatuses.index(
        connection,
        { body: invalidPaginationBody },
      );
    },
  );

  // 11. Negative test: invalid orderBy parameter
  const invalidOrderByBody = {
    orderBy: "invalidField",
  } satisfies ITaskManagementTaskStatuses.IRequest;
  await TestValidator.error("invalid orderBy param should fail", async () => {
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.index(
      connection,
      { body: invalidOrderByBody },
    );
  });
}
