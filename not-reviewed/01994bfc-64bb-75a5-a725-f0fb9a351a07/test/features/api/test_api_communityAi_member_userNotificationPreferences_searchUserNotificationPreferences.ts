import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiUserNotificationPreference";
import { ICommunityAiUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserNotificationPreference";

export async function test_api_communityAi_member_userNotificationPreferences_searchUserNotificationPreferences(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiUserNotificationPreference.ISummary =
    await api.functional.communityAi.member.userNotificationPreferences.searchUserNotificationPreferences(
      connection,
      {
        body: typia.random<ICommunityAiUserNotificationPreference.IRequest>(),
      },
    );
  typia.assert(output);
}
