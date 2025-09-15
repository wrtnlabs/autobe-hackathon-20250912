import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroup";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatAppGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatAppGroup";

export async function test_api_community_group_list_with_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const socialLoginId = `user_${RandomGenerator.alphaNumeric(8)}`;
  const joinBody = {
    social_login_id: socialLoginId,
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: joinBody });
  typia.assert(authorizedUser);

  // 2. Login the newly created regular user
  const loginBody = {
    social_login_id: socialLoginId,
  } satisfies IChatAppRegularUser.IRequestLogin;
  const loginUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 3. Define multiple test cases for filters and pagination
  const testCases: IChatAppGroup.IRequest[] = [
    {
      page: 1,
      limit: 10,
      search: null,
      name: null,
      status: null,
      business_status: null,
      orderBy: null,
    },
    {
      page: 2,
      limit: 20,
      search: RandomGenerator.paragraph({ sentences: 3 }),
      name: RandomGenerator.name(2),
      status: "active",
      business_status: "available",
      orderBy: "name_ASC",
    },
    {
      page: 1,
      limit: 100,
      search: "test",
      name: "test group",
      status: "inactive",
      business_status: null,
      orderBy: "created_at_DESC",
    },
    {
      page: 5,
      limit: 1,
      search: null,
      name: null,
      status: "archived",
      business_status: "closed",
      orderBy: null,
    },
    // Edge case: very large page size
    {
      page: 1,
      limit: 1000,
      search: null,
      name: null,
      status: null,
      business_status: null,
      orderBy: "created_at_ASC",
    },
  ];

  // 4. Run query for each test case and validate response
  for (const requestBody of testCases) {
    const response: IPageIChatAppGroup.ISummary =
      await api.functional.chatApp.regularUser.groups.index(connection, {
        body: requestBody,
      });
    typia.assert(response);

    // Validate pagination fields
    TestValidator.predicate(
      "pagination current page is correct",
      response.pagination.current === (requestBody.page ?? 1),
    );
    TestValidator.predicate(
      "pagination limit is correct",
      response.pagination.limit === (requestBody.limit ?? 100),
    );
    TestValidator.predicate(
      "pagination pages is positive",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );

    // Each group's properties must be valid and consistent with filter
    for (const group of response.data) {
      typia.assert(group);
      // If status filter was set, group must match
      if (requestBody.status !== null && requestBody.status !== undefined) {
        TestValidator.equals(
          "group status matches filter",
          group.status,
          requestBody.status,
        );
      }
      // If business_status filter was set, group must match
      if (
        requestBody.business_status !== null &&
        requestBody.business_status !== undefined
      ) {
        TestValidator.equals(
          "group business_status matches filter",
          group.business_status ?? null,
          requestBody.business_status,
        );
      }
      // If name filter was set, group's name should include the filter string
      if (requestBody.name !== null && requestBody.name !== undefined) {
        TestValidator.predicate(
          "group name includes filter",
          group.name.includes(requestBody.name),
        );
      }
      // If search keyword was set, group's name or other fields include it
      if (requestBody.search !== null && requestBody.search !== undefined) {
        const keyword = requestBody.search.toLowerCase();
        TestValidator.predicate(
          "group search keyword found in name",
          group.name.toLowerCase().includes(keyword),
        );
      }
    }
  }

  // 5. Test unauthorized access rejection by using empty headers connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized access is rejected", async () => {
    await api.functional.chatApp.regularUser.groups.index(unauthConnection, {
      body: {
        page: 1,
        limit: 10,
        search: null,
        name: null,
        status: null,
        business_status: null,
        orderBy: null,
      },
    });
  });
}
