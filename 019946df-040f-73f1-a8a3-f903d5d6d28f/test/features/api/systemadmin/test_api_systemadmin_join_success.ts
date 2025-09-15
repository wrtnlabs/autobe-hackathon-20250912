import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

export async function test_api_systemadmin_join_success(
  connection: api.IConnection,
) {
  // 1. Prepare valid systemAdmin creation info
  const password = "hashedPasswordSample123!";
  const email = typia.random<string & tags.Format<"email">>();
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  // Compose valid create request body
  const createBody = {
    email,
    password_hash: password,
    first_name: firstName,
    last_name: lastName,
    status,
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  // 2. Call join API for systemAdmin creation
  const authorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Validate returned fields
  TestValidator.predicate(
    "token contains access",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );

  // 3. Duplicate registration should throw error
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  });
}
