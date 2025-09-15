import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotification";

export async function test_api_communityAi_member_notifications_updateNotification(
  connection: api.IConnection,
) {
  const output: ICommunityAiNotification =
    await api.functional.communityAi.member.notifications.updateNotification(
      connection,
      {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiNotification.IUpdate>(),
      },
    );
  typia.assert(output);
}
