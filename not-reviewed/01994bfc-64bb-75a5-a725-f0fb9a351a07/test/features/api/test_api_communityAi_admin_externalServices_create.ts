import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiExternalServices } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiExternalServices";

export async function test_api_communityAi_admin_externalServices_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiExternalServices =
    await api.functional.communityAi.admin.externalServices.create(connection, {
      body: typia.random<ICommunityAiExternalServices.ICreate>(),
    });
  typia.assert(output);
}
