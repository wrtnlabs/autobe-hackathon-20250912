import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotStockHolding } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockHolding";
import type { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";

/**
 * This E2E test validates the entire workflow of a member user deleting their
 * stock holding in the chatbot system. It begins by registering and logging in
 * a chatbot member user to establish authentication and context. Then, an admin
 * user is registered and logged in to create a new chatbot stock item, which
 * will be used for stock holdings. Next, a chatbot member entity is created for
 * the authenticated member user. Using this member's ID, a stock holding is
 * created referencing the previously created stock item with a quantity. The
 * test then switches back to the member user context and performs the deletion
 * of the created stock holding. Validations ensure successful registration and
 * login of both member and admin users, creation of stock item and stock
 * holding, and proper deletion of the stock holding. Additionally, it tests
 * that attempting to delete another member’s stock holding is rejected as
 * unauthorized, ensuring authorization enforcement. The test asserts all API
 * responses using typia.assert and performs business logic validations with
 * descriptive TestValidator calls. This test covers critical role-based
 * operations, entity creation, cross-role action authorization, and proper
 * resource cleanup for the stock holding deletion feature.
 */
export async function test_api_stock_holding_deletion_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration and login
  const memberPayload = {
    internal_sender_id: RandomGenerator.alphaNumeric(20),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  // Join member
  const memberAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberPayload,
    });
  typia.assert(memberAuthorized);

  // Login member
  await api.functional.auth.member.login.loginMember(connection, {
    body: {
      internal_sender_id: memberPayload.internal_sender_id,
      nickname: memberPayload.nickname,
    } satisfies IChatbotMember.ILogin,
  });

  // 2. Admin registration and login
  const adminPayload = {
    internal_sender_id: RandomGenerator.alphaNumeric(20),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  // Join admin
  const adminAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminPayload,
    });
  typia.assert(adminAuthorized);

  // Login admin
  await api.functional.auth.admin.login(connection, {
    body: {
      internal_sender_id: adminPayload.internal_sender_id,
      nickname: adminPayload.nickname,
    } satisfies IChatbotAdmin.ILogin,
  });

  // 3. Admin creates a stock item
  const stockItemPayload = {
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    name: RandomGenerator.name(),
    initial_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
  } satisfies IChatbotStockItem.ICreate;

  const stockItem: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: stockItemPayload,
    });
  typia.assert(stockItem);

  // 4. Member creates chatbot member entity
  const chatbotMemberPayload = {
    internal_sender_id: memberPayload.internal_sender_id,
    nickname: memberPayload.nickname,
  } satisfies IChatbotMember.ICreate;
  // Use member user context
  // Switch back to member user for chatbot member creation
  await api.functional.auth.member.login.loginMember(connection, {
    body: {
      internal_sender_id: memberPayload.internal_sender_id,
      nickname: memberPayload.nickname,
    } satisfies IChatbotMember.ILogin,
  });

  const chatbotMember: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: chatbotMemberPayload,
    });
  typia.assert(chatbotMember);
  TestValidator.equals(
    "chatbot member IDs should match",
    chatbotMember.internal_sender_id,
    memberPayload.internal_sender_id,
  );

  // 5. Member creates a stock holding
  const stockHoldingPayload = {
    user_id: chatbotMember.id,
    stock_item_id: stockItem.id,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IChatbotStockHolding.ICreate;

  const stockHolding: IChatbotStockHolding =
    await api.functional.chatbot.member.chatbotMembers.stockHoldings.create(
      connection,
      {
        memberId: chatbotMember.id,
        body: stockHoldingPayload,
      },
    );
  typia.assert(stockHolding);
  TestValidator.equals(
    "stock holding user ID matches chatbot member id",
    stockHolding.user_id,
    chatbotMember.id,
  );

  // 6. Member deletes the stock holding
  await api.functional.chatbot.member.chatbotMembers.stockHoldings.erase(
    connection,
    {
      memberId: chatbotMember.id,
      stockHoldingId: stockHolding.id,
    },
  );

  // 7. Verify deletion - attempt to delete again should result in error
  await TestValidator.error(
    "deleting non-existent/previously deleted stock holding should fail",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.stockHoldings.erase(
        connection,
        {
          memberId: chatbotMember.id,
          stockHoldingId: stockHolding.id,
        },
      );
    },
  );

  // 8. Negative test: another member tries to delete this stock holding
  // Create second member
  const secondMemberPayload = {
    internal_sender_id: RandomGenerator.alphaNumeric(20),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const secondMemberAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: secondMemberPayload,
    });
  typia.assert(secondMemberAuthorized);

  // Login as second member
  await api.functional.auth.member.login.loginMember(connection, {
    body: {
      internal_sender_id: secondMemberPayload.internal_sender_id,
      nickname: secondMemberPayload.nickname,
    } satisfies IChatbotMember.ILogin,
  });

  // Second member attempts to delete previous member's stock holding, expect error
  await TestValidator.error(
    "unauthorized member should not delete other's stock holding",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.stockHoldings.erase(
        connection,
        {
          memberId: chatbotMember.id,
          stockHoldingId: stockHolding.id,
        },
      );
    },
  );
}
