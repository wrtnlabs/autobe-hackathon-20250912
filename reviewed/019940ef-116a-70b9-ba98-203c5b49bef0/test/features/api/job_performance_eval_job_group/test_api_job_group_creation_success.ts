import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * This test validates successful creation of a job group by an authorized
 * manager. It first performs manager user registration to establish
 * authentication. Then it creates a job group with unique code, name, and
 * description. The returned job group is validated for correctness, including
 * verification of timestamps.
 *
 * The test uses typia for strict type validation and verifies the business
 * logic correctness of the job group creation API.
 */
export async function test_api_job_group_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new manager user for authentication
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerCreateBody = {
    email: managerEmail,
    password: "StrongPass123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Create a new job group as an authorized manager
  const jobGroupCreateBody = {
    code: `JG${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;

  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      {
        body: jobGroupCreateBody,
      },
    );
  typia.assert(jobGroup);

  // 3. Validate returned job group fields
  TestValidator.equals(
    "Job group code should match",
    jobGroup.code,
    jobGroupCreateBody.code,
  );
  TestValidator.equals(
    "Job group name should match",
    jobGroup.name,
    jobGroupCreateBody.name,
  );
  // Description is nullable and optional: when input present, must match; or null
  const expectedDescription = jobGroupCreateBody.description ?? null;
  TestValidator.equals(
    "Job group description should match",
    jobGroup.description ?? null,
    expectedDescription,
  );

  // 4. Validate timestamps are ISO 8601 date-time strings
  TestValidator.predicate(
    "Job group created_at should be ISO 8601",
    typeof jobGroup.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(jobGroup.created_at),
  );
  TestValidator.predicate(
    "Job group updated_at should be ISO 8601",
    typeof jobGroup.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(jobGroup.updated_at),
  );
}
