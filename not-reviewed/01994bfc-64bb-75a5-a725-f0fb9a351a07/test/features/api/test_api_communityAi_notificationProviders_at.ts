import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiNotificationProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotificationProvider";

export async function test_api_communityAi_notificationProviders_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiNotificationProvider =
    await api.functional.communityAi.notificationProviders.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
