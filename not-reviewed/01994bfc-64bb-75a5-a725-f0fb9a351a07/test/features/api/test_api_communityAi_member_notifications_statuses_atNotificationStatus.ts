import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiNotificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotificationStatus";

export async function test_api_communityAi_member_notifications_statuses_atNotificationStatus(
  connection: api.IConnection,
) {
  const output: ICommunityAiNotificationStatus =
    await api.functional.communityAi.member.notifications.statuses.atNotificationStatus(
      connection,
      {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
        notificationStatusId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
