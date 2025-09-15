import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiUserNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserNotificationPreferences";

export async function test_api_communityAi_member_userNotificationPreferences_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiUserNotificationPreferences =
    await api.functional.communityAi.member.userNotificationPreferences.create(
      connection,
      {
        body: typia.random<ICommunityAiUserNotificationPreferences.ICreate>(),
      },
    );
  typia.assert(output);
}
