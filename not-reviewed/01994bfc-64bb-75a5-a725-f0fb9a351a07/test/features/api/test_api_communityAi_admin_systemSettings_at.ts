import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiCommunityAiSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiCommunityAiSystemSettings";

export async function test_api_communityAi_admin_systemSettings_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiCommunityAiSystemSettings =
    await api.functional.communityAi.admin.systemSettings.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
