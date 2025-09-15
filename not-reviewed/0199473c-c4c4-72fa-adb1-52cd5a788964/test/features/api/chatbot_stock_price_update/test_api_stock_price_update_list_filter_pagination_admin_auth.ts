import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotStockPriceUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockPriceUpdate";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotStockPriceUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotStockPriceUpdate";

/**
 * Test retrieval and filtering of paginated stock price updates as an
 * authorized chatbot admin.
 *
 * This test covers the full authorization and access control flow for the stock
 * price update listing endpoint, verifying correct behavior of filters,
 * pagination, sorting, and error scenarios.
 *
 * Workflow:
 *
 * 1. Admin account creation and authorization
 * 2. Admin login with valid credentials
 * 3. Multiple list retrieval calls on /chatbot/admin/stockPriceUpdates with
 *    different filters and pagination
 * 4. Validation of response content, data filtering, pagination correctness, and
 *    sorting order
 * 5. Attempt access without authentication to confirm error
 * 6. Retrieve individual stock price update details for verification
 */
export async function test_api_stock_price_update_list_filter_pagination_admin_auth(
  connection: api.IConnection,
) {
  // 1. Create an admin with specific internal_sender_id and nickname
  const internalSenderId = `internal_${RandomGenerator.alphaNumeric(8)}`;
  const nickname = RandomGenerator.name();
  const createAdminBody = {
    internal_sender_id: internalSenderId,
    nickname,
  } satisfies IChatbotAdmin.ICreate;
  const authorizedAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createAdminBody });
  typia.assert(authorizedAdmin);

  // 2. Login as that admin
  const loginBody = {
    internal_sender_id: internalSenderId,
    nickname,
  } satisfies IChatbotAdmin.ILogin;
  const loggedInAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loggedInAdmin);

  // Helper: Prepare request bodies for index with pagination and filter
  // Use realistic datetime filters between created stock price updates

  // 3. Retrieve a basic list without filters
  const basicRequest = {
    page: 1,
    limit: 5,
  } satisfies IChatbotStockPriceUpdate.IRequest;
  const basicList: IPageIChatbotStockPriceUpdate =
    await api.functional.chatbot.admin.stockPriceUpdates.index(connection, {
      body: basicRequest,
    });
  typia.assert(basicList);
  TestValidator.predicate(
    "basicList data items count valid",
    Array.isArray(basicList.data) && basicList.data.length <= 5,
  );

  // 4. If data exists, store first stock price update for filter tests
  let firstUpdate: IChatbotStockPriceUpdate | null = null;
  if (basicList.data.length > 0) {
    firstUpdate = basicList.data[0];
  }

  // 5. Test filtering by updated_by_admin_id if available
  if (
    firstUpdate &&
    firstUpdate.updated_by_admin_id !== null &&
    firstUpdate.updated_by_admin_id !== undefined
  ) {
    const adminIdFilterRequest = {
      body: {
        updated_by_admin_id: firstUpdate.updated_by_admin_id,
        page: 1,
        limit: 10,
      } satisfies IChatbotStockPriceUpdate.IRequest,
    };
    const filteredByAdminList =
      await api.functional.chatbot.admin.stockPriceUpdates.index(
        connection,
        adminIdFilterRequest,
      );
    typia.assert(filteredByAdminList);
    // Each data item must have updated_by_admin_id matching filter
    for (const item of filteredByAdminList.data) {
      TestValidator.equals(
        "updated_by_admin_id filter match",
        item.updated_by_admin_id,
        firstUpdate.updated_by_admin_id,
      );
    }
  }

  // 6. Test filtering by update_date_gte and update_date_lte
  if (firstUpdate) {
    const dateGte = firstUpdate.update_date;
    const dateLte = firstUpdate.update_date;

    // Filter using update_date_gte
    const filterGteRequest = {
      body: {
        update_date_gte: dateGte,
        page: 1,
        limit: 10,
      } satisfies IChatbotStockPriceUpdate.IRequest,
    };
    const filteredGteList =
      await api.functional.chatbot.admin.stockPriceUpdates.index(
        connection,
        filterGteRequest,
      );
    typia.assert(filteredGteList);
    for (const item of filteredGteList.data) {
      TestValidator.predicate(
        "update_date_gte filter",
        item.update_date >= dateGte,
      );
    }

    // Filter using update_date_lte
    const filterLteRequest = {
      body: {
        update_date_lte: dateLte,
        page: 1,
        limit: 10,
      } satisfies IChatbotStockPriceUpdate.IRequest,
    };
    const filteredLteList =
      await api.functional.chatbot.admin.stockPriceUpdates.index(
        connection,
        filterLteRequest,
      );
    typia.assert(filteredLteList);
    for (const item of filteredLteList.data) {
      TestValidator.predicate(
        "update_date_lte filter",
        item.update_date <= dateLte,
      );
    }
  }

  // 7. Test pagination boundaries: large page number to get empty or minimal results
  const largePageRequest = {
    body: {
      page: 99999,
      limit: 10,
    } satisfies IChatbotStockPriceUpdate.IRequest,
  };
  const largePageList =
    await api.functional.chatbot.admin.stockPriceUpdates.index(
      connection,
      largePageRequest,
    );
  typia.assert(largePageList);
  TestValidator.equals(
    "large page returns empty or fewer items",
    largePageList.data.length <= 10,
    true,
  );

  // 8. Test ordering: orderBy 'update_date' ascending and descending
  const orderAscRequest = {
    body: {
      orderBy: "update_date",
      direction: "asc",
      page: 1,
      limit: 20,
    } satisfies IChatbotStockPriceUpdate.IRequest,
  };
  const orderedAscList =
    await api.functional.chatbot.admin.stockPriceUpdates.index(
      connection,
      orderAscRequest,
    );
  typia.assert(orderedAscList);
  for (let i = 1; i < orderedAscList.data.length; i++) {
    TestValidator.predicate(
      "order ascending",
      orderedAscList.data[i - 1].update_date <=
        orderedAscList.data[i].update_date,
    );
  }

  const orderDescRequest = {
    body: {
      orderBy: "update_date",
      direction: "desc",
      page: 1,
      limit: 20,
    } satisfies IChatbotStockPriceUpdate.IRequest,
  };
  const orderedDescList =
    await api.functional.chatbot.admin.stockPriceUpdates.index(
      connection,
      orderDescRequest,
    );
  typia.assert(orderedDescList);
  for (let i = 1; i < orderedDescList.data.length; i++) {
    TestValidator.predicate(
      "order descending",
      orderedDescList.data[i - 1].update_date >=
        orderedDescList.data[i].update_date,
    );
  }

  // 9. Test unauthorized access: Attempt to call index without admin auth
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "access denied without admin authentication",
    async () => {
      await api.functional.chatbot.admin.stockPriceUpdates.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 5,
          } satisfies IChatbotStockPriceUpdate.IRequest,
        },
      );
    },
  );

  // 10. If there is at least one stock price update, retrieve its details
  if (firstUpdate) {
    const detail = await api.functional.chatbot.admin.stockPriceUpdates.at(
      connection,
      {
        stockPriceUpdateId: firstUpdate.id,
      },
    );
    typia.assert(detail);
    TestValidator.equals("detail matches id", detail.id, firstUpdate.id);
  }
}
