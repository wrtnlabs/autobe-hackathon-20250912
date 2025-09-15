import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiNotification";
import { ICommunityAiNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotification";

export async function test_api_communityAi_member_notifications_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiNotification.ISummary =
    await api.functional.communityAi.member.notifications.index(connection, {
      body: typia.random<ICommunityAiNotification.IRequest>(),
    });
  typia.assert(output);
}
