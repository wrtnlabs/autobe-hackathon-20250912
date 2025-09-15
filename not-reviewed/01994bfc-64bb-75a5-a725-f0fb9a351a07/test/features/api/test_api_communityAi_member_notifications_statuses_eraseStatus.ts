import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_member_notifications_statuses_eraseStatus(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.member.notifications.statuses.eraseStatus(
      connection,
      {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
        notificationStatusId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
