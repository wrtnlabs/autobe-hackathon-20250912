import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProjectMember";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";

export async function test_api_project_member_index_pmo_invalid_project_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as PMO to obtain access token
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "validPassword123",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // 2. Test with a valid UUID that likely does not exist
  const nonExistentProjectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should fail for non-existent project ID",
    async () => {
      await api.functional.taskManagement.pmo.projects.members.index(
        connection,
        {
          projectId: nonExistentProjectId,
          body: {
            page: 1,
            limit: 10,
            search: null,
          } satisfies ITaskManagementProjectMember.IRequest,
        },
      );
    },
  );
}
