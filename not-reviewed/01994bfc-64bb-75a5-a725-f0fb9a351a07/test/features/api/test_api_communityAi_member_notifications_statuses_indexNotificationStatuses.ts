import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageICommunityAiNotificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiNotificationStatus";
import { ICommunityAiNotificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotificationStatus";

export async function test_api_communityAi_member_notifications_statuses_indexNotificationStatuses(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiNotificationStatus =
    await api.functional.communityAi.member.notifications.statuses.indexNotificationStatuses(
      connection,
      {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiNotificationStatus.IRequest>(),
      },
    );
  typia.assert(output);
}
