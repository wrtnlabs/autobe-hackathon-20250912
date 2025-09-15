import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiNotificationProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotificationProvider";

export async function test_api_communityAi_admin_notificationProviders_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiNotificationProvider =
    await api.functional.communityAi.admin.notificationProviders.create(
      connection,
      {
        body: typia.random<ICommunityAiNotificationProvider.ICreate>(),
      },
    );
  typia.assert(output);
}
