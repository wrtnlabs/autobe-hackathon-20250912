import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * End-to-end onboarding of a StoryField AI system admin using externally
 * validated credentials.
 *
 * Steps:
 *
 * 1. Register a new system admin with a unique external_admin_id and valid
 *    business email.
 * 2. Ensure the system returns required identity fields (uuid, email,
 *    external_admin_id, actor_type), valid token, timestamps (created_at,
 *    updated_at as ISO8601).
 * 3. Confirm optional fields (last_login_at, admin_notes, deleted_at) are
 *    nullable/optional.
 * 4. Attempt to re-register with the same external_admin_id and/or email and
 *    expect API rejection (uniqueness enforced).
 * 5. Register with minimum required fields (actor_type is optional) and confirm
 *    default is 'systemAdmin' in the response.
 */
export async function test_api_system_admin_registration_with_valid_external_admin_id(
  connection: api.IConnection,
) {
  // 1. Generate unique admin IDs and emails
  const externalAdminId: string = RandomGenerator.alphaNumeric(16);
  const uniqueEmail: string = `${RandomGenerator.alphaNumeric(8)}@e2e.test.com`;

  // 2. Register new admin (with explicit actor_type)
  const joinInput = {
    external_admin_id: externalAdminId,
    email: uniqueEmail,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);
  TestValidator.equals(
    "external_admin_id matches input",
    admin.external_admin_id,
    externalAdminId,
  );
  TestValidator.equals("email matches input", admin.email, uniqueEmail);
  TestValidator.equals(
    "actor_type always systemAdmin",
    admin.actor_type,
    "systemAdmin",
  );

  // 3. Duplicate registration (external_admin_id, new email): should fail
  const anotherEmail: string = `${RandomGenerator.alphaNumeric(8)}@e2e.test.com`;
  await TestValidator.error(
    "duplicate external_admin_id should fail",
    async () => {
      await api.functional.auth.systemAdmin.join(connection, {
        body: {
          external_admin_id: externalAdminId,
          email: anotherEmail,
          actor_type: "systemAdmin",
        },
      });
    },
  );

  // 4. Duplicate registration (new external_admin_id, same email): should fail
  const anotherExternalId: string = RandomGenerator.alphaNumeric(16);
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        external_admin_id: anotherExternalId,
        email: uniqueEmail,
        actor_type: "systemAdmin",
      },
    });
  });

  // 5. Register admin omitting optional actor_type (should default to 'systemAdmin')
  const minimalInput = {
    external_admin_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(8)}@e2e.test.com`,
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const adminMinimal = await api.functional.auth.systemAdmin.join(connection, {
    body: minimalInput,
  });
  typia.assert(adminMinimal);
  TestValidator.equals(
    "actor_type defaults to systemAdmin",
    adminMinimal.actor_type,
    "systemAdmin",
  );
}
