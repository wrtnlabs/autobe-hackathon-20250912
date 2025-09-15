import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiDeploymentLog";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

export async function test_api_deployment_log_update_with_admin_lifecycle(
  connection: api.IConnection,
) {
  // 1. Onboard a new system admin
  const externalAdminId = RandomGenerator.alphaNumeric(12);
  const email = `${RandomGenerator.alphabets(8)}@company.com` as string &
    tags.Format<"email">;
  const joinInput = {
    external_admin_id: externalAdminId,
    email,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const joinResp = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResp);

  // 2. Authenticate admin (simulate session renewal)
  const loginResp = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: externalAdminId,
      email,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(loginResp);

  // 3. Create a deployment log for update testing
  const logCreateInput = {
    deployment_label: RandomGenerator.name(2),
    action_type: RandomGenerator.pick([
      "deploy",
      "rollback",
      "hotfix",
      "config-change",
    ] as const),
    environment: RandomGenerator.pick([
      "production",
      "staging",
      "development",
    ] as const),
    initiated_by: email,
    status: RandomGenerator.pick([
      "success",
      "failed",
      "in-progress",
      "aborted",
    ] as const),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IStoryfieldAiDeploymentLog.ICreate;
  const log =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.create(
      connection,
      { body: logCreateInput },
    );
  typia.assert(log);

  // 4. Update the deployment log's status and summary
  const updateInput = {
    status: RandomGenerator.pick(["success", "failed", "aborted"] as const),
    summary: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IStoryfieldAiDeploymentLog.IUpdate;
  const updated =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.update(
      connection,
      {
        deploymentLogId: log.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals(
    "updated_at changed after update",
    updated.updated_at,
    log.updated_at,
  );
  TestValidator.equals("status updated", updated.status, updateInput.status);
  TestValidator.equals("summary updated", updated.summary, updateInput.summary);

  // 5. Edge case: update with missing update parameters (should fail)
  await TestValidator.error("update with empty body should fail", async () => {
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.update(
      connection,
      {
        deploymentLogId: log.id,
        body: {} satisfies IStoryfieldAiDeploymentLog.IUpdate,
      },
    );
  });

  // 6. Edge case: update with invalid deploymentLogId (should fail)
  await TestValidator.error(
    "update with non-existent deploymentLogId should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.deploymentLogs.update(
        connection,
        {
          deploymentLogId: typia.random<string & tags.Format<"uuid">>(),
          body: updateInput,
        },
      );
    },
  );

  // 7. Edge case: update unauthenticated (new unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update without authentication should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.deploymentLogs.update(
        unauthConn,
        {
          deploymentLogId: log.id,
          body: updateInput,
        },
      );
    },
  );
}
