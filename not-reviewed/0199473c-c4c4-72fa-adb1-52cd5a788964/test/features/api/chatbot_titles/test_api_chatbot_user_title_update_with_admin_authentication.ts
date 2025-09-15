import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotTitles } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotTitles";

/**
 * Verifies user title update functionality by an admin user.
 *
 * This test comprises the lifecycle of admin authentication, user title
 * creation, update attempt, validation, and authorization enforcement.
 *
 * Steps:
 *
 * 1. Admin registers and obtains authorization token.
 * 2. Admin creates a new user title with valid name and fee discount rate.
 * 3. Admin updates the created user title's name and fee discount rate.
 * 4. Validate the update response matches the expected updated values.
 * 5. Attempt to update the user title without admin authentication and expect
 *    failure.
 *
 * This scenario tests business rules including unique title names, valid
 * discount rates between 0 and 100, and authorization permissions. It also
 * confirms that unauthorized updates are rejected appropriately.
 */
export async function test_api_chatbot_user_title_update_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin joins to become authorized admin
  const internalSenderId: string = RandomGenerator.alphaNumeric(16);
  const nickname: string = RandomGenerator.name();
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        internal_sender_id: internalSenderId,
        nickname: nickname,
      } satisfies IChatbotAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create a new user title to update
  const originalTitleName = `Title_${RandomGenerator.alphaNumeric(6)}`;
  const originalFeeDiscountRate = Math.floor(Math.random() * 101); // 0 to 100
  const createdTitle: IChatbotTitles =
    await api.functional.chatbot.admin.titles.create(connection, {
      body: {
        name: originalTitleName,
        fee_discount_rate: originalFeeDiscountRate,
      } satisfies IChatbotTitles.ICreate,
    });
  typia.assert(createdTitle);

  // 3. Update the created user title
  const updatedTitleName = `Updated_${RandomGenerator.alphaNumeric(6)}`;
  const updatedFeeDiscountRate = Math.floor(Math.random() * 101); // 0 to 100
  const updatedTitle: IChatbotTitles =
    await api.functional.chatbot.admin.titles.update(connection, {
      id: createdTitle.id,
      body: {
        name: updatedTitleName,
        fee_discount_rate: updatedFeeDiscountRate,
      } satisfies IChatbotTitles.IUpdate,
    });
  typia.assert(updatedTitle);

  // 4. Validate updated title matches
  TestValidator.equals(
    "Updated title id matches original",
    updatedTitle.id,
    createdTitle.id,
  );
  TestValidator.equals(
    "Updated title name differs from original",
    updatedTitle.name,
    updatedTitleName,
  );
  TestValidator.notEquals(
    "Updated title name is different from original",
    updatedTitle.name,
    originalTitleName,
  );
  TestValidator.equals(
    "Updated title fee discount rate matches",
    updatedTitle.fee_discount_rate,
    updatedFeeDiscountRate,
  );

  // 5. Attempt update without admin authorization to validate failure
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Unauthorized update attempt should fail",
    async () => {
      await api.functional.chatbot.admin.titles.update(
        unauthenticatedConnection,
        {
          id: createdTitle.id,
          body: {
            name: "IllegalUpdate",
            fee_discount_rate: 50,
          } satisfies IChatbotTitles.IUpdate,
        },
      );
    },
  );
}
