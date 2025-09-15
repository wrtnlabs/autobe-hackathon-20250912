import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotRoomTuples";

/**
 * Test the search and retrieval of chatbot room tuples with filtering and
 * pagination.
 *
 * This test authenticates as an admin user by creating an admin account, then
 * performs multiple queries to the chatbot room tuples endpoint applying
 * varying filters such as normal_room_id, admin_room_id, and unique_id with
 * pagination and limit checks.
 *
 * It verifies that each response respects the pagination rules and filtering
 * criteria, and that the data items returned match the applied filters
 * exactly.
 *
 * This ensures robustness of the search, filter, and pagination capabilities in
 * the admin chatbot room tuple management API.
 */
export async function test_api_chatbot_room_tuple_search_pagination_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin
  const adminCreateBody = {
    internal_sender_id: typia.random<string>(),
    nickname: typia.random<string>(),
  } satisfies IChatbotAdmin.ICreate;
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(admin);

  // Step 2: Search with no filter, pagination page 1, limit 5
  const page1: IPageIChatbotRoomTuples.ISummary =
    await api.functional.chatbot.admin.chatbotRoomTuples.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IChatbotRoomTuples.IRequest,
    });
  typia.assert(page1);
  TestValidator.predicate(
    "pagination current page is at least 1",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is as requested",
    page1.pagination.limit === 5,
  );

  // Step 3: Filter by normal_room_id if data exists
  if (page1.data.length > 0) {
    const firstNormalRoomId = page1.data[0].normal_room_id;
    const filteredByNormal: IPageIChatbotRoomTuples.ISummary =
      await api.functional.chatbot.admin.chatbotRoomTuples.index(connection, {
        body: {
          normal_room_id: firstNormalRoomId,
          page: 1,
          limit: 10,
        } satisfies IChatbotRoomTuples.IRequest,
      });
    typia.assert(filteredByNormal);
    for (const tuple of filteredByNormal.data) {
      TestValidator.equals(
        "filtered normal_room_id matches",
        tuple.normal_room_id,
        firstNormalRoomId,
      );
    }
  }

  // Step 4: Filter by admin_room_id if data exists
  if (page1.data.length > 0) {
    const firstAdminRoomId = page1.data[0].admin_room_id;
    const filteredByAdmin: IPageIChatbotRoomTuples.ISummary =
      await api.functional.chatbot.admin.chatbotRoomTuples.index(connection, {
        body: {
          admin_room_id: firstAdminRoomId,
          page: 1,
          limit: 10,
        } satisfies IChatbotRoomTuples.IRequest,
      });
    typia.assert(filteredByAdmin);
    for (const tuple of filteredByAdmin.data) {
      TestValidator.equals(
        "filtered admin_room_id matches",
        tuple.admin_room_id,
        firstAdminRoomId,
      );
    }
  }

  // Step 5: Filter by unique_id if data exists
  if (page1.data.length > 0) {
    const firstUniqueId = page1.data[0].unique_id;
    const filteredByUniqueId: IPageIChatbotRoomTuples.ISummary =
      await api.functional.chatbot.admin.chatbotRoomTuples.index(connection, {
        body: {
          unique_id: firstUniqueId,
          page: 1,
          limit: 10,
        } satisfies IChatbotRoomTuples.IRequest,
      });
    typia.assert(filteredByUniqueId);
    for (const tuple of filteredByUniqueId.data) {
      TestValidator.equals(
        "filtered unique_id matches",
        tuple.unique_id,
        firstUniqueId,
      );
    }
  }

  // Step 6: Combined filters if data exists
  if (page1.data.length > 0) {
    const first = page1.data[0];
    const filteredCombined: IPageIChatbotRoomTuples.ISummary =
      await api.functional.chatbot.admin.chatbotRoomTuples.index(connection, {
        body: {
          normal_room_id: first.normal_room_id,
          admin_room_id: first.admin_room_id,
          unique_id: first.unique_id,
          page: 1,
          limit: 10,
        } satisfies IChatbotRoomTuples.IRequest,
      });
    typia.assert(filteredCombined);
    for (const tuple of filteredCombined.data) {
      TestValidator.equals(
        "combined filter normal_room_id matches",
        tuple.normal_room_id,
        first.normal_room_id,
      );
      TestValidator.equals(
        "combined filter admin_room_id matches",
        tuple.admin_room_id,
        first.admin_room_id,
      );
      TestValidator.equals(
        "combined filter unique_id matches",
        tuple.unique_id,
        first.unique_id,
      );
    }
  }

  // Step 7: Pagination with limit 2, check page 1 and page 2
  const paginationLimit = 2;
  const pageOne: IPageIChatbotRoomTuples.ISummary =
    await api.functional.chatbot.admin.chatbotRoomTuples.index(connection, {
      body: {
        page: 1,
        limit: paginationLimit,
      } satisfies IChatbotRoomTuples.IRequest,
    });
  typia.assert(pageOne);
  TestValidator.predicate(
    "page 1 limit check",
    pageOne.data.length <= paginationLimit,
  );

  if (pageOne.pagination.pages >= 2) {
    const pageTwo: IPageIChatbotRoomTuples.ISummary =
      await api.functional.chatbot.admin.chatbotRoomTuples.index(connection, {
        body: {
          page: 2,
          limit: paginationLimit,
        } satisfies IChatbotRoomTuples.IRequest,
      });
    typia.assert(pageTwo);
    TestValidator.predicate(
      "page 2 limit check",
      pageTwo.data.length <= paginationLimit,
    );

    // Check no overlapping IDs between page 1 and page 2
    const page1Ids = new Set(pageOne.data.map((t) => t.id));
    const page2Ids = new Set(pageTwo.data.map((t) => t.id));
    for (const id of page2Ids) {
      TestValidator.predicate("page 2 ids not in page 1", !page1Ids.has(id));
    }
  }
}
