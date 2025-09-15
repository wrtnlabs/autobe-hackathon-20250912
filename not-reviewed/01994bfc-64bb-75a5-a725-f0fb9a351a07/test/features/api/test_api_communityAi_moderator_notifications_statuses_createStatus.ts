import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiNotificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotificationStatus";

export async function test_api_communityAi_moderator_notifications_statuses_createStatus(
  connection: api.IConnection,
) {
  const output: ICommunityAiNotificationStatus =
    await api.functional.communityAi.moderator.notifications.statuses.createStatus(
      connection,
      {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiNotificationStatus.ICreate>(),
      },
    );
  typia.assert(output);
}
