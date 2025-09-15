import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiCommunityAiSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiCommunityAiSystemSettings";

export async function test_api_communityAi_admin_systemSettings_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiCommunityAiSystemSettings =
    await api.functional.communityAi.admin.systemSettings.create(connection, {
      body: typia.random<ICommunityAiCommunityAiSystemSettings.ICreate>(),
    });
  typia.assert(output);
}
