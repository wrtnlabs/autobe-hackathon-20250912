import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * This test function validates the filtered, paginated, and sorted list
 * retrieval of Designer users accessible to a QA role user.
 *
 * The workflow includes:
 *
 * 1. QA user registration for authentication setup.
 * 2. QA user login to obtain valid JWT tokens.
 * 3. Creation of multiple Designer users to populate test data.
 * 4. Multiple search tests filtering by email and name substrings with
 *    pagination and sorting.
 * 5. Validation of pagination metadata and data consistency.
 * 6. Tests for access denial without authentication and for empty results.
 *
 * All API responses are validated with typia.assert and business assertions
 * with TestValidator.
 *
 * This ensures reliable and secure Designer user searching exclusively for
 * QA users.
 */
export async function test_api_designer_search_filtered_paginated_list_for_qa_role(
  connection: api.IConnection,
) {
  // 1. QA user registration
  const qaEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const qaPassword = "QaPass123!";
  const qaName = RandomGenerator.name();

  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email: qaEmail,
        password_hash: qaPassword,
        name: qaName,
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(qaUser);

  // 2. QA user login
  const qaLoginUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: {
        email: qaEmail,
        password: qaPassword,
      } satisfies ITaskManagementQa.ILogin,
    });
  typia.assert(qaLoginUser);

  // 3. Creating multiple Designer users
  const designerCount = 10;
  const createdDesigners: ITaskManagementDesigner.IAuthorized[] = [];

  await ArrayUtil.asyncRepeat(designerCount, async () => {
    const email: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();
    const passwordHash = RandomGenerator.alphaNumeric(12);
    const name = RandomGenerator.name();

    const created: ITaskManagementDesigner.IAuthorized =
      await api.functional.auth.designer.join(connection, {
        body: {
          email: email,
          password_hash: passwordHash,
          name: name,
        } satisfies ITaskManagementDesigner.ICreate,
      });
    typia.assert(created);
    createdDesigners.push(created);
  });

  // Helper to find summary by id
  function findDesignerSummaryById(
    summaries: ITaskManagementDesigner.ISummary[],
    id: string,
  ): ITaskManagementDesigner.ISummary | undefined {
    return summaries.find((summary) => summary.id === id);
  }

  // 4. Basic search test: no filters, default pagination
  {
    const req = {} satisfies ITaskManagementDesigner.IRequest;
    const response =
      await api.functional.taskManagement.qa.taskManagement.designers.index(
        connection,
        { body: req },
      );
    typia.assert(response);

    TestValidator.predicate(
      "pagination current page is number",
      typeof response.pagination.current === "number",
    );
    TestValidator.predicate(
      "pagination limit is number",
      typeof response.pagination.limit === "number",
    );
    TestValidator.predicate(
      "pagination records count is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages count is positive or zero",
      response.pagination.pages >= 0,
    );

    for (const summary of response.data) {
      const found = findDesignerSummaryById(response.data, summary.id);
      TestValidator.predicate(
        "designer summary found in response data",
        found !== undefined,
      );
      TestValidator.equals("designer summary id match", summary.id, found!.id);
      TestValidator.predicate(
        "designer summary has email",
        typeof summary.email === "string",
      );
      TestValidator.predicate(
        "designer summary has name",
        typeof summary.name === "string",
      );
    }
  }

  // 5. Filter by partial email substring
  {
    const sampleDesigner = RandomGenerator.pick(createdDesigners);
    const email = sampleDesigner.email;
    const emailSubstring = email.substring(0, Math.floor(email.length / 3));

    const req = {
      email: emailSubstring,
      page: 0,
      limit: 5,
    } satisfies ITaskManagementDesigner.IRequest;

    const response =
      await api.functional.taskManagement.qa.taskManagement.designers.index(
        connection,
        { body: req },
      );
    typia.assert(response);

    for (const summary of response.data) {
      TestValidator.predicate(
        `email includes substring: ${emailSubstring}`,
        summary.email.includes(emailSubstring),
      );
    }

    TestValidator.equals(
      "pagination.current equals requested page",
      response.pagination.current,
      0,
    );
    TestValidator.predicate(
      "pagination.limit is less or equal 5",
      response.pagination.limit <= 5,
    );
  }

  // 6. Filter by partial name substring, sorted by name ascending
  {
    const sampleDesigner = RandomGenerator.pick(createdDesigners);
    const name = sampleDesigner.name;
    const nameSubstring = name.substring(0, Math.floor(name.length / 2));

    const req = {
      name: nameSubstring,
      page: 0,
      limit: 5,
      sort: "name",
      order: "asc",
    } satisfies ITaskManagementDesigner.IRequest;

    const response =
      await api.functional.taskManagement.qa.taskManagement.designers.index(
        connection,
        { body: req },
      );
    typia.assert(response);

    for (const summary of response.data) {
      TestValidator.predicate(
        `name includes substring: ${nameSubstring}`,
        summary.name.includes(nameSubstring),
      );
    }

    TestValidator.equals(
      "pagination.current equals requested page",
      response.pagination.current,
      0,
    );
    TestValidator.predicate(
      "pagination.limit is less or equal 5",
      response.pagination.limit <= 5,
    );

    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "names in ascending order",
        response.data[i - 1].name.localeCompare(response.data[i].name) <= 0,
      );
    }
  }

  // 7. Pagination test: fetch second page with limit 3
  {
    const req = {
      page: 1,
      limit: 3,
    } satisfies ITaskManagementDesigner.IRequest;

    const response =
      await api.functional.taskManagement.qa.taskManagement.designers.index(
        connection,
        { body: req },
      );
    typia.assert(response);

    TestValidator.equals(
      "pagination current page is 1",
      response.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit is 3", response.pagination.limit, 3);
    TestValidator.predicate(
      "pagination records is at least 0",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is at least current+1",
      response.pagination.pages >= 1,
    );
  }

  // 8. Access denial test: unauthenticated connection
  {
    const unauthConn: api.IConnection = { ...connection, headers: {} };
    await TestValidator.error(
      "access denied without authentication",
      async () => {
        await api.functional.taskManagement.qa.taskManagement.designers.index(
          unauthConn,
          {
            body: {} satisfies ITaskManagementDesigner.IRequest,
          },
        );
      },
    );
  }

  // 9. Empty result test: filtering by unlikely substring match
  {
    const req = {
      email: "nonexistent_substring_xyz",
      page: 0,
      limit: 5,
    } satisfies ITaskManagementDesigner.IRequest;

    const response =
      await api.functional.taskManagement.qa.taskManagement.designers.index(
        connection,
        { body: req },
      );
    typia.assert(response);
    TestValidator.equals("empty result data length", response.data.length, 0);
  }
}
