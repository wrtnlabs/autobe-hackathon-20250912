import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiCommunityAiSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiCommunityAiSystemSettings";

export async function test_api_communityAi_admin_systemSettings_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiCommunityAiSystemSettings =
    await api.functional.communityAi.admin.systemSettings.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiCommunityAiSystemSettings.IUpdate>(),
    });
  typia.assert(output);
}
