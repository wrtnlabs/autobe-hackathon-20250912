import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_member_userNotificationPreferences_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.member.userNotificationPreferences.erase(
      connection,
      {
        userNotificationPreferenceId: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    );
  typia.assert(output);
}
