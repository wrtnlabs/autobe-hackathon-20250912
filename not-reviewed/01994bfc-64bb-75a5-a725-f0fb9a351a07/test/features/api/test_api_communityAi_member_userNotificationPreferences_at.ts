import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiUserNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserNotificationPreferences";

export async function test_api_communityAi_member_userNotificationPreferences_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiUserNotificationPreferences =
    await api.functional.communityAi.member.userNotificationPreferences.at(
      connection,
      {
        userNotificationPreferenceId: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    );
  typia.assert(output);
}
