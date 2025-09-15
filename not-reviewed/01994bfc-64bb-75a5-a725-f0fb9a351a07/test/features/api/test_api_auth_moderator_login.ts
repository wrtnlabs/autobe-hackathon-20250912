import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModerator";

export async function test_api_auth_moderator_login(
  connection: api.IConnection,
) {
  const output: ICommunityAiModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: typia.random<ICommunityAiModerator.ILogin>(),
    });
  typia.assert(output);
}
