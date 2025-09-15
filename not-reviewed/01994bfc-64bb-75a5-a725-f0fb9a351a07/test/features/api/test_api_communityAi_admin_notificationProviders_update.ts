import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiNotificationProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotificationProvider";

export async function test_api_communityAi_admin_notificationProviders_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiNotificationProvider =
    await api.functional.communityAi.admin.notificationProviders.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiNotificationProvider.IUpdate>(),
      },
    );
  typia.assert(output);
}
