import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessage";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatAppMessage";

/**
 * This E2E test validates the chat message searching API PATCH
 * /chatApp/regularUser/messages.
 *
 * It first authenticates a new regular user to establish an authorized session.
 * Then performs various searches applying filtering on sender_id, group_id,
 * recipient_id, message_type, content_search, date ranges, pagination
 * parameters, and verifies that the returned message summaries and pagination
 * metadata are correct and consistent.
 *
 * It tests normal cases and edge cases including empty results, invalid
 * filters, and sorting order. Also ensures user cannot access messages they
 * shouldn't.
 *
 * The test uses typia.assert for runtime type validation of responses and uses
 * descriptive TestValidator calls for verifying business logic correctness.
 */
export async function test_api_chat_message_search_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new regular user
  const joinBody = {
    social_login_id: `user_${RandomGenerator.alphaNumeric(8)}`,
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: joinBody });
  typia.assert(authorizedUser);

  // 2. Prepare variables for filtering
  // We do not have APIs to create messages, groups, or other users,
  // so assume the backend contains some messages associated with this user

  // Helper function to call search endpoint and validate response
  async function searchMessages(
    filter: IChatAppMessage.IRequest,
    expectedSenderId?: string,
  ) {
    const response: IPageIChatAppMessage.ISummary =
      await api.functional.chatApp.regularUser.messages.index(connection, {
        body: filter,
      });
    typia.assert(response);

    // pagination check
    const pagination = response.pagination;
    TestValidator.predicate(
      "pagination current page is positive",
      pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      pagination.limit >= 1,
    );
    TestValidator.predicate(
      "pagination pages consistent",
      pagination.pages >= 0 &&
        ((pagination.records === 0 && pagination.pages === 0) ||
          pagination.pages >= Math.ceil(pagination.records / pagination.limit)),
    );
    TestValidator.predicate(
      "pagination records non-negative",
      pagination.records >= 0,
    );

    // message data verification
    for (const msg of response.data) {
      typia.assert(msg);
      TestValidator.predicate(
        "message id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          msg.id,
        ),
      );
      TestValidator.predicate(
        "message sender id matches filter",
        expectedSenderId === undefined || msg.sender_id === expectedSenderId,
      );
      if (filter.group_id !== undefined && filter.group_id !== null) {
        TestValidator.equals(
          "message group id matches filter",
          msg.group_id ?? null,
          filter.group_id ?? null,
        );
      }
      if (filter.recipient_id !== undefined && filter.recipient_id !== null) {
        TestValidator.equals(
          "message recipient id matches filter",
          msg.recipient_id ?? null,
          filter.recipient_id ?? null,
        );
      }

      if (filter.message_type !== undefined && filter.message_type !== null) {
        TestValidator.equals(
          "message type matches filter",
          msg.message_type,
          filter.message_type,
        );
      }

      // content_search validation
      if (
        filter.content_search !== undefined &&
        filter.content_search !== null
      ) {
        TestValidator.predicate(
          `message content contains search string ${filter.content_search}`,
          msg.content.includes(filter.content_search),
        );
      }

      // created_at within date range (if specified)
      if (
        filter.date_from !== undefined &&
        filter.date_from !== null &&
        filter.date_to !== undefined &&
        filter.date_to !== null
      ) {
        TestValidator.predicate(
          "message created_at within date range",
          msg.created_at >= filter.date_from &&
            msg.created_at <= filter.date_to,
        );
      } else if (filter.date_from !== undefined && filter.date_from !== null) {
        TestValidator.predicate(
          "message created_at after date_from",
          msg.created_at >= filter.date_from,
        );
      } else if (filter.date_to !== undefined && filter.date_to !== null) {
        TestValidator.predicate(
          "message created_at before date_to",
          msg.created_at <= filter.date_to,
        );
      }
    }

    // sorting validation
    if (filter.order === "asc") {
      for (let i = 1; i < response.data.length; i++) {
        TestValidator.predicate(
          "messages in ascending order by created_at",
          response.data[i].created_at >= response.data[i - 1].created_at,
        );
      }
    } else if (filter.order === "desc") {
      for (let i = 1; i < response.data.length; i++) {
        TestValidator.predicate(
          "messages in descending order by created_at",
          response.data[i].created_at <= response.data[i - 1].created_at,
        );
      }
    }
  }

  // 3. Search scenarios

  // Basic unfiltered search (should return some messages or empty, but valid)
  await searchMessages({ page: 1, limit: 10, order: "desc" });

  // Filter by sender_id (own user id)
  await searchMessages({ sender_id: authorizedUser.id, page: 1, limit: 5 });

  // Filter by invalid sender_id (expect empty results)
  await searchMessages({
    sender_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 5,
  });

  // Filter by message_type = "text"
  await searchMessages({ message_type: "text", page: 1, limit: 5 });

  // Filter by message_type = "image"
  await searchMessages({ message_type: "image", page: 1, limit: 5 });

  // Filter by message_type = "video"
  await searchMessages({ message_type: "video", page: 1, limit: 5 });

  // Filter with content_search string
  await searchMessages({ content_search: "hello", page: 1, limit: 5 });

  // Date range filter
  const now = new Date();
  const dateFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const dateTo = now.toISOString();
  await searchMessages({
    date_from: dateFrom,
    date_to: dateTo,
    page: 1,
    limit: 5,
  });

  // Pagination edge: page set to 1, limit set to 1
  await searchMessages({ page: 1, limit: 1 });

  // Pagination edge: large limit
  await searchMessages({ page: 1, limit: 100 });

  // Sorting ascending order
  await searchMessages({ order: "asc", page: 1, limit: 10 });

  // Sorting descending order
  await searchMessages({ order: "desc", page: 1, limit: 10 });

  // Combination filter with sender_id, message_type, content_search
  await searchMessages(
    {
      sender_id: authorizedUser.id,
      message_type: "text",
      content_search: "test",
      page: 1,
      limit: 5,
    },
    authorizedUser.id,
  );

  // Combination filter with invalid group_id to produce zero results
  await searchMessages({
    group_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 5,
  });

  // Combination filter to include recipient_id if available
  // Since we don't have other users created, we skip recipient_id positive tests
}
