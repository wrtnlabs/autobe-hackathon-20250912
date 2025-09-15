import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMoodDiaryDiaryUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryDiaryUser";

/**
 * Validate stateless session token issuance for the single logical
 * diaryUser.
 *
 * This test ensures that the /auth/diaryUser/join endpoint always returns a
 * valid session token for the unique diaryUser—no registration,
 * credentials, or input required. Multiple calls should return distinct
 * tokens for the same logical user id, and returned objects must have the
 * required id, created_at, and token properties (with valid formats, never
 * leaking personal data).
 *
 * 1. Call the join endpoint and validate the output DTO is correct and all
 *    required fields are present and in the correct formats.
 * 2. Call join repeatedly—ensure the id and created_at remain consistent,
 *    while the token values differ.
 * 3. Validate that the endpoint is robust to extraneous/nonsense data—such
 *    input must be ignored.
 * 4. Confirm there is no confidential information in the response beyond id,
 *    created_at, and token.
 */
export async function test_api_diaryuser_session_token_issuance(
  connection: api.IConnection,
) {
  // (1) Issue first session token
  const output1: IMoodDiaryDiaryUser.IAuthorized =
    await api.functional.auth.diaryUser.join(connection);
  typia.assert(output1);

  TestValidator.predicate(
    "id is valid uuid",
    typeof output1.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        output1.id,
      ),
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof output1.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(output1.created_at),
  );

  // Must contain only the three fields: id, created_at, token
  TestValidator.equals(
    "response has only id, created_at, token",
    Object.keys(output1).sort(),
    ["created_at", "id", "token"],
  );

  // Validate token substructure
  typia.assert<IAuthorizationToken>(output1.token);
  TestValidator.predicate(
    "token.access present",
    typeof output1.token.access === "string" &&
      output1.token.access.length > 10,
  );
  TestValidator.predicate(
    "token.refresh present",
    typeof output1.token.refresh === "string" &&
      output1.token.refresh.length > 10,
  );
  TestValidator.predicate(
    "token.expired_at ISO str",
    typeof output1.token.expired_at === "string" &&
      /T\d{2}:\d{2}:\d{2}/.test(output1.token.expired_at),
  );
  TestValidator.predicate(
    "token.refreshable_until ISO str",
    typeof output1.token.refreshable_until === "string" &&
      /T\d{2}:\d{2}:\d{2}/.test(output1.token.refreshable_until),
  );

  // (2) Repeat and confirm id and created_at are identical, token differs
  const output2: IMoodDiaryDiaryUser.IAuthorized =
    await api.functional.auth.diaryUser.join(connection);
  typia.assert(output2);
  TestValidator.equals("id is consistent", output2.id, output1.id);
  TestValidator.equals(
    "created_at is consistent",
    output2.created_at,
    output1.created_at,
  );
  TestValidator.notEquals(
    "token.access should differ",
    output2.token.access,
    output1.token.access,
  );

  // (3) Try to submit extraneous data (should be ignored)
  // We can't actually send extra data (no parameters accepted), but just verify call is robust
  // (This step is skipped due to API definition)

  // (4) Simulate system error (not tested here, would require test harness to force backend failure)
}
