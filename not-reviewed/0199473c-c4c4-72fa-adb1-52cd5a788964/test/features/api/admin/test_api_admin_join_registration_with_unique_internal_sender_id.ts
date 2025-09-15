import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";

export async function test_api_admin_join_registration_with_unique_internal_sender_id(
  connection: api.IConnection,
) {
  // 1. Prepare unique admin registration data with internal_sender_id and nickname
  const internalSenderId = RandomGenerator.alphaNumeric(20); // realistic unique ID string
  const nickname = RandomGenerator.name(); // generate random nickname

  const body = {
    internal_sender_id: internalSenderId,
    nickname: nickname,
  } satisfies IChatbotAdmin.ICreate;

  // 2. Call /auth/admin/join POST endpoint to create admin user
  const authorizedAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: body,
    });

  // 3. Validate the shape and correctness of the response data
  typia.assert(authorizedAdmin);

  // 4. Check the returned internal_sender_id and nickname are as expected
  TestValidator.equals(
    "internal_sender_id matches request",
    authorizedAdmin.internal_sender_id,
    internalSenderId,
  );
  TestValidator.equals(
    "nickname matches request",
    authorizedAdmin.nickname,
    nickname,
  );

  // 5. Validate presence of required token properties
  TestValidator.predicate(
    "token object exists",
    authorizedAdmin.token !== null && authorizedAdmin.token !== undefined,
  );
  TestValidator.predicate(
    "token.access is string",
    typeof authorizedAdmin.token.access === "string",
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof authorizedAdmin.token.refresh === "string",
  );
  TestValidator.predicate(
    "token.expired_at is valid date-time string",
    typeof authorizedAdmin.token.expired_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?(?:Z|[+-][0-9]{2}:[0-9]{2})?$/.test(
        authorizedAdmin.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid date-time string",
    typeof authorizedAdmin.token.refreshable_until === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?(?:Z|[+-][0-9]{2}:[0-9]{2})?$/.test(
        authorizedAdmin.token.refreshable_until,
      ),
  );
}
