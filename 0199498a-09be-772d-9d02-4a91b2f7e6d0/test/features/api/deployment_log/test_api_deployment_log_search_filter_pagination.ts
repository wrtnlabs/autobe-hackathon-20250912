import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiDeploymentLog";
import type { IStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiDeploymentLog";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validates admin search, filter, and pagination for deployment logs.
 *
 * 1. Register and login as system admin (external id+email).
 * 2. Create N deployment/rollback logs with varied attributes.
 * 3. Perform filtered searches using PATCH /deploymentLogs.
 * 4. Validate search/pagination: correct filters, output shape.
 * 5. Query with filters yielding no result and validate.
 * 6. Query with impossible logic filters; must error cleanly.
 */
export async function test_api_deployment_log_search_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminExternalId = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.alphabets(8)}@company.com`;
  const adminJoinBody = {
    external_admin_id: adminExternalId,
    email: adminEmail,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Create multiple varied deployment logs
  const actionTypes = [
    "deploy",
    "rollback",
    "hotfix",
    "config-change",
  ] as const;
  const statuses = ["success", "failed", "aborted", "in-progress"] as const;
  const envs = ["production", "staging", "dev"] as const;
  const createdLogs: IStoryfieldAiDeploymentLog[] = [];
  for (let i = 0; i < 15; ++i) {
    const body = {
      deployment_label: `v${1 + i}.${RandomGenerator.alphaNumeric(2)}`,
      action_type: RandomGenerator.pick(actionTypes),
      environment: RandomGenerator.pick(envs),
      initiated_by: adminEmail,
      status: RandomGenerator.pick(statuses),
      summary: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies IStoryfieldAiDeploymentLog.ICreate;
    const created =
      await api.functional.storyfieldAi.systemAdmin.deploymentLogs.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdLogs.push(created);
  }

  // 3. Search/filter - by action_type, status, environment
  // Pick a random filter target from created logs
  const filterTarget = RandomGenerator.pick(createdLogs);
  const searchReq1 = {
    action_type: filterTarget.action_type,
    environment: filterTarget.environment,
    status: filterTarget.status,
    limit: 5,
    page: 1,
  } satisfies IStoryfieldAiDeploymentLog.IRequest;
  const result1 =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.index(
      connection,
      { body: searchReq1 },
    );
  typia.assert(result1);
  TestValidator.predicate("result shape valid", Array.isArray(result1.data));
  // All returned items must match filter
  for (const r of result1.data) {
    TestValidator.equals(
      "action_type filtered",
      r.action_type,
      filterTarget.action_type,
    );
    TestValidator.equals(
      "environment filtered",
      r.environment,
      filterTarget.environment,
    );
    TestValidator.equals("status filtered", r.status, filterTarget.status);
  }
  // Pagination info check
  TestValidator.equals("limit field", result1.pagination.limit, 5);
  TestValidator.equals("page number", result1.pagination.current, 1);

  // 4. Paginate through matching results
  // Use broader filter
  const searchReq2 = {
    environment: filterTarget.environment,
    limit: 3,
    page: 1,
  } satisfies IStoryfieldAiDeploymentLog.IRequest;
  const result2 =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.index(
      connection,
      { body: searchReq2 },
    );
  typia.assert(result2);
  TestValidator.equals("pagination.limit applied", result2.pagination.limit, 3);
  // Page 2
  const searchReq2b = {
    ...searchReq2,
    page: 2 as number & tags.Type<"int32">,
  } satisfies IStoryfieldAiDeploymentLog.IRequest;
  const result2b =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.index(
      connection,
      { body: searchReq2b },
    );
  typia.assert(result2b);
  TestValidator.equals(
    "pagination.current = 2",
    result2b.pagination.current,
    2,
  );
  // Results not overlapping
  if (result2.data.length && result2b.data.length) {
    const idsPage1 = result2.data.map((r) => r.id);
    for (const r of result2b.data) {
      TestValidator.predicate(
        "page result does not repeat",
        !idsPage1.includes(r.id),
      );
    }
  }

  // 5. Query using filter that guarantees no result
  const notExistReq = {
    action_type: "deploy",
    environment: "nonexistent-env",
    page: 1,
    limit: 1,
  } satisfies IStoryfieldAiDeploymentLog.IRequest;
  const noneResult =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.index(
      connection,
      { body: notExistReq },
    );
  typia.assert(noneResult);
  TestValidator.equals(
    "no result for impossible env",
    noneResult.data.length,
    0,
  );

  // 6. Test query with logic-valid but impossible combination (type-correct, e.g. status + env that logically won't match existing data)
  // Pick an environment not used previously
  const impossibleEnv = "sandbox-test";
  const impossibleReq = {
    environment: impossibleEnv,
    action_type: "hotfix",
    page: 1,
    limit: 10,
  } satisfies IStoryfieldAiDeploymentLog.IRequest;
  const impossibleResult =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.index(
      connection,
      { body: impossibleReq },
    );
  typia.assert(impossibleResult);
  TestValidator.equals(
    "no results for impossible logic combination",
    impossibleResult.data.length,
    0,
  );
}
