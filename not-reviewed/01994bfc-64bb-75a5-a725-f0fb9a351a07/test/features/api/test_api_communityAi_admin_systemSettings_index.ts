import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiCommunityAiSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiCommunityAiSystemSettings";
import { ICommunityAiCommunityAiSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiCommunityAiSystemSettings";

export async function test_api_communityAi_admin_systemSettings_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiCommunityAiSystemSettings =
    await api.functional.communityAi.admin.systemSettings.index(connection, {
      body: typia.random<ICommunityAiCommunityAiSystemSettings.IRequest>(),
    });
  typia.assert(output);
}
