import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiNotificationProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiNotificationProvider";
import { ICommunityAiNotificationProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotificationProvider";

export async function test_api_communityAi_admin_notificationProviders_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiNotificationProvider.ISummary =
    await api.functional.communityAi.admin.notificationProviders.index(
      connection,
      {
        body: typia.random<ICommunityAiNotificationProvider.IRequest>(),
      },
    );
  typia.assert(output);
}
