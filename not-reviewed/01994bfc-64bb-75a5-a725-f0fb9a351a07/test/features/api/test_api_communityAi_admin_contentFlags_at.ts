import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiContentFlag";

export async function test_api_communityAi_admin_contentFlags_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiContentFlag =
    await api.functional.communityAi.admin.contentFlags.at(connection, {
      contentFlagId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
