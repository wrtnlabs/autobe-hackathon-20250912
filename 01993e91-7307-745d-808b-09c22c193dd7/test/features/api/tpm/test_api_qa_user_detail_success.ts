import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_qa_user_detail_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as TPM user with QA access rights
  const joinBody = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const authorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Retrieve the detailed information of the created QA user by ID
  const qaUser: ITaskManagementQa =
    await api.functional.taskManagement.tpm.taskManagement.qas.at(connection, {
      id: authorized.id,
    });
  typia.assert(qaUser);

  // 3. Test validations
  TestValidator.equals(
    "QA user ID matches authorized ID",
    qaUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "QA user email matches authorized email",
    qaUser.email,
    authorized.email,
  );
  TestValidator.equals(
    "QA user name matches authorized name",
    qaUser.name,
    authorized.name,
  );

  // Password hash should be present but must not match the original plain password
  TestValidator.predicate(
    "QA user password_hash is string",
    typeof qaUser.password_hash === "string" && qaUser.password_hash.length > 0,
  );
  TestValidator.notEquals(
    "QA user password_hash not equal original password",
    qaUser.password_hash,
    joinBody.password,
  );

  // Timestamps must be valid ISO 8601 date-time format
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  TestValidator.predicate(
    "QA user created_at is ISO 8601 format",
    iso8601Regex.test(qaUser.created_at),
  );
  TestValidator.predicate(
    "QA user updated_at is ISO 8601 format",
    iso8601Regex.test(qaUser.updated_at),
  );

  // deleted_at must be null or ISO 8601 string if present
  if (qaUser.deleted_at !== null && qaUser.deleted_at !== undefined) {
    TestValidator.predicate(
      "QA user deleted_at is ISO 8601 format",
      iso8601Regex.test(qaUser.deleted_at),
    );
  } else {
    TestValidator.equals(
      "QA user deleted_at is null or undefined",
      qaUser.deleted_at ?? null,
      null,
    );
  }
}
