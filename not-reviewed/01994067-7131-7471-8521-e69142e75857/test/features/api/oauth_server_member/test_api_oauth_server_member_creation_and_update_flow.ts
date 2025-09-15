import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";

export async function test_api_oauth_server_member_creation_and_update_flow(
  connection: api.IConnection,
) {
  // 1. Prepare valid member creation data
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IOauthServerMember.ICreate;

  // 2. Execute join operation to register member and establish authorized session
  const authorizedMember: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(authorizedMember);

  // 3. Prepare creation for OAuth server member (simulate real registration)
  const oauthCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20), // raw password for creation
  } satisfies IOauthServerMember.ICreate;

  // 4. Create new OAuth server member record
  const createdMember: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: oauthCreateBody,
    });
  typia.assert(createdMember);

  // Validations for creation
  TestValidator.predicate(
    "Valid UUID assigned to member id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdMember.id,
    ),
  );
  TestValidator.equals(
    "Email matches creation data",
    createdMember.email,
    oauthCreateBody.email,
  );
  TestValidator.predicate(
    "Password hash is non-empty string",
    typeof createdMember.password_hash === "string" &&
      createdMember.password_hash.length > 0,
  );
  TestValidator.predicate(
    "Email verification status is boolean",
    typeof createdMember.email_verified === "boolean",
  );

  // 5. Prepare update payload, change email_verified flag and password_hash
  const updateBody = {
    email_verified: !createdMember.email_verified,
    password_hash: RandomGenerator.alphaNumeric(30),
    deleted_at: null,
  } satisfies IOauthServerMember.IUpdate;

  // 6. Perform update operation with proper authorization (authenticated member context)
  const updatedMember: IOauthServerMember =
    await api.functional.oauthServer.member.oauthServerMembers.update(
      connection,
      {
        id: createdMember.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);

  // 7. Validate updated fields
  TestValidator.equals(
    "Member id unchanged after update",
    updatedMember.id,
    createdMember.id,
  );
  TestValidator.equals(
    "Email remains unchanged if not updated",
    updatedMember.email,
    createdMember.email,
  );
  TestValidator.equals(
    "Email verification flag updated",
    updatedMember.email_verified,
    updateBody.email_verified,
  );
  TestValidator.equals(
    "Password hash updated",
    updatedMember.password_hash,
    updateBody.password_hash,
  );
  TestValidator.equals(
    "Deleted_at explicitly null",
    updatedMember.deleted_at,
    null,
  );

  // 8. Validate audit timestamps
  TestValidator.predicate(
    "Creation timestamp is valid ISO 8601",
    typeof updatedMember.created_at === "string" &&
      updatedMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "Update timestamp is valid ISO 8601",
    typeof updatedMember.updated_at === "string" &&
      updatedMember.updated_at.length > 0,
  );

  // 9. Try update without authorization - should throw error
  // Clone connection without headers to simulate unauthenticated request
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Update without authentication should fail",
    async () => {
      await api.functional.oauthServer.member.oauthServerMembers.update(
        unauthConn,
        {
          id: createdMember.id,
          body: updateBody,
        },
      );
    },
  );

  // 10. Attempt to create member with duplicate email - should fail
  await TestValidator.error(
    "Creation with duplicate email should fail",
    async () => {
      await api.functional.oauthServer.oauthServerMembers.create(connection, {
        body: {
          email: oauthCreateBody.email,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IOauthServerMember.ICreate,
      });
    },
  );
}
