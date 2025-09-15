import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotAdmin";

/**
 * This E2E test validates the pagination and search functionalities of the
 * chatbot admin listing API.
 *
 * The test covers:
 *
 * 1. Admin account creation and authentication.
 * 2. Retrieval of chatbot admins without filters to verify default pagination.
 * 3. Retrieval with nickname filtering and pagination parameters.
 * 4. Error handling on invalid query inputs.
 * 5. Access control enforcement by testing unauthorized requests.
 *
 * Each step includes type validation and business logic assertions to ensure
 * completeness and correctness.
 */
export async function test_api_chatbot_admin_pagination_and_search(
  connection: api.IConnection,
) {
  // 1. Admin user signs up and authenticates
  const createRequest = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: createRequest,
    },
  );
  typia.assert(admin);
  // Token is set automatically into connection.headers.Authorization

  // 2. Retrieve full list without filters
  const fullListRequest = {} as IChatbotAdmin.IRequest; // no filtering
  const fullListResponse: IPageIChatbotAdmin.ISummary =
    await api.functional.chatbot.admin.chatbotAdmins.index(connection, {
      body: fullListRequest,
    });
  typia.assert(fullListResponse);

  TestValidator.predicate(
    "full list contains data",
    Array.isArray(fullListResponse.data) && fullListResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "full list pagination is valid",
    fullListResponse.pagination.current >= 0 &&
      fullListResponse.pagination.limit >= 0 &&
      fullListResponse.pagination.records >= fullListResponse.data.length &&
      fullListResponse.pagination.pages >= 0,
  );

  // 3. Retrieve with nickname filter and pagination
  const sampleNickname = admin.nickname.slice(0, 3) || "adm";
  const filteredRequest = {
    nickname: sampleNickname,
    page: 1,
    limit: 5,
  } satisfies IChatbotAdmin.IRequest;

  const filteredResponse: IPageIChatbotAdmin.ISummary =
    await api.functional.chatbot.admin.chatbotAdmins.index(connection, {
      body: filteredRequest,
    });
  typia.assert(filteredResponse);

  TestValidator.predicate(
    "filtered list has data",
    Array.isArray(filteredResponse.data),
  );
  TestValidator.predicate(
    "filtered list pagination is valid",
    filteredResponse.pagination.current === 1 &&
      filteredResponse.pagination.limit === 5 &&
      filteredResponse.pagination.records >= filteredResponse.data.length &&
      filteredResponse.pagination.pages >= 0,
  );

  // All nicknames in filtered data include sampleNickname
  filteredResponse.data.forEach((admin) => {
    TestValidator.predicate(
      `admin nickname contains filter substring: ${sampleNickname}`,
      admin.nickname.includes(sampleNickname),
    );
  });

  // 4. Invalid filtering parameters should cause error
  await TestValidator.error("invalid request body should fail", async () => {
    await api.functional.chatbot.admin.chatbotAdmins.index(connection, {
      body: {
        page: 0, // invalid min constraint
        limit: 0, // invalid min constraint
      } satisfies IChatbotAdmin.IRequest,
    });
  });

  // 5. Unauthorized access should fail
  // Clone connection without Authorization header
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access to chatbotAdmins index should fail",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.index(unauthConnection, {
        body: {} as IChatbotAdmin.IRequest,
      });
    },
  );
}
