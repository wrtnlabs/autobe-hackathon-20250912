import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update OAuth server developer details by ID
 *
 * This operation updates the details of an OAuth server developer identified by
 * the unique UUID. Only the owning developer (authenticated) may update their
 * own profile. Fields modifiable via this endpoint include email,
 * email_verified, and password_hash.
 *
 * @param props - Object containing developer auth, uuid id, and update body
 * @param props.developer - Authenticated developer performing the update
 * @param props.id - UUID of the developer to update
 * @param props.body - Partial fields to update on the developer record
 * @returns Updated OAuth server developer entity
 * @throws {Error} Throws on unauthorized access or if developer not found
 */
export async function putoauthServerDeveloperOauthServerDevelopersId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerDeveloper.IUpdate;
}): Promise<IOauthServerDeveloper> {
  const { developer, id, body } = props;

  // Fetch existing developer record or throw if not found
  const currentDeveloper =
    await MyGlobal.prisma.oauth_server_developers.findUniqueOrThrow({
      where: { id },
    });

  // Authorization check: Only the owner can update their profile
  if (currentDeveloper.id !== developer.id) {
    throw new Error(
      "Unauthorized operation: cannot update another developer profile",
    );
  }

  // Update allowed fields with provided values
  const updated = await MyGlobal.prisma.oauth_server_developers.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      email_verified: body.email_verified ?? undefined,
      password_hash: body.password_hash ?? undefined,
    },
  });

  // Return up-to-date developer record with date conversions
  return {
    id: updated.id,
    email: updated.email,
    email_verified: updated.email_verified,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
