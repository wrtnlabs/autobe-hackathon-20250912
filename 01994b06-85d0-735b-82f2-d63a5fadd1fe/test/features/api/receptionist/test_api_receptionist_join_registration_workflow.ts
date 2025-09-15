import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Test the full E2E receptionist registration (join) workflow, covering success
 * and common validation error scenarios.
 *
 * 1. Success scenario: Register a new receptionist with unique business email,
 *    full name, and optional phone. Verify the returned fields and tokens.
 * 2. Duplicate email scenario: Attempt to register using the same email as an
 *    existing receptionist, and expect an error.
 */
export async function test_api_receptionist_join_registration_workflow(
  connection: api.IConnection,
) {
  // 1. Success: Register unique receptionist
  const email = typia.random<string & tags.Format<"email">>();
  const fullName = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const params = {
    email,
    full_name: fullName,
    phone,
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const output = await api.functional.auth.receptionist.join(connection, {
    body: params,
  });
  typia.assert(output);
  TestValidator.equals("email matches input", output.email, email);
  TestValidator.equals("full_name matches input", output.full_name, fullName);
  TestValidator.equals("phone matches input", output.phone, phone);
  TestValidator.predicate(
    "token returned and structured",
    typeof output.token === "object" && !!output.token.access,
  );

  // 2. Error: Duplicate email registration
  await TestValidator.error(
    "joining with duplicate email is rejected",
    async () => {
      await api.functional.auth.receptionist.join(connection, {
        body: {
          email,
          full_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformReceptionist.ICreate,
      });
    },
  );
}
