import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiNotification";

export async function test_api_communityAi_moderator_notifications_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiNotification =
    await api.functional.communityAi.moderator.notifications.create(
      connection,
      {
        body: typia.random<ICommunityAiNotification.ICreate>(),
      },
    );
  typia.assert(output);
}
