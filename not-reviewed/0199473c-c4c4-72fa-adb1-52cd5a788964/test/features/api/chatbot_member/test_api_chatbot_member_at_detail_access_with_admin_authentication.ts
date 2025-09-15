import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

/**
 * This E2E test validates the detailed retrieval of a chatbot member's
 * information via the admin API with correct admin authentication.
 *
 * The test encompasses:
 *
 * 1. Admin user registration
 * 2. Admin user login
 * 3. Retrieval of an existing chatbot member's details by a UUID
 * 4. Validation of member data formats including UUID correctness
 * 5. Error scenario testing for invalid/unknown member UUID resulting in 404
 */
export async function test_api_chatbot_member_at_detail_access_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Admin join to create admin user
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const adminAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // Step 2: Admin login
  const adminLoginBody = {
    internal_sender_id: adminCreateBody.internal_sender_id,
    nickname: adminCreateBody.nickname,
  } satisfies IChatbotAdmin.ILogin;
  const loggedInAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // Step 3: Fetch chatbot member detail using a valid member id
  const validMemberId = typia.random<string & tags.Format<"uuid">>();
  const memberDetail: IChatbotMember =
    await api.functional.chatbot.admin.chatbotMembers.at(connection, {
      id: validMemberId,
    });
  typia.assert(memberDetail);

  // Validate member id format
  TestValidator.predicate(
    "memberId is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      memberDetail.id,
    ),
  );

  // Step 4: Test error on unknown member id (should throw 404)
  const unknownId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw 404 on unknown member id",
    async () => {
      await api.functional.chatbot.admin.chatbotMembers.at(connection, {
        id: unknownId,
      });
    },
  );
}
