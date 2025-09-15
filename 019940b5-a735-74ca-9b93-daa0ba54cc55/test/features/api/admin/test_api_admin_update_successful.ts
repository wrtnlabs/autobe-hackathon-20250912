import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

export async function test_api_admin_update_successful(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });

  typia.assert(admin);

  // 2. Prepare the update data
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: RandomGenerator.substring(
      "https://example.com/image.png",
    ),
    email_verified: true,
  } satisfies IEventRegistrationAdmin.IUpdate;

  // 3. Call the update API
  const updatedAdmin: IEventRegistrationAdmin =
    await api.functional.eventRegistration.admin.admins.updateAdminUser(
      connection,
      { adminId: admin.id, body: updateBody },
    );

  typia.assert(updatedAdmin);

  // 4. Validate the updated fields
  TestValidator.equals(
    "email should be updated",
    updatedAdmin.email,
    updateBody.email,
  );
  TestValidator.equals(
    "full_name should be updated",
    updatedAdmin.full_name,
    updateBody.full_name,
  );
  TestValidator.equals(
    "phone_number should be updated",
    updatedAdmin.phone_number,
    updateBody.phone_number,
  );
  TestValidator.equals(
    "profile_picture_url should be updated",
    updatedAdmin.profile_picture_url,
    updateBody.profile_picture_url,
  );
  TestValidator.equals(
    "email_verified should be updated",
    updatedAdmin.email_verified,
    updateBody.email_verified,
  );
}
