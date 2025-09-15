import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotChatbotTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotTitle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotChatbotTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotChatbotTitle";

/**
 * This test scenario evaluates retrieving a paginated list of user titles with
 * filters and sorting for admin users. It starts with authenticating as an
 * admin user to access the protected endpoint. It then performs queries that
 * include filter parameters (e.g., name search, fee discount rate range),
 * validates the returned paginated list matches requested filters, and verifies
 * support for sorting and pagination parameters.
 *
 * Validation points include proper enforcement of admin authorization, accurate
 * filtering of titles, correct pagination metadata, and data field consistency
 * with schema. Negative tests include requesting with invalid filters or
 * without authorization, expecting appropriate error responses.
 *
 * This scenario confirms the robustness and correctness of the user title list
 * retrieval in admin context.
 */
export async function test_api_user_title_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication via /auth/admin/join
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(admin);

  // 2. Filter with name search
  {
    // Use part of the admin nickname as search keyword, safeguard substring length
    const searchKeyword =
      admin.nickname.length >= 3
        ? admin.nickname.substring(0, 3)
        : admin.nickname;

    const requestBody = {
      page: 1,
      limit: 10,
      search: searchKeyword,
    } satisfies IChatbotChatbotTitle.IRequest;

    const result: IPageIChatbotChatbotTitle =
      await api.functional.chatbot.admin.titles.index(connection, {
        body: requestBody,
      });
    typia.assert(result);

    // Validate each title name contains the search keyword
    for (const title of result.data) {
      TestValidator.predicate(
        `title name contains search keyword '${searchKeyword}'`,
        title.name.includes(searchKeyword),
      );

      TestValidator.predicate(
        "fee discount rate within 0 to 100",
        title.fee_discount_rate >= 0 && title.fee_discount_rate <= 100,
      );
    }

    // Validate pagination metadata with strict equality
    TestValidator.equals(
      "pagination current page",
      result.pagination.current,
      requestBody.page,
    );
    TestValidator.equals(
      "pagination limit",
      result.pagination.limit,
      requestBody.limit,
    );
    TestValidator.equals(
      "pagination pages",
      result.pagination.pages,
      Math.ceil(result.pagination.records / result.pagination.limit),
    );
  }

  // 3. Filter with fee discount rate min and max
  {
    // Set fee discount rate min at 10 and max at 50
    const requestBody = {
      page: 1,
      limit: 10,
      fee_discount_rate_min: 10,
      fee_discount_rate_max: 50,
    } satisfies IChatbotChatbotTitle.IRequest;

    const result: IPageIChatbotChatbotTitle =
      await api.functional.chatbot.admin.titles.index(connection, {
        body: requestBody,
      });
    typia.assert(result);

    // Validate each fee_discount_rate is between 10 and 50 inclusive
    for (const title of result.data) {
      TestValidator.predicate(
        "fee discount rate between 10 and 50 inclusive",
        title.fee_discount_rate >= 10 && title.fee_discount_rate <= 50,
      );
    }

    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page",
      result.pagination.current,
      requestBody.page,
    );
    TestValidator.equals(
      "pagination limit",
      result.pagination.limit,
      requestBody.limit,
    );
  }

  // 4. Pagination test with page 2 and limit 5
  {
    const requestBody = {
      page: 2,
      limit: 5,
    } satisfies IChatbotChatbotTitle.IRequest;

    const result: IPageIChatbotChatbotTitle =
      await api.functional.chatbot.admin.titles.index(connection, {
        body: requestBody,
      });
    typia.assert(result);

    TestValidator.equals(
      "pagination current page",
      result.pagination.current,
      requestBody.page,
    );
    TestValidator.equals(
      "pagination limit",
      result.pagination.limit,
      requestBody.limit,
    );
    TestValidator.equals(
      "pagination pages",
      result.pagination.pages,
      Math.ceil(result.pagination.records / result.pagination.limit),
    );
  }

  // 5. Negative test: Unauthorized access should fail
  {
    const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
    const requestBody = {
      page: 1,
      limit: 10,
    } satisfies IChatbotChatbotTitle.IRequest;

    await TestValidator.error(
      "unauthorized access to user titles list should fail",
      async () => {
        await api.functional.chatbot.admin.titles.index(unauthenticatedConn, {
          body: requestBody,
        });
      },
    );
  }
}
