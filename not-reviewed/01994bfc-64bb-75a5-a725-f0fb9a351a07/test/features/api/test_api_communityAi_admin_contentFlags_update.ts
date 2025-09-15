import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiContentFlag";

export async function test_api_communityAi_admin_contentFlags_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiContentFlag =
    await api.functional.communityAi.admin.contentFlags.update(connection, {
      contentFlagId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiContentFlag.IUpdate>(),
    });
  typia.assert(output);
}
